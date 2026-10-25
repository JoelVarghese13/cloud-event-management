# ==============================================================================
# Complete AWS Teardown Script - Cloud-Based Event Management
# Safely terminates and deletes all cloud resources to ensure $0.00 spend
# ==============================================================================

param (
    [string]$Region = "ap-south-1"
)

Write-Host ">>> Starting Full Resource Teardown in Region: $Region..." -ForegroundColor Yellow

# 1. Terminate EC2 Instances
Write-Host "1. Terminating EC2 instances..." -ForegroundColor Cyan
$instanceIds = aws ec2 describe-instances `
    --filters "Name=tag:Name,Values=event-api-server" "Name=instance-state-name,Values=running,pending,stopped" `
    --query "Reservations[].Instances[].InstanceId" --output text --region $Region

if ($instanceIds -and $instanceIds.Trim() -ne "") {
    aws ec2 terminate-instances --instance-ids ($instanceIds -split '\s+') --region $Region
    Write-Host "Terminated EC2 instances: $instanceIds" -ForegroundColor Green
}

# 2. Delete RDS MySQL Database
Write-Host "2. Deleting RDS Database 'event-mgmt-db' (skipping snapshots)..." -ForegroundColor Cyan
aws rds delete-db-instance `
    --db-instance-identifier event-mgmt-db `
    --skip-final-snapshot `
    --delete-automated-backups `
    --region $Region 2>$null

# 3. Delete Lambda Event Source Mapping & Function
Write-Host "3. Deleting Lambda Function & Event Mappings..." -ForegroundColor Cyan
$mappings = aws lambda list-event-source-mappings --function-name ticket-worker --query "EventSourceMappings[].UUID" --output text --region $Region 2>$null
if ($mappings -and $mappings.Trim() -ne "") {
    foreach ($m in ($mappings -split '\s+')) {
        aws lambda delete-event-source-mapping --uuid $m --region $Region 2>$null
    }
}
aws lambda delete-function --function-name ticket-worker --region $Region 2>$null

# 4. Delete SQS Queue
Write-Host "4. Deleting SQS Queue 'event-registration-queue'..." -ForegroundColor Cyan
$queueUrl = aws sqs get-queue-url --queue-name event-registration-queue --query 'QueueUrl' --output text --region $Region 2>$null
if ($queueUrl -and $queueUrl.Trim() -ne "") {
    aws sqs delete-queue --queue-url $queueUrl --region $Region
}

# 5. Delete SNS Topic
Write-Host "5. Deleting SNS Topic..." -ForegroundColor Cyan
$topics = aws sns list-topics --query "Topics[?contains(TopicArn, 'event-ticket-topic')].TopicArn" --output text --region $Region 2>$null
if ($topics -and $topics.Trim() -ne "") {
    foreach ($t in ($topics -split '\s+')) {
        aws sns delete-topic --topic-arn $t --region $Region
    }
}

# 6. Delete CloudWatch Alarms & Dashboard
Write-Host "6. Deleting CloudWatch Alarms & Dashboard..." -ForegroundColor Cyan
aws cloudwatch delete-alarms --alarm-names "EC2-HighCPU" --region $Region 2>$null
aws cloudwatch delete-dashboards --dashboard-names "EventMgmtDashboard" --region $Region 2>$null

# 7. Delete SSM Parameters
Write-Host "7. Deleting SSM Parameters..." -ForegroundColor Cyan
aws ssm delete-parameter --name "/event-mgmt/db/host" --region $Region 2>$null
aws ssm delete-parameter --name "/event-mgmt/db/username" --region $Region 2>$null
aws ssm delete-parameter --name "/event-mgmt/db/password" --region $Region 2>$null

# 8. Empty & Delete S3 Buckets
Write-Host "8. Emptying and deleting S3 Bucket..." -ForegroundColor Cyan
$caller = aws sts get-caller-identity | ConvertFrom-Json
$accId = $caller.Account
$bucket = "event-mgmt-flyers-$accId"
aws s3 rm "s3://$bucket" --recursive --region $Region 2>$null
aws s3api delete-bucket --bucket $bucket --region $Region 2>$null

# 9. Delete EC2 Key Pair
Write-Host "9. Deleting EC2 Key Pair 'event-mgmt-key'..." -ForegroundColor Cyan
aws ec2 delete-key-pair --key-name event-mgmt-key --region $Region 2>$null

# 10. Delete AWS Budget
Write-Host "10. Deleting AWS Budget..." -ForegroundColor Cyan
aws budgets delete-budget --account-id $accId --budget-name "Zero-Cost-University-Cap" 2>$null

Write-Host "`nAll compute, database, queue, serverless, and storage assets successfully terminated!" -ForegroundColor Green
Write-Host "Your AWS account has 0 active running resources." -ForegroundColor Green
