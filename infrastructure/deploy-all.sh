#!/bin/bash
# ==============================================================================
# Full AWS Deployment Script - Cloud-Based Event Management & Ticketing System
# University Cloud Computing Laboratory Project
# ==============================================================================

set -e

# Default configurations (override as needed)
REGION="${AWS_REGION:-ap-south-1}"
DB_PASSWORD="${DB_PASSWORD:-YourSecurePassword123!}"
STUDENT_EMAIL="${STUDENT_EMAIL:-team@university.edu}"

echo ">>> Fetching AWS Account Details..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Operating in Region: $REGION, Account ID: $ACCOUNT_ID"

# ------------------------------------------------------------------------------
# STEP 1: PERSON A - NETWORKING, SECURITY & IAM
# ------------------------------------------------------------------------------
echo "=== [Person A] Provisioning VPC & Subnets ==="
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=event-mgmt-vpc}]' \
  --query 'Vpc.VpcId' --output text --region "$REGION")
echo "Created VPC: $VPC_ID"

# Enable DNS support and hostnames
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support "{\"Value\":true}" --region "$REGION"
aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames "{\"Value\":true}" --region "$REGION"

PUBLIC_SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.1.0/24 \
  --availability-zone "${REGION}a" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet}]' \
  --query 'Subnet.SubnetId' --output text --region "$REGION")
echo "Created Public Subnet: $PUBLIC_SUBNET_ID"

PRIVATE_SUBNET_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.2.0/24 \
  --availability-zone "${REGION}b" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet}]' \
  --query 'Subnet.SubnetId' --output text --region "$REGION")
echo "Created Private Subnet 1: $PRIVATE_SUBNET_ID"

# Secondary private subnet in AZ-c for RDS multi-AZ DB subnet requirements
PRIVATE_SUBNET_2_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block 10.0.3.0/24 \
  --availability-zone "${REGION}c" \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-2}]' \
  --query 'Subnet.SubnetId' --output text --region "$REGION" || true)

echo "=== [Person A] Provisioning Internet Gateway & Route Table ==="
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=event-igw}]' \
  --query 'InternetGateway.InternetGatewayId' --output text --region "$REGION")
aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$REGION"

PUBLIC_RT_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]' \
  --query 'RouteTable.RouteTableId' --output text --region "$REGION")
aws ec2 create-route --route-table-id "$PUBLIC_RT_ID" --destination-cidr-block 0.0.0.0/0 --gateway-id "$IGW_ID" --region "$REGION"
aws ec2 associate-route-table --route-table-id "$PUBLIC_RT_ID" --subnet-id "$PUBLIC_SUBNET_ID" --region "$REGION"

echo "=== [Person A] Security Groups ==="
SG_WEB_ID=$(aws ec2 create-security-group --group-name allow-web --description "EC2 Web SG" --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text --region "$REGION")
aws ec2 authorize-security-group-ingress --group-id "$SG_WEB_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 --region "$REGION"
aws ec2 authorize-security-group-ingress --group-id "$SG_WEB_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$REGION"
aws ec2 authorize-security-group-ingress --group-id "$SG_WEB_ID" --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region "$REGION"

SG_RDS_ID=$(aws ec2 create-security-group --group-name allow-rds --description "RDS Private SG" --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text --region "$REGION")
aws ec2 authorize-security-group-ingress --group-id "$SG_RDS_ID" --protocol tcp --port 3306 --source-group "$SG_WEB_ID" --region "$REGION"

echo "=== [Person A] IAM Roles & Instance Profile ==="
aws iam create-role --role-name EventMgmtEC2Role --assume-role-policy-document file://ec2-trust-policy.json || true
aws iam attach-role-policy --role-name EventMgmtEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess
aws iam attach-role-policy --role-name EventMgmtEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam attach-role-policy --role-name EventMgmtEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam create-instance-profile --instance-profile-name EventMgmtEC2Profile || true
aws iam add-role-to-instance-profile --instance-profile-name EventMgmtEC2Profile --role-name EventMgmtEC2Role || true

aws iam create-role --role-name EventMgmtLambdaRole --assume-role-policy-document file://lambda-trust-policy.json || true
aws iam attach-role-policy --role-name EventMgmtLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole
aws iam attach-role-policy --role-name EventMgmtLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess

# ------------------------------------------------------------------------------
# STEP 2: PERSON B - RDS, SQS, S3 (FLYERS)
# ------------------------------------------------------------------------------
echo "=== [Person B] RDS Subnet Group & Database ==="
SUBNET_LIST="$PRIVATE_SUBNET_ID $PUBLIC_SUBNET_ID"
if [ -n "$PRIVATE_SUBNET_2_ID" ]; then
  SUBNET_LIST="$PRIVATE_SUBNET_ID $PRIVATE_SUBNET_2_ID"
fi

aws rds create-db-subnet-group --db-subnet-group-name event-mgmt-subnet-grp \
  --db-subnet-group-description "Subnets for Event RDS" \
  --subnet-ids $SUBNET_LIST --region "$REGION" || true

aws rds create-db-instance \
  --db-instance-identifier event-mgmt-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --db-name eventmgmt \
  --allocated-storage 20 \
  --vpc-security-group-ids "$SG_RDS_ID" \
  --db-subnet-group-name event-mgmt-subnet-grp \
  --no-multi-az \
  --no-publicly-accessible \
  --region "$REGION" || true

echo "=== [Person B] SQS Queue ==="
QUEUE_URL=$(aws sqs create-queue --queue-name event-registration-queue \
  --attributes '{"VisibilityTimeout":"60","MessageRetentionPeriod":"86400"}' \
  --query 'QueueUrl' --output text --region "$REGION")
QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text --region "$REGION")

echo "=== [Person B] S3 Flyer Storage ==="
FLYERS_BUCKET="event-mgmt-flyers-${ACCOUNT_ID}"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$FLYERS_BUCKET" --region "$REGION" || true
else
  aws s3api create-bucket --bucket "$FLYERS_BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" || true
fi
aws s3api put-bucket-cors --bucket "$FLYERS_BUCKET" --cors-configuration file://cors.json

# ------------------------------------------------------------------------------
# STEP 3: PERSON C - SNS, LAMBDA & S3 FRONTEND
# ------------------------------------------------------------------------------
echo "=== [Person C] SNS Topic & Subscription ==="
SNS_TOPIC_ARN=$(aws sns create-topic --name event-ticket-topic --query 'TopicArn' --output text --region "$REGION")
aws sns subscribe --topic-arn "$SNS_TOPIC_ARN" --protocol email --notification-endpoint "$STUDENT_EMAIL" --region "$REGION"

echo "=== [Person C] Lambda Deployment ==="
cd ../lambda
zip -r /tmp/worker.zip worker.py
cd ../infrastructure

LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/EventMgmtLambdaRole"
# Sleep briefly for IAM role propagation
sleep 10

aws lambda create-function \
  --function-name ticket-worker \
  --runtime python3.12 \
  --role "$LAMBDA_ROLE_ARN" \
  --handler worker.lambda_handler \
  --zip-file fileb:///tmp/worker.zip \
  --environment Variables="{SNS_TOPIC_ARN=$SNS_TOPIC_ARN}" \
  --region "$REGION" || true

aws lambda create-event-source-mapping \
  --function-name ticket-worker \
  --event-source-arn "$QUEUE_ARN" \
  --batch-size 5 \
  --region "$REGION" || true

echo "=== [Person C] CloudWatch Dashboard & Alarms ==="
aws cloudwatch put-dashboard --dashboard-name EventMgmtDashboard --dashboard-body file://dashboard.json --region "$REGION"
aws cloudwatch put-metric-alarm \
  --alarm-name "EC2-HighCPU" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --region "$REGION"

echo "=== Deployment Completed Successfully! ==="
