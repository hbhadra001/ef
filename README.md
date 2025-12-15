python3 -m venv ~/.venv
source ~/.venv/bin/activate
pip install --upgrade pip
pip install boto3 botocore paramiko python-dotenv


# SFTP (key-based)
SFTP_HOST=sftp.example.com
SFTP_PORT=22
SFTP_USERNAME=myuser
SFTP_PRIVATE_KEY_PATH=/home/ec2-user/.ssh/id_test_sftp
SFTP_PRIVATE_KEY_PASSPHRASE=
SFTP_REMOTE_DIR=/incoming

# S3
AWS_REGION=us-west-2
S3_BUCKET=my-target-bucket
S3_PREFIX=inbound/

# How to locate the object in S3:
# exact  -> assumes S3 key = S3_PREFIX + filename (or S3_EXACT_KEY if set)
# discover -> searches under prefix for any object ending with filename
S3_KEY_MODE=exact
# S3_EXACT_KEY=some/explicit/key.bin

# Size (supports 1MB..20GB etc)
TEST_SIZE=20GB

# Timing
WAIT_TIMEOUT_SECONDS=7200
POLL_INTERVAL_SECONDS=10
STABLE_POLLS_REQUIRED=3

# Spot checks
SPOT_CHECKS=8
SPOT_CHECK_BYTES=262144

# Cleanup (optional)
CLEANUP_REMOTE_SFTP=false
CLEANUP_S3_OBJECT=false

LOG_LEVEL=INFO



