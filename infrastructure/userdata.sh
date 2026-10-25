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

echo ">>> Deploying Event API backend from S3..."
mkdir -p /opt/event-mgmt-api
cd /opt/event-mgmt-api

# Pull deployment package using EC2 IAM Role permissions
aws s3 cp s3://event-mgmt-flyers-838775536247/deploy/backend.zip /tmp/backend.zip --region ap-south-1
unzip -o /tmp/backend.zip -d /opt/event-mgmt-api

# Install production dependencies
npm install --omit=dev

# Start Express server via PM2
export NODE_ENV=production
export PORT=3000
export AWS_REGION=ap-south-1
export SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/838775536247/event-registration-queue
export FLYERS_BUCKET=event-mgmt-flyers-838775536247

pm2 start server.js --name "event-api"
pm2 save
pm2 startup systemd -u root --hp /root

echo ">>> EC2 API Bootstrap Complete! Server is listening on port 3000."
