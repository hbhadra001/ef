#!/usr/bin/env python3
"""
Production-ready S3 -> S3 E2E test (1MB..20GB) for EC2.

What it does:
1) Creates a deterministic source object in S3 (stream upload; no local disk).
2) Copies it to target bucket/prefix using boto3 TransferManager (multipart copy for large).
3) Validates:
   - target exists
   - ContentLength matches
   - ETag equality for single-part objects (optional, best-effort)
   - byte-range spot checks (compare source vs target ranges)
4) Optional cleanup.

Notes:
- Spot checks are the integrity backbone because multipart uploads/copies produce ETags
  that don't match simple MD5 of the full object.
- This script is safe for huge sizes because it never downloads the whole object.
"""

import os
import sys
import time
import uuid
import logging
import hashlib
from dataclasses import dataclass
from typing import Optional, List, Tuple

import boto3
import botocore

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


LOG = logging.getLogger("s3-to-s3-e2e")


def setup_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )


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
        raise ValueError(f"Unsupported size suffix '{suf}' (use MB/GB or MiB/GiB).")

    return int(float(num) * multipliers[suf])


@dataclass
class Config:
    aws_region: str
    src_bucket: str
    src_prefix: str
    tgt_bucket: str
    tgt_prefix: str

    size_bytes: int

    wait_timeout_seconds: int
    poll_interval_seconds: int

    spot_checks: int
    spot_check_bytes: int

    multipart_threshold: int
    multipart_chunk_size: int

    cleanup_src: bool
    cleanup_tgt: bool

    log_level: str


def load_config(env_file: Optional[str]) -> Config:
    if env_file and load_dotenv:
        load_dotenv(env_file)

    aws_region = os.getenv("AWS_REGION", "us-west-2")

    src_bucket = os.environ["SRC_BUCKET"]
    tgt_bucket = os.environ["TGT_BUCKET"]

    src_prefix = os.getenv("SRC_PREFIX", "").lstrip("/")
    if src_prefix and not src_prefix.endswith("/"):
        src_prefix += "/"

    tgt_prefix = os.getenv("TGT_PREFIX", "").lstrip("/")
    if tgt_prefix and not tgt_prefix.endswith("/"):
        tgt_prefix += "/"

    size_bytes = parse_size(os.getenv("TEST_SIZE", "1MB"))

    wait_timeout_seconds = int(os.getenv("WAIT_TIMEOUT_SECONDS", "3600"))
    poll_interval_seconds = int(os.getenv("POLL_INTERVAL_SECONDS", "5"))

    spot_checks = int(os.getenv("SPOT_CHECKS", "8"))
    spot_check_bytes = int(os.getenv("SPOT_CHECK_BYTES", str(256 * 1024)))

    multipart_threshold = int(os.getenv("MULTIPART_THRESHOLD", str(100 * 1024 * 1024)))
    multipart_chunk_size = int(os.getenv("MULTIPART_CHUNK_SIZE", str(256 * 1024 * 1024)))

    cleanup_src = env_bool("CLEANUP_SRC", False)
    cleanup_tgt = env_bool("CLEANUP_TGT", False)

    log_level = os.getenv("LOG_LEVEL", "INFO")

    return Config(
        aws_region=aws_region,
        src_bucket=src_bucket,
        src_prefix=src_prefix,
        tgt_bucket=tgt_bucket,
        tgt_prefix=tgt_prefix,
        size_bytes=size_bytes,
        wait_timeout_seconds=wait_timeout_seconds,
        poll_interval_seconds=poll_interval_seconds,
        spot_checks=spot_checks,
        spot_check_bytes=spot_check_bytes,
        multipart_threshold=multipart_threshold,
        multipart_chunk_size=multipart_chunk_size,
        cleanup_src=cleanup_src,
        cleanup_tgt=cleanup_tgt,
        log_level=log_level,
    )


# -----------------------------
# Deterministic stream for source object creation
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
    parts = []

    for ci in range(start_chunk, end_chunk + 1):
        chunk_start = ci * CHUNK
        chunk_end = min(chunk_start + CHUNK, total_size)
        this_len = chunk_end - chunk_start

        data = _chunk_bytes(seed, ci, this_len)
        s = max(0, pos - chunk_start)
        e = min(this_len, s + remaining)
        parts.append(data[s:e])

        took = e - s
        remaining -= took
        pos += took

    return b"".join(parts)


class DeterministicStream:
    """
    File-like stream used for upload_fileobj.
    Generates deterministic bytes sequentially with constant memory usage.
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
# S3 helpers
# -----------------------------
def s3_client(cfg: Config):
    return boto3.client("s3", region_name=cfg.aws_region)


def s3_resource(cfg: Config):
    return boto3.resource("s3", region_name=cfg.aws_region)


def head_object(cfg: Config, bucket: str, key: str) -> dict:
    return s3_client(cfg).head_object(Bucket=bucket, Key=key)


def wait_for_object(cfg: Config, bucket: str, key: str) -> dict:
    deadline = time.time() + cfg.wait_timeout_seconds
    last_err = None
    while time.time() < deadline:
        try:
            return head_object(cfg, bucket, key)
        except botocore.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code in ("404", "NoSuchKey", "NotFound"):
                last_err = e
                LOG.info("Waiting for s3://%s/%s ... (%ss)", bucket, key, cfg.poll_interval_seconds)
                time.sleep(cfg.poll_interval_seconds)
                continue
            raise
    raise TimeoutError(f"Timed out waiting for s3://{bucket}/{key}. Last error: {last_err}")


def get_range(cfg: Config, bucket: str, key: str, start: int, length: int) -> bytes:
    end = start + length - 1
    resp = s3_client(cfg).get_object(
        Bucket=bucket,
        Key=key,
        Range=f"bytes={start}-{end}",
    )
    return resp["Body"].read()


def delete_object(cfg: Config, bucket: str, key: str) -> None:
    LOG.info("Deleting s3://%s/%s", bucket, key)
    s3_client(cfg).delete_object(Bucket=bucket, Key=key)


# -----------------------------
# Main
# -----------------------------
def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="S3 -> S3 E2E test (1MB..20GB)")
    ap.add_argument("--env-file", default=os.getenv("ENV_FILE", ".env"))
    args = ap.parse_args()

    cfg = load_config(args.env_file)
    setup_logging(cfg.log_level)

    # Unique test IDs
    test_id = uuid.uuid4().hex
    filename = f"s3-s3-test-{test_id}.bin"

    src_key = f"{cfg.src_prefix}{filename}" if cfg.src_prefix else filename
    tgt_key = f"{cfg.tgt_prefix}{filename}" if cfg.tgt_prefix else filename

    seed = hashlib.sha256(f"s3-s3-e2e:{test_id}".encode("utf-8")).digest()

    LOG.info("=== S3 -> S3 E2E TEST START ===")
    LOG.info("Size bytes: %d", cfg.size_bytes)
    LOG.info("SOURCE: s3://%s/%s", cfg.src_bucket, src_key)
    LOG.info("TARGET: s3://%s/%s", cfg.tgt_bucket, tgt_key)

    created = False
    copied = False

    try:
        # 1) Create deterministic source object (stream upload)
        LOG.info("Creating deterministic SOURCE object in S3...")
        stream = DeterministicStream(seed=seed, total_size=cfg.size_bytes)

        extra_args = {
            "Metadata": {
                "e2e-test-id": test_id,
                "e2e-seed-sha256": hashlib.sha256(seed).hexdigest(),
                "e2e-size-bytes": str(cfg.size_bytes),
            }
        }

        s3_client(cfg).upload_fileobj(
            Fileobj=stream,
            Bucket=cfg.src_bucket,
            Key=src_key,
            ExtraArgs=extra_args,
        )
        created = True
        LOG.info("SOURCE upload complete ✅")

        # 2) Copy to target (multipart copy handled by TransferManager)
        LOG.info("Copying SOURCE -> TARGET (server-side)...")
        transfer_cfg = boto3.s3.transfer.TransferConfig(
            multipart_threshold=cfg.multipart_threshold,
            multipart_chunksize=cfg.multipart_chunk_size,
            max_concurrency=10,
            use_threads=True,
        )

        copy_source = {"Bucket": cfg.src_bucket, "Key": src_key}
        s3_resource(cfg).Object(cfg.tgt_bucket, tgt_key).copy(
            copy_source,
            Config=transfer_cfg,
            ExtraArgs={
                # preserve metadata but also note this is a copy test
                "MetadataDirective": "COPY",
            },
        )
        copied = True
        LOG.info("COPY complete ✅")

        # 3) Validate target exists + size matches
        src_meta = wait_for_object(cfg, cfg.src_bucket, src_key)
        tgt_meta = wait_for_object(cfg, cfg.tgt_bucket, tgt_key)

        src_size = int(src_meta.get("ContentLength", -1))
        tgt_size = int(tgt_meta.get("ContentLength", -1))
        if src_size != cfg.size_bytes or tgt_size != cfg.size_bytes:
            raise AssertionError(f"Size mismatch: src={src_size} tgt={tgt_size} expected={cfg.size_bytes}")
        LOG.info("Size match ✅ (src=%d, tgt=%d)", src_size, tgt_size)

        # Best-effort: ETag equality for single-part objects only
        src_etag = (src_meta.get("ETag") or "").strip('"')
        tgt_etag = (tgt_meta.get("ETag") or "").strip('"')
        if "-" not in src_etag and "-" not in tgt_etag:
            if src_etag != tgt_etag:
                raise AssertionError(f"ETag mismatch for single-part objects: src={src_etag} tgt={tgt_etag}")
            LOG.info("ETag match ✅ (single-part)")
        else:
            LOG.info("ETag is multipart (contains '-') — skipping ETag equality check (expected).")

        # 4) Integrity: byte-range spot checks between source and target
        check_len = min(cfg.spot_check_bytes, cfg.size_bytes)
        offsets = choose_offsets(cfg.size_bytes, cfg.spot_checks, check_len, seed)
        LOG.info("Running %d spot checks (%d bytes each)...", len(offsets), check_len)

        for i, off in enumerate(offsets, 1):
            src_bytes = get_range(cfg, cfg.src_bucket, src_key, off, check_len)
            tgt_bytes = get_range(cfg, cfg.tgt_bucket, tgt_key, off, check_len)

            # Optional: compare against deterministic expected bytes too (extra safety)
            exp = expected_bytes(seed, off, len(src_bytes), cfg.size_bytes)

            if src_bytes != tgt_bytes:
                raise AssertionError(f"Spot-check mismatch src vs tgt at offset={off} (check {i}/{len(offsets)})")
            if src_bytes != exp:
                raise AssertionError(f"Spot-check mismatch vs expected pattern at offset={off} (check {i}/{len(offsets)})")

            LOG.info("Spot-check %d/%d ✅ (offset=%d)", i, len(offsets), off)

        LOG.info("✅ PASS: Verified S3 -> S3 end-to-end")
        return 0

    except Exception as e:
        LOG.error("❌ FAIL: %s", str(e))
        return 2

    finally:
        # Optional cleanup
        if cfg.cleanup_tgt and copied:
            try:
                delete_object(cfg, cfg.tgt_bucket, tgt_key)
            except Exception as ce:
                LOG.warning("Cleanup target failed: %s", ce)

        if cfg.cleanup_src and created:
            try:
                delete_object(cfg, cfg.src_bucket, src_key)
            except Exception as ce:
                LOG.warning("Cleanup source failed: %s", ce)

        LOG.info("=== TEST END ===")


if __name__ == "__main__":
    sys.exit(main())
