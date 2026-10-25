# ==============================================================================
# Recreate All Cloud Resources Script - Cloud-Based Event Management
# Provisions RDS, SQS, SNS, Lambda, EC2, CloudWatch, and Budget
# ==============================================================================

param (
    [string]$Region = "ap-south-1",
    [string]$DbPassword = "YourSecurePassword123!",
    [string]$StudentEmail = "admin@university.edu"
)

Write-Host ">>> Fetching AWS Account and Existing Network Topology..." -ForegroundColor Cyan
$caller = aws sts get-caller-identity | ConvertFrom-Json
$AccountId = $caller.Account
Write-Host "Operating in Region: $Region, Account ID: $AccountId" -ForegroundColor Green

# 1. Retrieve Existing Network
$VpcId = (aws ec2 describe-vpcs --filters "Name=tag:Name,Values=event-mgmt-vpc" --region $Region | ConvertFrom-Json).Vpcs[0].VpcId
$PublicSubnetId = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VpcId" "Name=tag:Name,Values=public-subnet" --region $Region | ConvertFrom-Json).Subnets[0].SubnetId
$SgWebId = (aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VpcId" "Name=group-name,Values=allow-web" --region $Region | ConvertFrom-Json).SecurityGroups[0].GroupId
$SgRdsId = (aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VpcId" "Name=group-name,Values=allow-rds" --region $Region | ConvertFrom-Json).SecurityGroups[0].GroupId

Write-Host "Using VPC: $VpcId" -ForegroundColor Green
Write-Host "Public Subnet: $PublicSubnetId | Web SG: $SgWebId | RDS SG: $SgRdsId" -ForegroundColor Green

# 2. Recreate RDS Database
Write-Host "`n1. Provisioning Free-Tier RDS MySQL Instance (db.t3.micro, Single-AZ)..." -ForegroundColor Yellow
aws rds create-db-instance `
    --db-instance-identifier event-mgmt-db `
    --db-instance-class db.t3.micro `
    --engine mysql `
    --master-username admin `
    --master-user-password $DbPassword `
    --db-name eventmgmt `
    --allocated-storage 20 `
    --storage-type gp2 `
    --backup-retention-period 0 `
    --vpc-security-group-ids $SgRdsId `
    --db-subnet-group-name event-mgmt-subnet-grp `
    --no-multi-az `
    --no-publicly-accessible `
    --region $Region

# 3. Recreate SQS Queue
Write-Host "`n2. Creating Amazon SQS Queue..." -ForegroundColor Yellow
$queue = aws sqs create-queue --queue-name event-registration-queue `
    --attributes '{\"VisibilityTimeout\":\"60\",\"MessageRetentionPeriod\":\"86400\"}' `
    --region $Region | ConvertFrom-Json
$QueueUrl = $queue.QueueUrl
$queueAttrs = aws sqs get-queue-attributes --queue-url $QueueUrl --attribute-names QueueArn --region $Region | ConvertFrom-Json
$QueueArn = $queueAttrs.Attributes.QueueArn
Write-Host "Created SQS Queue: $QueueUrl" -ForegroundColor Green

# 4. Recreate SNS Topic
Write-Host "`n3. Creating Amazon SNS Topic..." -ForegroundColor Yellow
$topic = aws sns create-topic --name event-ticket-topic --region $Region | ConvertFrom-Json
$TopicArn = $topic.TopicArn
aws sns subscribe --topic-arn $TopicArn --protocol email --notification-endpoint $StudentEmail --region $Region
Write-Host "Created SNS Topic: $TopicArn" -ForegroundColor Green

# 5. Recreate Lambda Function & Event Source Mapping
Write-Host "`n4. Packaging and Deploying Lambda Worker..." -ForegroundColor Yellow
$ZipPath = Join-Path $env:TEMP "worker.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "..\lambda\worker.py" -DestinationPath $ZipPath -Force

$LambdaRoleArn = "arn:aws:iam::${AccountId}:role/EventMgmtLambdaRole"
aws lambda create-function `
    --function-name ticket-worker `
    --runtime python3.12 `
    --role $LambdaRoleArn `
    --handler worker.lambda_handler `
    --zip-file "fileb://$ZipPath" `
    --environment "Variables={SNS_TOPIC_ARN=$TopicArn}" `
    --region $Region

aws lambda create-event-source-mapping `
    --function-name ticket-worker `
    --event-source-arn $QueueArn `
    --batch-size 5 `
    --region $Region
Write-Host "Connected SQS Queue to Lambda Worker successfully!" -ForegroundColor Green

# 6. Recreate EC2 Key Pair if needed
Write-Host "`n5. Verifying SSH Key Pair..." -ForegroundColor Yellow
$existingKey = aws ec2 describe-key-pairs --key-names event-mgmt-key --region $Region 2>$null
if (-not $existingKey) {
    $km = aws ec2 create-key-pair --key-name event-mgmt-key --query "KeyMaterial" --output text --region $Region
    Set-Content -Path "..\event-mgmt-key.pem" -Value $km -NoNewline
}

# 7. Launch Fresh EC2 API Server
Write-Host "`n6. Launching Amazon EC2 Server (t3.micro, Free Tier)..." -ForegroundColor Yellow
$amiId = aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --region $Region --query "Parameter.Value" --output text

$ec2 = aws ec2 run-instances `
    --image-id $amiId `
    --instance-type t3.micro `
    --key-name event-mgmt-key `
    --subnet-id $PublicSubnetId `
    --security-group-ids $SgWebId `
    --associate-public-ip-address `
    --iam-instance-profile Name=EventMgmtEC2Profile `
    --user-data file://userdata.sh `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=event-api-server}]" `
    --region $Region | ConvertFrom-Json

$InstanceId = $ec2.Instances[0].InstanceId
Write-Host "Launched EC2 Instance: $InstanceId" -ForegroundColor Green

# 8. Restore CloudWatch Dashboard & Budget
Write-Host "`n7. Restoring CloudWatch Monitoring & Budget..." -ForegroundColor Yellow
aws cloudwatch put-dashboard --dashboard-name EventMgmtDashboard --dashboard-body file://dashboard.json --region $Region
aws cloudwatch put-metric-alarm `
    --alarm-name "EC2-HighCPU" `
    --metric-name CPUUtilization `
    --namespace AWS/EC2 `
    --statistic Average `
    --period 300 --evaluation-periods 2 `
    --threshold 80 `
    --comparison-operator GreaterThanOrEqualToThreshold `
    --alarm-actions $TopicArn `
    --region $Region

aws budgets create-budget --account-id $AccountId --budget file://budget.json --notifications-with-subscribers file://budget-notifications.json 2>$null

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " ALL CLOUD RESOURCES SUCCESSFULLY RECREATED!" -ForegroundColor Green
Write-Host " EC2 Instance: $InstanceId (t3.micro Free Tier)" -ForegroundColor Green
Write-Host " SQS Queue: $QueueUrl" -ForegroundColor Green
Write-Host " SNS Topic: $TopicArn" -ForegroundColor Green
Write-Host " Lambda Worker: ticket-worker" -ForegroundColor Green
Write-Host " RDS Database: event-mgmt-db (provisioning in background)" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
