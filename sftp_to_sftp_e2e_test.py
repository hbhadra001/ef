#!/usr/bin/env python3
"""
Production-ready SFTP -> SFTP E2E test (1MB..20GB) for EC2.

Flow:
1) Generate deterministic byte stream (no big local files)
2) Upload to SOURCE SFTP (key auth)
3) Stream copy SOURCE -> TARGET (SFTP read streaming -> SFTP write streaming)
4) Verify TARGET:
   - exists
   - size matches
   - optional stability check (size unchanged N polls)
   - byte-range spot checks (download tiny ranges and compare to expected bytes)
5) Optional cleanup on source/target.

Notes:
- Uses Paramiko SFTPClient.open(..., 'rb'/'wb') to stream.
- Spot checks download small segments from TARGET SFTP (fast, strong validation).
"""

import os
import sys
import time
import uuid
import logging
import hashlib
import argparse
from dataclasses import dataclass
from typing import Optional, Tuple, List

import paramiko

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


LOG = logging.getLogger("sftp-to-sftp-e2e")


# -----------------------------
# Logging
# -----------------------------
def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )


# -----------------------------
# Utils
# -----------------------------
def env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


def parse_size(size_str: str) -> int:
    s = size_str.strip()
    if s.isdigit():
        return int(s)

    s_upper = s.upper()
    multipliers = {
        "B": 1,
        "KB": 1000,
        "MB": 1000**2,
        "GB": 1000**3,
        "TB": 1000**4,
        "KIB": 1024,
        "MIB": 1024**2,
        "GIB": 1024**3,
        "TIB": 1024**4,
    }

    num = ""
    suf = ""
    for ch in s_upper:
        if (ch.isdigit() or ch == ".") and suf == "":
            num += ch
        else:
            suf += ch

    suf = suf.strip() or "B"
    if suf not in multipliers:
        raise ValueError(f"Unsupported size suffix '{suf}'. Use MB/GB or MiB/GiB.")
    return int(float(num) * multipliers[suf])


# -----------------------------
# Config
# -----------------------------
@dataclass
class SFTPConn:
    host: str
    port: int
    username: str
    private_key_path: str
    private_key_passphrase: Optional[str]
    remote_dir: str


@dataclass
class Config:
    src: SFTPConn
    tgt: SFTPConn

    size_bytes: int
    io_chunk_bytes: int

    wait_timeout_seconds: int
    poll_interval_seconds: int
    stable_polls_required: int

    spot_checks: int
    spot_check_bytes: int

    cleanup_src: bool
    cleanup_tgt: bool

    log_level: str


def load_config(args: argparse.Namespace) -> Config:
    if args.env_file and load_dotenv:
        load_dotenv(args.env_file)

    def req(k: str) -> str:
        v = os.getenv(k)
        if not v:
            raise ValueError(f"Missing required env var: {k}")
        return v

    src = SFTPConn(
        host=req("SRC_SFTP_HOST"),
        port=int(os.getenv("SRC_SFTP_PORT", "22")),
        username=req("SRC_SFTP_USERNAME"),
        private_key_path=req("SRC_SFTP_PRIVATE_KEY_PATH"),
        private_key_passphrase=os.getenv("SRC_SFTP_PRIVATE_KEY_PASSPHRASE") or None,
        remote_dir=(os.getenv("SRC_SFTP_REMOTE_DIR", "/").rstrip("/") or "/"),
    )

    tgt = SFTPConn(
        host=req("TGT_SFTP_HOST"),
        port=int(os.getenv("TGT_SFTP_PORT", "22")),
        username=req("TGT_SFTP_USERNAME"),
        private_key_path=req("TGT_SFTP_PRIVATE_KEY_PATH"),
        private_key_passphrase=os.getenv("TGT_SFTP_PRIVATE_KEY_PASSPHRASE") or None,
        remote_dir=(os.getenv("TGT_SFTP_REMOTE_DIR", "/").rstrip("/") or "/"),
    )

    size_bytes = parse_size(os.getenv("TEST_SIZE", "1MB"))
    io_chunk_bytes = int(os.getenv("IO_CHUNK_BYTES", str(1024 * 1024)))

    wait_timeout_seconds = int(os.getenv("WAIT_TIMEOUT_SECONDS", "3600"))
    poll_interval_seconds = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))
    stable_polls_required = int(os.getenv("STABLE_POLLS_REQUIRED", "3"))

    spot_checks = int(os.getenv("SPOT_CHECKS", "8"))
    spot_check_bytes = int(os.getenv("SPOT_CHECK_BYTES", str(256 * 1024)))

    cleanup_src = env_bool("CLEANUP_SRC", False)
    cleanup_tgt = env_bool("CLEANUP_TGT", False)

    log_level = os.getenv("LOG_LEVEL", "INFO")

    return Config(
        src=src,
        tgt=tgt,
        size_bytes=size_bytes,
        io_chunk_bytes=io_chunk_bytes,
        wait_timeout_seconds=wait_timeout_seconds,
        poll_interval_seconds=poll_interval_seconds,
        stable_polls_required=stable_polls_required,
        spot_checks=spot_checks,
        spot_check_bytes=spot_check_bytes,
        cleanup_src=cleanup_src,
        cleanup_tgt=cleanup_tgt,
        log_level=log_level,
    )


# -----------------------------
# Deterministic content generator
# -----------------------------
CHUNK = 1024 * 1024  # 1 MiB

def _chunk_bytes(seed: bytes, chunk_index: int, chunk_len: int) -> bytes:
    out = bytearray()
    ctr = 0
    while len(out) < chunk_len:
        h = hashlib.blake2b(digest_size=64)
        h.update(seed)
        h.update(chunk_index.to_bytes(8, "big"))
        h.update(ctr.to_bytes(8, "big"))
        out.extend(h.digest())
        ctr += 1
    return bytes(out[:chunk_len])


def expected_bytes(seed: bytes, offset: int, length: int, total_size: int) -> bytes:
    if offset < 0 or length < 0 or offset + length > total_size:
        raise ValueError("Range out of bounds")

    start_chunk = offset // CHUNK
    end_offset = offset + length
    end_chunk = (end_offset - 1) // CHUNK

    remaining = length
    pos = offset
    pieces = []

    for ci in range(start_chunk, end_chunk + 1):
        chunk_start = ci * CHUNK
        chunk_end = min(chunk_start + CHUNK, total_size)
        this_len = chunk_end - chunk_start

        data = _chunk_bytes(seed, ci, this_len)
        s = max(0, pos - chunk_start)
        e = min(this_len, s + remaining)
        pieces.append(data[s:e])

        took = e - s
        remaining -= took
        pos += took

    return b"".join(pieces)


class DeterministicStream:
    """
    Sequential read stream for upload to source SFTP.
    """
    def __init__(self, seed: bytes, total_size: int):
        self.seed = seed
        self.total_size = total_size
        self.pos = 0

    def read(self, n: int = -1) -> bytes:
        if self.pos >= self.total_size:
            return b""
        if n is None or n < 0:
            n = self.total_size - self.pos
        n = min(n, self.total_size - self.pos)
        data = expected_bytes(self.seed, self.pos, n, self.total_size)
        self.pos += n
        return data


def choose_offsets(total_size: int, checks: int, bytes_per_check: int, seed: bytes) -> List[int]:
    if total_size <= bytes_per_check:
        return [0]
    offsets = {0, max(0, total_size - bytes_per_check)}
    i = 0
    while len(offsets) < max(2, checks):
        h = hashlib.blake2b(digest_size=8)
        h.update(seed)
        h.update(i.to_bytes(8, "big"))
        off = int.from_bytes(h.digest(), "big") % (total_size - bytes_per_check + 1)
        offsets.add(off)
        i += 1
    return sorted(list(offsets))[:checks]


# -----------------------------
# SFTP connect + ops (key auth)
# -----------------------------
def _load_private_key(path: str, passphrase: Optional[str]) -> paramiko.PKey:
    loaders = [
        paramiko.Ed25519Key.from_private_key_file,
        paramiko.RSAKey.from_private_key_file,
        paramiko.ECDSAKey.from_private_key_file,
        paramiko.DSSKey.from_private_key_file,
    ]
    last = None
    for loader in loaders:
        try:
            return loader(path, password=passphrase)
        except Exception as e:
            last = e
    raise RuntimeError(f"Unable to load private key from {path}. Last error: {last}")


def connect_sftp(conn: SFTPConn) -> Tuple[paramiko.Transport, paramiko.SFTPClient]:
    t = paramiko.Transport((conn.host, conn.port))
    pkey = _load_private_key(conn.private_key_path, conn.private_key_passphrase)
    t.connect(username=conn.username, pkey=pkey)
    sftp = paramiko.SFTPClient.from_transport(t)
    return t, sftp


def remote_path(conn: SFTPConn, filename: str) -> str:
    if conn.remote_dir == "/":
        return f"/{filename}"
    return f"{conn.remote_dir}/{filename}"


def sftp_stat_size(sftp: paramiko.SFTPClient, path: str) -> int:
    return int(sftp.stat(path).st_size)


def sftp_wait_until_stable_size(cfg: Config, sftp: paramiko.SFTPClient, path: str) -> int:
    deadline = time.time() + cfg.wait_timeout_seconds
    stable = 0
    last = None

    while time.time() < deadline:
        try:
            size = sftp_stat_size(sftp, path)
        except FileNotFoundError:
            LOG.info("Target not found yet. Sleeping %ss...", cfg.poll_interval_seconds)
            time.sleep(cfg.poll_interval_seconds)
            continue

        LOG.info("Target size observed: %d bytes (expected=%d)", size, cfg.size_bytes)

        if size == cfg.size_bytes:
            if last == size:
                stable += 1
            else:
                stable = 1
            last = size
            if stable >= cfg.stable_polls_required:
                LOG.info("Target size stable for %d polls ✅", stable)
                return size
        else:
            stable = 0
            last = size

        time.sleep(cfg.poll_interval_seconds)

    raise TimeoutError(f"Timed out waiting for stable expected size on target: {path}")


def sftp_delete(conn: SFTPConn, path: str) -> None:
    t, sftp = connect_sftp(conn)
    try:
        LOG.info("Deleting %s:%s", conn.host, path)
        sftp.remove(path)
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        t.close()


# -----------------------------
# Transfer logic
# -----------------------------
def upload_to_source(cfg: Config, seed: bytes, src_path: str) -> None:
    t, sftp = connect_sftp(cfg.src)
    try:
        LOG.info("Uploading to SOURCE: %s:%s (size=%d)", cfg.src.host, src_path, cfg.size_bytes)
        stream = DeterministicStream(seed, cfg.size_bytes)
        with sftp.open(src_path, "wb") as f:
            written = 0
            last_log = time.time()
            while True:
                chunk = stream.read(cfg.io_chunk_bytes)
                if not chunk:
                    break
                f.write(chunk)
                written += len(chunk)
                now = time.time()
                if now - last_log >= 10:
                    LOG.info("Source upload progress: %.2f%% (%d/%d)", 100.0 * written / cfg.size_bytes, written, cfg.size_bytes)
                    last_log = now
        LOG.info("Source upload complete ✅")
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        t.close()


def stream_copy_source_to_target(cfg: Config, src_path: str, tgt_path: str) -> None:
    src_t, src_sftp = connect_sftp(cfg.src)
    tgt_t, tgt_sftp = connect_sftp(cfg.tgt)
    try:
        LOG.info("Streaming copy SOURCE -> TARGET")
        LOG.info("  SOURCE: %s:%s", cfg.src.host, src_path)
        LOG.info("  TARGET: %s:%s", cfg.tgt.host, tgt_path)

        start = time.time()
        transferred = 0
        last_log = time.time()

        with src_sftp.open(src_path, "rb") as rf, tgt_sftp.open(tgt_path, "wb") as wf:
            while True:
                data = rf.read(cfg.io_chunk_bytes)
                if not data:
                    break
                wf.write(data)
                transferred += len(data)
                now = time.time()
                if now - last_log >= 10:
                    rate = transferred / max(1e-9, (now - start))
                    LOG.info(
                        "Copy progress: %.2f%% (%d/%d)  rate=%.2f MB/s",
                        100.0 * transferred / cfg.size_bytes,
                        transferred,
                        cfg.size_bytes,
                        rate / (1024 * 1024),
                    )
                    last_log = now

        elapsed = time.time() - start
        LOG.info("Copy complete ✅  transferred=%d bytes  time=%.1fs  avg=%.2f MB/s",
                 transferred, elapsed, (transferred / max(1e-9, elapsed)) / (1024 * 1024))

        if transferred != cfg.size_bytes:
            raise AssertionError(f"Transferred bytes mismatch: {transferred} vs expected {cfg.size_bytes}")

    finally:
        for c in (src_sftp, tgt_sftp):
            try:
                c.close()
            except Exception:
                pass
        src_t.close()
        tgt_t.close()


def verify_target_spot_checks(cfg: Config, seed: bytes, tgt_path: str) -> None:
    t, sftp = connect_sftp(cfg.tgt)
    try:
        # wait size stable
        sftp_wait_until_stable_size(cfg, sftp, tgt_path)

        check_len = min(cfg.spot_check_bytes, cfg.size_bytes)
        offsets = choose_offsets(cfg.size_bytes, cfg.spot_checks, check_len, seed)
        LOG.info("Running %d spot checks (%d bytes each) on TARGET...", len(offsets), check_len)

        with sftp.open(tgt_path, "rb") as f:
            for i, off in enumerate(offsets, 1):
                f.seek(off)
                actual = f.read(check_len)
                expected = expected_bytes(seed, off, check_len, cfg.size_bytes)
                if actual != expected:
                    raise AssertionError(f"Spot-check failed at offset={off} (check {i}/{len(offsets)})")
                LOG.info("Spot-check %d/%d ✅ (offset=%d)", i, len(offsets), off)

        LOG.info("Target verification PASSED ✅")
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        t.close()


# -----------------------------
# Main
# -----------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description="SFTP -> SFTP E2E test (large-file safe)")
    ap.add_argument("--env-file", default=os.getenv("ENV_FILE", ".env"), help="Path to .env (optional)")
    args = ap.parse_args()

    if args.env_file and load_dotenv:
        load_dotenv(args.env_file)

    cfg = load_config(args)
    setup_logging(cfg.log_level)

    test_id = uuid.uuid4().hex
    filename = f"sftp-sftp-test-{test_id}.bin"

    # Deterministic content seed
    seed = hashlib.sha256(f"sftp-sftp-e2e:{test_id}".encode("utf-8")).digest()

    src_path = remote_path(cfg.src, filename)
    tgt_path = remote_path(cfg.tgt, filename)

    LOG.info("=== SFTP -> SFTP E2E TEST START ===")
    LOG.info("Test ID: %s", test_id)
    LOG.info("File: %s", filename)
    LOG.info("Size: %d bytes", cfg.size_bytes)
    LOG.info("SOURCE: %s@%s:%d %s", cfg.src.username, cfg.src.host, cfg.src.port, src_path)
    LOG.info("TARGET: %s@%s:%d %s", cfg.tgt.username, cfg.tgt.host, cfg.tgt.port, tgt_path)

    src_uploaded = False
    tgt_written = False

    try:
        # 1) Upload to source (stream)
        upload_to_source(cfg, seed, src_path)
        src_uploaded = True

        # 2) Copy source -> target (stream)
        stream_copy_source_to_target(cfg, src_path, tgt_path)
        tgt_written = True

        # 3) Verify target
        verify_target_spot_checks(cfg, seed, tgt_path)

        LOG.info("✅ PASS: Verified SFTP -> SFTP end-to-end")
        return 0

    except Exception as e:
        LOG.error("❌ FAIL: %s", str(e))
        return 2

    finally:
        # Optional cleanup
        if cfg.cleanup_src and src_uploaded:
            try:
                sftp_delete(cfg.src, src_path)
            except Exception as ce:
                LOG.warning("Cleanup SRC failed: %s", ce)

        if cfg.cleanup_tgt and tgt_written:
            try:
                sftp_delete(cfg.tgt, tgt_path)
            except Exception as ce:
                LOG.warning("Cleanup TGT failed: %s", ce)

        LOG.info("=== TEST END ===")


if __name__ == "__main__":
    sys.exit(main())
