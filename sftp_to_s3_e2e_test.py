#!/usr/bin/env python3
"""
Production-ready E2E test: SFTP (key auth) -> S3

What it does:
1) Generates a deterministic byte stream (no big local files required)
2) Uploads it to SFTP using key auth
3) Waits for corresponding S3 object (exact key or discovered by prefix)
4) Verifies:
   - S3 object exists
   - Content-Length matches expected size
   - Object "stabilizes" (size unchanged for N polls)
   - Byte-range spot checks (configurable count/bytes)
5) Optional cleanup on SFTP + S3

Assumptions:
- Your transfer pipeline ultimately lands the SAME filename to S3 under a prefix,
  OR you can enable discovery mode to find it by filename under a prefix.

Exit codes:
0 = PASS
2 = FAIL
"""

import os
import sys
import time
import uuid
import json
import argparse
import logging
import hashlib
from dataclasses import dataclass
from typing import Optional, Tuple, List

import boto3
import botocore
import paramiko

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


# -----------------------------
# Logging
# -----------------------------
LOG = logging.getLogger("sftp-to-s3-e2e")


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )


# -----------------------------
# Config
# -----------------------------
@dataclass
class Config:
    # SFTP
    sftp_host: str
    sftp_port: int
    sftp_username: str
    sftp_private_key_path: str
    sftp_private_key_passphrase: Optional[str]
    sftp_remote_dir: str

    # S3
    aws_region: str
    s3_bucket: str
    s3_prefix: str

    # Transfer/object mapping
    s3_key_mode: str  # "exact" or "discover"
    s3_exact_key: Optional[str]  # if exact mode

    # Test sizing
    size_bytes: int

    # Waiting/polling
    wait_timeout_seconds: int
    poll_interval_seconds: int
    stable_polls_required: int

    # Spot checks
    spot_checks: int
    spot_check_bytes: int

    # Cleanup
    cleanup_remote_sftp: bool
    cleanup_s3_object: bool

    # Runtime
    log_level: str


def env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


def parse_size(size_str: str) -> int:
    """
    Parses sizes like: 10MB, 1GB, 2000000 (bytes), 20GiB
    Supports suffixes: B, KB, MB, GB, TB, KiB, MiB, GiB, TiB
    """
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

    # Split numeric + suffix
    num = ""
    suf = ""
    for ch in s_upper:
        if (ch.isdigit() or ch == ".") and suf == "":
            num += ch
        else:
            suf += ch

    suf = suf.strip()
    if suf == "":
        return int(float(num))

    if suf not in multipliers:
        raise ValueError(f"Unsupported size suffix: '{suf}'. Use MB/GB (or MiB/GiB), etc.")

    return int(float(num) * multipliers[suf])


def load_config(args: argparse.Namespace) -> Config:
    if args.env_file and load_dotenv:
        load_dotenv(args.env_file)

    def getenv_required(k: str) -> str:
        v = os.getenv(k)
        if not v:
            raise ValueError(f"Missing required env var: {k}")
        return v

    # SFTP
    sftp_host = args.sftp_host or getenv_required("SFTP_HOST")
    sftp_port = int(args.sftp_port or os.getenv("SFTP_PORT", "22"))
    sftp_username = args.sftp_username or getenv_required("SFTP_USERNAME")
    sftp_private_key_path = args.sftp_private_key_path or getenv_required("SFTP_PRIVATE_KEY_PATH")
    sftp_private_key_passphrase = args.sftp_private_key_passphrase or os.getenv("SFTP_PRIVATE_KEY_PASSPHRASE") or None
    sftp_remote_dir = (args.sftp_remote_dir or os.getenv("SFTP_REMOTE_DIR", "/")).rstrip("/") or "/"

    # S3
    aws_region = args.aws_region or os.getenv("AWS_REGION", "us-west-2")
    s3_bucket = args.s3_bucket or getenv_required("S3_BUCKET")
    s3_prefix = (args.s3_prefix or os.getenv("S3_PREFIX", "")).lstrip("/")
    if s3_prefix and not s3_prefix.endswith("/"):
        s3_prefix += "/"

    # Mapping
    s3_key_mode = args.s3_key_mode or os.getenv("S3_KEY_MODE", "exact").lower()
    if s3_key_mode not in ("exact", "discover"):
        raise ValueError("S3_KEY_MODE must be 'exact' or 'discover'")
    s3_exact_key = args.s3_exact_key or os.getenv("S3_EXACT_KEY") or None

    # Size
    size_bytes = parse_size(args.size or os.getenv("TEST_SIZE", "1MB"))

    # Waiting
    wait_timeout_seconds = int(args.wait_timeout or os.getenv("WAIT_TIMEOUT_SECONDS", "3600"))
    poll_interval_seconds = int(args.poll_interval or os.getenv("POLL_INTERVAL_SECONDS", "10"))
    stable_polls_required = int(args.stable_polls or os.getenv("STABLE_POLLS_REQUIRED", "3"))

    # Spot checks
    spot_checks = int(args.spot_checks or os.getenv("SPOT_CHECKS", "8"))
    spot_check_bytes = int(args.spot_check_bytes or os.getenv("SPOT_CHECK_BYTES", str(256 * 1024)))

    # Cleanup
    cleanup_remote_sftp = args.cleanup_sftp if args.cleanup_sftp is not None else env_bool("CLEANUP_REMOTE_SFTP", False)
    cleanup_s3_object = args.cleanup_s3 if args.cleanup_s3 is not None else env_bool("CLEANUP_S3_OBJECT", False)

    # Logging
    log_level = args.log_level or os.getenv("LOG_LEVEL", "INFO")

    return Config(
        sftp_host=sftp_host,
        sftp_port=sftp_port,
        sftp_username=sftp_username,
        sftp_private_key_path=sftp_private_key_path,
        sftp_private_key_passphrase=sftp_private_key_passphrase,
        sftp_remote_dir=sftp_remote_dir,
        aws_region=aws_region,
        s3_bucket=s3_bucket,
        s3_prefix=s3_prefix,
        s3_key_mode=s3_key_mode,
        s3_exact_key=s3_exact_key,
        size_bytes=size_bytes,
        wait_timeout_seconds=wait_timeout_seconds,
        poll_interval_seconds=poll_interval_seconds,
        stable_polls_required=stable_polls_required,
        spot_checks=spot_checks,
        spot_check_bytes=spot_check_bytes,
        cleanup_remote_sftp=cleanup_remote_sftp,
        cleanup_s3_object=cleanup_s3_object,
        log_level=log_level,
    )


# -----------------------------
# Deterministic byte stream for huge files
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
        raise ValueError("Requested range out of bounds")

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
        b = expected_bytes(self.seed, self.pos, n, self.total_size)
        self.pos += n
        return b


def choose_offsets(total_size: int, checks: int, bytes_per_check: int, seed: bytes) -> List[int]:
    if total_size <= bytes_per_check:
        return [0]
    offsets = set()
    offsets.add(0)
    offsets.add(max(0, total_size - bytes_per_check))

    i = 0
    while len(offsets) < max(2, checks):
        h = hashlib.blake2b(digest_size=8)
        h.update(seed)
        h.update(i.to_bytes(8, "big"))
        candidate = int.from_bytes(h.digest(), "big")
        off = candidate % (total_size - bytes_per_check + 1)
        offsets.add(off)
        i += 1

    return sorted(list(offsets))[:checks]


# -----------------------------
# SFTP (key auth)
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


def connect_sftp(cfg: Config) -> Tuple[paramiko.Transport, paramiko.SFTPClient]:
    t = paramiko.Transport((cfg.sftp_host, cfg.sftp_port))
    pkey = _load_private_key(cfg.sftp_private_key_path, cfg.sftp_private_key_passphrase)
    t.connect(username=cfg.sftp_username, pkey=pkey)
    sftp = paramiko.SFTPClient.from_transport(t)
    return t, sftp


def sftp_upload_stream(cfg: Config, stream: DeterministicStream, remote_path: str, total_size: int) -> None:
    t, sftp = connect_sftp(cfg)
    try:
        LOG.info("Uploading to SFTP (stream): %s (size=%d bytes)", remote_path, total_size)

        last_log = 0

        def cb(transferred, total):
            nonlocal last_log
            now = time.time()
            if now - last_log >= 10:
                pct = 100.0 * transferred / total if total else 0.0
                LOG.info("SFTP progress: %.2f%% (%d / %d)", pct, transferred, total)
                last_log = now

        sftp.putfo(stream, remote_path, file_size=total_size, callback=cb, confirm=True)
        LOG.info("SFTP upload complete")
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        t.close()


def sftp_delete(cfg: Config, remote_path: str) -> None:
    t, sftp = connect_sftp(cfg)
    try:
        LOG.info("Deleting remote SFTP file: %s", remote_path)
        sftp.remove(remote_path)
    finally:
        try:
            sftp.close()
        except Exception:
            pass
        t.close()


# -----------------------------
# S3
# -----------------------------
def s3_client(cfg: Config):
    return boto3.client("s3", region_name=cfg.aws_region)


def s3_head(cfg: Config, key: str) -> dict:
    return s3_client(cfg).head_object(Bucket=cfg.s3_bucket, Key=key)


def s3_get_range(cfg: Config, key: str, start: int, length: int) -> bytes:
    end = start + length - 1
    resp = s3_client(cfg).get_object(
        Bucket=cfg.s3_bucket,
        Key=key,
        Range=f"bytes={start}-{end}",
    )
    return resp["Body"].read()


def s3_delete(cfg: Config, key: str) -> None:
    LOG.info("Deleting S3 object: s3://%s/%s", cfg.s3_bucket, key)
    s3_client(cfg).delete_object(Bucket=cfg.s3_bucket, Key=key)


def s3_wait_for_object(cfg: Config, key: str) -> dict:
    deadline = time.time() + cfg.wait_timeout_seconds
    last_err = None
    while time.time() < deadline:
        try:
            meta = s3_head(cfg, key)
            return meta
        except botocore.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("404", "NoSuchKey", "NotFound"):
                last_err = e
                LOG.info("Not in S3 yet (%s). Sleeping %ss...", key, cfg.poll_interval_seconds)
                time.sleep(cfg.poll_interval_seconds)
                continue
            raise
    raise TimeoutError(f"Timed out waiting for s3://{cfg.s3_bucket}/{key}. Last error: {last_err}")


def s3_wait_until_stable_size(cfg: Config, key: str) -> int:
    """
    Some pipelines write multi-part uploads; this waits for ContentLength
    to be the expected size and remain unchanged for N polls.
    """
    stable = 0
    last_size = None
    deadline = time.time() + cfg.wait_timeout_seconds

    while time.time() < deadline:
        meta = s3_wait_for_object(cfg, key)
        size = int(meta.get("ContentLength", -1))
        LOG.info("S3 size observed: %d bytes (expected=%d)", size, cfg.size_bytes)

        if size == cfg.size_bytes:
            if last_size == size:
                stable += 1
            else:
                stable = 1
            last_size = size

            if stable >= cfg.stable_polls_required:
                LOG.info("S3 object size stable for %d polls ✅", stable)
                return size
        else:
            stable = 0
            last_size = size

        time.sleep(cfg.poll_interval_seconds)

    raise TimeoutError(f"Timed out waiting for stable expected size on s3://{cfg.s3_bucket}/{key}")


def discover_s3_key_by_filename(cfg: Config, filename: str) -> str:
    """
    Searches under cfg.s3_prefix for objects that end with the given filename.
    Good when the pipeline adds date/user folders but preserves the filename.
    """
    s3 = s3_client(cfg)
    prefix = cfg.s3_prefix or ""
    paginator = s3.get_paginator("list_objects_v2")

    best_key = None
    best_last_modified = None

    LOG.info("Discovering S3 key under prefix '%s' for filename '%s' ...", prefix, filename)

    for page in paginator.paginate(Bucket=cfg.s3_bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            k = obj["Key"]
            if k.endswith("/" + filename) or k.endswith(filename):
                lm = obj.get("LastModified")
                if best_last_modified is None or (lm and lm > best_last_modified):
                    best_key = k
                    best_last_modified = lm

    if not best_key:
        raise FileNotFoundError(f"Could not discover S3 key for filename '{filename}' under prefix '{prefix}'")

    LOG.info("Discovered S3 key: %s", best_key)
    return best_key


# -----------------------------
# Main test flow
# -----------------------------
def build_remote_path(cfg: Config, filename: str) -> str:
    if cfg.sftp_remote_dir == "/":
        return f"/{filename}"
    return f"{cfg.sftp_remote_dir}/{filename}"


def main() -> int:
    parser = argparse.ArgumentParser(description="E2E Test: SFTP (key auth) -> S3")
    parser.add_argument("--env-file", default=os.getenv("ENV_FILE"), help="Path to .env file (optional)")
    parser.add_argument("--log-level", default=os.getenv("LOG_LEVEL", "INFO"))

    # SFTP
    parser.add_argument("--sftp-host")
    parser.add_argument("--sftp-port")
    parser.add_argument("--sftp-username")
    parser.add_argument("--sftp-private-key-path")
    parser.add_argument("--sftp-private-key-passphrase")
    parser.add_argument("--sftp-remote-dir")

    # S3
    parser.add_argument("--aws-region")
    parser.add_argument("--s3-bucket")
    parser.add_argument("--s3-prefix")

    # Mapping
    parser.add_argument("--s3-key-mode", choices=["exact", "discover"], help="exact: prefix+filename or exact key; discover: search by filename under prefix")
    parser.add_argument("--s3-exact-key", help="If using exact mode, you can provide the full key explicitly")

    # Size/waiting
    parser.add_argument("--size", help="Test size e.g. 50MB, 1GB, 20GiB (or bytes). Default from TEST_SIZE env.")
    parser.add_argument("--wait-timeout", help="Seconds. Default from WAIT_TIMEOUT_SECONDS")
    parser.add_argument("--poll-interval", help="Seconds. Default from POLL_INTERVAL_SECONDS")
    parser.add_argument("--stable-polls", help="How many consecutive polls size must be stable. Default STABLE_POLLS_REQUIRED")

    # Spot checks
    parser.add_argument("--spot-checks", help="Number of spot checks. Default SPOT_CHECKS")
    parser.add_argument("--spot-check-bytes", help="Bytes per check. Default SPOT_CHECK_BYTES")

    # Cleanup
    parser.add_argument("--cleanup-sftp", action="store_true", help="Delete remote SFTP file after test")
    parser.add_argument("--no-cleanup-sftp", dest="cleanup_sftp", action="store_false")
    parser.set_defaults(cleanup_sftp=None)

    parser.add_argument("--cleanup-s3", action="store_true", help="Delete S3 object after test")
    parser.add_argument("--no-cleanup-s3", dest="cleanup_s3", action="store_false")
    parser.set_defaults(cleanup_s3=None)

    args = parser.parse_args()

    cfg = load_config(args)
    setup_logging(cfg.log_level)

    test_id = uuid.uuid4().hex
    filename = f"sftp-s3-test-{test_id}.bin"

    # Seed drives deterministic bytes + deterministic spot check offsets
    seed = hashlib.sha256(f"sftp-s3-e2e:{test_id}".encode("utf-8")).digest()

    remote_path = build_remote_path(cfg, filename)

    # Determine expected key
    if cfg.s3_key_mode == "exact":
        if cfg.s3_exact_key:
            expected_key = cfg.s3_exact_key
        else:
            expected_key = f"{cfg.s3_prefix}{filename}" if cfg.s3_prefix else filename
    else:
        expected_key = None  # will be discovered

    LOG.info("=== SFTP -> S3 E2E TEST START ===")
    LOG.info("Test ID: %s", test_id)
    LOG.info("File: %s", filename)
    LOG.info("Size bytes: %d", cfg.size_bytes)
    LOG.info("SFTP: %s@%s:%d  remote=%s", cfg.sftp_username, cfg.sftp_host, cfg.sftp_port, remote_path)
    LOG.info("S3: bucket=%s prefix=%s mode=%s", cfg.s3_bucket, cfg.s3_prefix, cfg.s3_key_mode)
    if expected_key:
        LOG.info("Expected S3 key: %s", expected_key)

    uploaded = False
    final_key = None

    try:
        # 1) Upload stream to SFTP
        stream = DeterministicStream(seed=seed, total_size=cfg.size_bytes)
        sftp_upload_stream(cfg, stream, remote_path, cfg.size_bytes)
        uploaded = True

        # 2) Determine S3 key (exact or discover)
        if cfg.s3_key_mode == "discover":
            # Wait a bit before discovery attempts
            deadline = time.time() + cfg.wait_timeout_seconds
            while time.time() < deadline:
                try:
                    final_key = discover_s3_key_by_filename(cfg, filename)
                    break
                except FileNotFoundError:
                    LOG.info("Discovery: not found yet. Sleeping %ss...", cfg.poll_interval_seconds)
                    time.sleep(cfg.poll_interval_seconds)
            if not final_key:
                raise TimeoutError("Timed out discovering S3 key by filename")
        else:
            final_key = expected_key

        # 3) Wait for object + stable expected size
        s3_wait_until_stable_size(cfg, final_key)

        # 4) Spot-check ranges
        check_len = min(cfg.spot_check_bytes, cfg.size_bytes)
        offsets = choose_offsets(cfg.size_bytes, cfg.spot_checks, check_len, seed)
        LOG.info("Running %d spot checks (%d bytes each)...", len(offsets), check_len)

        for idx, off in enumerate(offsets, 1):
            expected = expected_bytes(seed, off, check_len, cfg.size_bytes)
            actual = s3_get_range(cfg, final_key, off, check_len)
            if actual != expected:
                raise AssertionError(f"Spot-check failed at offset={off} (check {idx}/{len(offsets)})")
            LOG.info("Spot-check %d/%d ✅ (offset=%d)", idx, len(offsets), off)

        LOG.info("✅ PASS: Verified SFTP -> S3 end-to-end")
        LOG.info("S3 object: s3://%s/%s", cfg.s3_bucket, final_key)
        return 0

    except Exception as e:
        LOG.error("❌ FAIL: %s", str(e))
        # Print helpful context for troubleshooting
        try:
            ctx = {
                "filename": filename,
                "remote_path": remote_path,
                "s3_bucket": cfg.s3_bucket,
                "s3_prefix": cfg.s3_prefix,
                "final_key": final_key,
                "size_bytes": cfg.size_bytes,
            }
            LOG.error("Context: %s", json.dumps(ctx, default=str))
        except Exception:
            pass
        return 2

    finally:
        # Optional cleanup
        if cfg.cleanup_remote_sftp and uploaded:
            try:
                sftp_delete(cfg, remote_path)
            except Exception as ce:
                LOG.warning("Cleanup SFTP failed: %s", ce)

        if cfg.cleanup_s3_object and final_key:
            try:
                s3_delete(cfg, final_key)
            except Exception as ce:
                LOG.warning("Cleanup S3 failed: %s", ce)

        LOG.info("=== TEST END ===")


if __name__ == "__main__":
    sys.exit(main())
