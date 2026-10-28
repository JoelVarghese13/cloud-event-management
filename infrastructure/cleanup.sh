#!/bin/bash
# ==============================================================================
# Teardown / Cleanup Script (Bash) - Safeguards AWS Credits
# Deletes or terminates provisioned resources to prevent accidental charges
# ==============================================================================

REGION="${AWS_REGION:-ap-south-1}"

echo ">>> Starting resource teardown to save AWS credits in $REGION..."

# 1. Terminate EC2
echo "Terminating EC2 instances tagged 'event-api-server'..."
INSTANCE_IDS=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=event-api-server" "Name=instance-state-name,Values=running,pending,stopped" \
  --query "Reservations[].Instances[].InstanceId" --output text --region "$REGION" || true)

if [ -n "$INSTANCE_IDS" ]; then
  aws ec2 terminate-instances --instance-ids $INSTANCE_IDS --region "$REGION"
  echo "Terminated EC2 instances: $INSTANCE_IDS"
fi

# 2. Delete RDS (Immediate cost saver)
echo "Deleting RDS instance 'event-mgmt-db' (skipping snapshot to eliminate storage costs)..."
aws rds delete-db-instance \
  --db-instance-identifier event-mgmt-db \
  --skip-final-snapshot \
  --delete-automated-backups \
  --region "$REGION" || true

# 3. Delete Lambda
echo "Deleting Lambda function 'ticket-worker'..."
aws lambda delete-function --function-name ticket-worker --region "$REGION" || true

# 4. Delete SQS Queue
echo "Deleting SQS queue..."
QUEUE_URL=$(aws sqs get-queue-url --queue-name event-registration-queue --query 'QueueUrl' --output text --region "$REGION" || true)
if [ -n "$QUEUE_URL" ]; then
  aws sqs delete-queue --queue-url "$QUEUE_URL" --region "$REGION" || true
fi

# 5. Delete SNS Topic
echo "Deleting SNS topic..."
TOPIC_ARN=$(aws sns list-topics --query "Topics[?contains(TopicArn, 'event-ticket-topic')].TopicArn" --output text --region "$REGION" || true)
if [ -n "$TOPIC_ARN" ]; then
  aws sns delete-topic --topic-arn "$TOPIC_ARN" --region "$REGION" || true
fi

# 6. Delete CloudWatch Alarm
echo "Deleting CloudWatch alarms..."
aws cloudwatch delete-alarms --alarm-names "EC2-HighCPU" --region "$REGION" || true
aws cloudwatch delete-dashboards --dashboard-names "EventMgmtDashboard" --region "$REGION" || true

# 7. S3 Buckets & Budget
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "838775536247")
echo "Deleting S3 buckets..."
aws s3 rm "s3://event-mgmt-flyers-${ACCOUNT_ID}" --recursive --region "$REGION" 2>/dev/null || true
aws s3api delete-bucket --bucket "event-mgmt-flyers-${ACCOUNT_ID}" --region "$REGION" 2>/dev/null || true

aws s3 rm "s3://event-mgmt-site-${ACCOUNT_ID}" --recursive --region "$REGION" 2>/dev/null || true
aws s3api delete-bucket --bucket "event-mgmt-site-${ACCOUNT_ID}" --region "$REGION" 2>/dev/null || true

aws budgets delete-budget --account-id "$ACCOUNT_ID" --budget-name "Zero-Cost-University-Cap" 2>/dev/null || true

echo "All active billing compute and storage resources removed. Your AWS credits are preserved!"
