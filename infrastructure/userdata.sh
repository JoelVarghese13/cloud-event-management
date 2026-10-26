#!/bin/bash
# ==============================================================================
# EC2 User Data Script - Event Management API Server
# Target OS: Amazon Linux 2023 (ap-south-1)
# ==============================================================================

set -e

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo ">>> Updating packages..."
dnf update -y
dnf install -y nodejs unzip git

echo ">>> Installing PM2 process manager..."
npm install -g pm2

# Dynamically resolve AWS Account ID and Region from IMDSv2 or STS
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)
if [ -n "$TOKEN" ]; then
  ACCOUNT_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/dynamic/instance-identity/document 2>/dev/null | grep accountId | awk -F'"' '{print $4}')
  AWS_REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/dynamic/instance-identity/document 2>/dev/null | grep region | awk -F'"' '{print $4}')
fi
ACCOUNT_ID="${ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "838775536247")}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
FLYERS_BUCKET="event-mgmt-flyers-${ACCOUNT_ID}"
SQS_QUEUE_URL="https://sqs.${AWS_REGION}.amazonaws.com/${ACCOUNT_ID}/event-registration-queue"

echo ">>> Deploying Event API backend (Account: $ACCOUNT_ID, Region: $AWS_REGION)..."
mkdir -p /opt/event-mgmt-api
cd /opt/event-mgmt-api

# Pull deployment package from S3; if not present, clone from public GitHub repository
if aws s3 cp "s3://${FLYERS_BUCKET}/deploy/backend.zip" /tmp/backend.zip --region "$AWS_REGION" 2>/dev/null; then
  echo ">>> Extracted backend package from S3"
  unzip -o /tmp/backend.zip -d /opt/event-mgmt-api
else
  echo ">>> Pulling backend from GitHub repository..."
  rm -rf /tmp/ccl-repo
  git clone https://github.com/JoelVarghese13/cloud-event-management.git /tmp/ccl-repo
  cp -r /tmp/ccl-repo/backend/* /opt/event-mgmt-api/
fi

# Install production dependencies
npm install --omit=dev

# Start Express server via PM2
export NODE_ENV=production
export PORT=3000
export AWS_REGION="$AWS_REGION"
export SQS_QUEUE_URL="$SQS_QUEUE_URL"
export FLYERS_BUCKET="$FLYERS_BUCKET"

pm2 start server.js --name "event-api"
pm2 save
pm2 startup systemd -u root --hp /root

echo ">>> EC2 API Bootstrap Complete! Server is listening on port 3000."
