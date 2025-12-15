#!/usr/bin/env python3
"""
Production-ready S3 -> SFTP E2E test for EC2.

Supports 1MB–20GB without local disk usage.
Validates integrity via size + deterministic byte-range spot checks.
"""

import os
import sys
import time
import uuid
import logging
import hashlib
from dataclasses import dataclass
from typing import Optional, List

import boto3
import botocore
import paramiko
from dotenv import load_dotenv


# ---------------- Logging ----------------
def setup_logging(level: str):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )


LOG = logging.getLogger("s3-to-sftp-test")


# ---------------- Utils ----------------
def env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.lower() in ("1", "true", "yes", "y")


def parse_size(v: str) -> int:
    v = v.strip().upper()
    if v.isdigit():
        return int(v)

    units = {
        "MB": 1000**2,
        "GB": 1000**3,
        "MIB": 1024**2,
        "GIB": 1024**3,
    }
    for u, m in units.items():
        if v.endswith(u):
            return int(float(v[:-len(u)]) * m)
    raise ValueError(f"Invalid TEST_SIZE: {v}")


# ---------------- Config ----------------
@dataclass
class Config:
    aws_region: str
    s3_bucket: str
    s3_prefix: str

    sftp_host: str
    sftp_port: int
    sftp_username: str
    sftp_key_path: str
    sftp_key_passphrase: Optional[str]
    sftp_remote_dir: str

    size_bytes: int
    io_chunk_bytes: int

    wait_timeout: int
    poll_interval: int
    stable_polls: int

    spot_checks: int
    spot_check_bytes: int

    cleanup_s3: bool
    cleanup_sftp: bool

    log_level: str


def load_config() -> Config:
    load_dotenv()

    return Config(
        aws_region=os.getenv("AWS_REGION", "us-west-2"),
        s3_bucket=os.environ["S3_BUCKET"],
        s3_prefix=os.getenv("S3_PREFIX", "").rstrip("/") + "/",

        sftp_host=os.environ["TGT_SFTP_HOST"],
        sftp_port=int(os.getenv("TGT_SFTP_PORT", "22")),
        sftp_username=os.environ["TGT_SFTP_USERNAME"],
        sftp_key_path=os.environ["TGT_SFTP_PRIVATE_KEY_PATH"],
        sftp_key_passphrase=os.getenv("TGT_SFTP_PRIVATE_KEY_PASSPHRASE") or None,
        sftp_remote_dir=os.getenv("TGT_SFTP_REMOTE_DIR", "/").rstrip("/") or "/",

        size_bytes=parse_size(os.getenv("TEST_SIZE", "1MB")),
        io_chunk_bytes=int(os.getenv("IO_CHUNK_BYTES", str(1024 * 1024))),

        wait_timeout=int(os.getenv("WAIT_TIMEOUT_SECONDS", "3600")),
        poll_interval=int(os.getenv("POLL_INTERVAL_SECONDS", "5")),
        stable_polls=int(os.getenv("STABLE_POLLS_REQUIRED", "3")),

        spot_checks=int(os.getenv("SPOT_CHECKS", "8")),
        spot_check_bytes=int(os.getenv("SPOT_CHECK_BYTES", str(256 * 1024))),

        cleanup_s3=env_bool("CLEANUP_S3", False),
        cleanup_sftp=env_bool("CLEANUP_SFTP", False),

        log_level=os.getenv("LOG_LEVEL", "INFO"),
    )


# ---------------- Deterministic bytes ----------------
CHUNK = 1024 * 1024


def gen_bytes(seed: bytes, offset: int, length: int) -> bytes:
    out = bytearray()
    idx = offset // CHUNK
    pos = offset % CHUNK
    while len(out) < length:
        h = hashlib.blake2b(seed + idx.to_bytes(8, "big"), digest_size=64)
        block = h.digest()
        take = min(len(block) - pos, length - len(out))
        out.extend(block[pos:pos + take])
        idx += 1
        pos = 0
    return bytes(out)


def choose_offsets(size: int, checks: int, span: int, seed: bytes) -> List[int]:
    offs = {0, max(0, size - span)}
    i = 0
    while len(offs) < checks:
        h = hashlib.blake2b(seed + i.to_bytes(8, "big"), digest_size=8)
        offs.add(int.from_bytes(h.digest(), "big") % (size - span + 1))
        i += 1
    return sorted(list(offs))[:checks]


# ---------------- SFTP ----------------
def load_key(path: str, passphrase: Optional[str]) -> paramiko.PKey:
    for cls in (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey):
        try:
            return cls.from_private_key_file(path, password=passphrase)
        except Exception:
            pass
    raise RuntimeError("Unable to load private key")


def connect_sftp(cfg: Config):
    t = paramiko.Transport((cfg.sftp_host, cfg.sftp_port))
    key = load_key(cfg.sftp_key_path, cfg.sftp_key_passphrase)
    t.connect(username=cfg.sftp_username, pkey=key)
    return t, paramiko.SFTPClient.from_transport(t)


# ---------------- Main ----------------
def main() -> int:
    cfg = load_config()
    setup_logging(cfg.log_level)

    s3 = boto3.client("s3", region_name=cfg.aws_region)

    test_id = uuid.uuid4().hex
    filename = f"s3-sftp-test-{test_id}.bin"
    s3_key = f"{cfg.s3_prefix}{filename}"
    sftp_path = f"{cfg.sftp_remote_dir}/{filename}"

    seed = hashlib.sha256(test_id.encode()).digest()

    LOG.info("Creating S3 object %s (%d bytes)", s3_key, cfg.size_bytes)

    # Upload deterministic object to S3
    s3.upload_fileobj(
        Fileobj=type("S", (), {"read": lambda _, n=-1: gen_bytes(seed, 0, cfg.size_bytes)})(),
        Bucket=cfg.s3_bucket,
        Key=s3_key,
    )

    # Stream S3 → SFTP
    LOG.info("Streaming S3 -> SFTP")
    t, sftp = connect_sftp(cfg)
    try:
        with sftp.open(sftp_path, "wb") as wf:
            resp = s3.get_object(Bucket=cfg.s3_bucket, Key=s3_key)
            stream = resp["Body"]
            transferred = 0
            while True:
                buf = stream.read(cfg.io_chunk_bytes)
                if not buf:
                    break
                wf.write(buf)
                transferred += len(buf)
        LOG.info("Transfer complete (%d bytes)", transferred)
    finally:
        sftp.close()
        t.close()

    # Verify size + spot checks
    t, sftp = connect_sftp(cfg)
    try:
        size = sftp.stat(sftp_path).st_size
        if size != cfg.size_bytes:
            raise AssertionError("Size mismatch")

        offsets = choose_offsets(cfg.size_bytes, cfg.spot_checks, cfg.spot_check_bytes, seed)
        with sftp.open(sftp_path, "rb") as f:
            for off in offsets:
                f.seek(off)
                actual = f.read(cfg.spot_check_bytes)
                expected = gen_bytes(seed, off, len(actual))
                if actual != expected:
                    raise AssertionError(f"Spot check failed at offset {off}")
        LOG.info("Verification PASSED ✅")
    finally:
        sftp.close()
        t.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
