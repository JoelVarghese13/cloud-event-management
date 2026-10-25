# ==============================================================================
# Full AWS Deployment Script (PowerShell) - Cloud-Based Event Management
# University Cloud Computing Laboratory Project
# Optimized for AWS Free Tier with Zero Accidental Spend
# ==============================================================================

param (
    [string]$Region = "ap-south-1",
    [string]$DbPassword = "YourSecurePassword123!",
    [string]$StudentEmail = "team@university.edu"
)

Write-Host ">>> Verifying AWS STS Caller Identity..." -ForegroundColor Cyan
$callerIdentity = aws sts get-caller-identity | ConvertFrom-Json
$AccountId = $callerIdentity.Account
Write-Host "Operating in Region: $Region, Account ID: $AccountId" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 1: PERSON A - NETWORKING, SECURITY & IAM
# ------------------------------------------------------------------------------
Write-Host "`n=== [Person A] Provisioning VPC & Subnets ===" -ForegroundColor Yellow
$vpcJson = aws ec2 create-vpc --cidr-block 10.0.0.0/16 `
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=event-mgmt-vpc}]" `
    --region $Region | ConvertFrom-Json
$VpcId = $vpcJson.Vpc.VpcId
Write-Host "Created VPC: $VpcId" -ForegroundColor Green

aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-support '{\"Value\":true}' --region $Region
aws ec2 modify-vpc-attribute --vpc-id $VpcId --enable-dns-hostnames '{\"Value\":true}' --region $Region

$pubSubnet = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.1.0/24 `
    --availability-zone "${Region}a" `
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet}]" `
    --region $Region | ConvertFrom-Json
$PublicSubnetId = $pubSubnet.Subnet.SubnetId
Write-Host "Created Public Subnet: $PublicSubnetId" -ForegroundColor Green

$privSubnet1 = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.2.0/24 `
    --availability-zone "${Region}b" `
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet}]" `
    --region $Region | ConvertFrom-Json
$PrivateSubnetId = $privSubnet1.Subnet.SubnetId
Write-Host "Created Private Subnet 1: $PrivateSubnetId" -ForegroundColor Green

$privSubnet2 = aws ec2 create-subnet --vpc-id $VpcId --cidr-block 10.0.3.0/24 `
    --availability-zone "${Region}c" `
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-2}]" `
    --region $Region | ConvertFrom-Json
$PrivateSubnet2Id = $privSubnet2.Subnet.SubnetId
Write-Host "Created Private Subnet 2: $PrivateSubnet2Id" -ForegroundColor Green

Write-Host "`n=== [Person A] Internet Gateway & Route Tables ===" -ForegroundColor Yellow
$igw = aws ec2 create-internet-gateway `
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=event-igw}]" `
    --region $Region | ConvertFrom-Json
$IgwId = $igw.InternetGateway.InternetGatewayId
aws ec2 attach-internet-gateway --internet-gateway-id $IgwId --vpc-id $VpcId --region $Region
Write-Host "Attached Internet Gateway: $IgwId" -ForegroundColor Green

$rt = aws ec2 create-route-table --vpc-id $VpcId `
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]" `
    --region $Region | ConvertFrom-Json
$PublicRtId = $rt.RouteTable.RouteTableId
aws ec2 create-route --route-table-id $PublicRtId --destination-cidr-block 0.0.0.0/0 --gateway-id $IgwId --region $Region
aws ec2 associate-route-table --route-table-id $PublicRtId --subnet-id $PublicSubnetId --region $Region
Write-Host "Associated Route Table: $PublicRtId with Public Subnet" -ForegroundColor Green

Write-Host "`n=== [Person A] Security Groups ===" -ForegroundColor Yellow
$webSg = aws ec2 create-security-group --group-name allow-web --description "EC2 Web SG" --vpc-id $VpcId --region $Region | ConvertFrom-Json
$SgWebId = $webSg.GroupId
aws ec2 authorize-security-group-ingress --group-id $SgWebId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region
aws ec2 authorize-security-group-ingress --group-id $SgWebId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region
aws ec2 authorize-security-group-ingress --group-id $SgWebId --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $Region
Write-Host "Created Web Security Group: $SgWebId" -ForegroundColor Green

$rdsSg = aws ec2 create-security-group --group-name allow-rds --description "RDS Private SG" --vpc-id $VpcId --region $Region | ConvertFrom-Json
$SgRdsId = $rdsSg.GroupId
aws ec2 authorize-security-group-ingress --group-id $SgRdsId --protocol tcp --port 3306 --source-group $SgWebId --region $Region
Write-Host "Created RDS Security Group: $SgRdsId (Port 3306 allowed from Web SG only)" -ForegroundColor Green

Write-Host "`n=== [Person A] IAM Roles & Instance Profiles ===" -ForegroundColor Yellow
try {
    aws iam create-role --role-name EventMgmtEC2Role --assume-role-policy-document file://ec2-trust-policy.json
    aws iam attach-role-policy --role-name EventMgmtEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonSSMReadOnlyAccess
    aws iam attach-role-policy --role-name EventMgmtEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
    aws iam attach-role-policy --role-name EventMgmtEC2Role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

    aws iam create-instance-profile --instance-profile-name EventMgmtEC2Profile
    aws iam add-role-to-instance-profile --instance-profile-name EventMgmtEC2Profile --role-name EventMgmtEC2Role
    Write-Host "Created EC2 IAM Role & Instance Profile" -ForegroundColor Green
} catch {
    Write-Host "Notice: IAM Role EventMgmtEC2Role may already exist." -ForegroundColor Gray
}

try {
    aws iam create-role --role-name EventMgmtLambdaRole --assume-role-policy-document file://lambda-trust-policy.json
    aws iam attach-role-policy --role-name EventMgmtLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole
    aws iam attach-role-policy --role-name EventMgmtLambdaRole --policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess
    Write-Host "Created Lambda IAM Role" -ForegroundColor Green
} catch {
    Write-Host "Notice: IAM Role EventMgmtLambdaRole may already exist." -ForegroundColor Gray
}

# ------------------------------------------------------------------------------
# STEP 2: PERSON B - RDS, SQS, S3 FLYERS
# ------------------------------------------------------------------------------
Write-Host "`n=== [Person B] RDS Subnet Group & Database ===" -ForegroundColor Yellow
try {
    aws rds create-db-subnet-group --db-subnet-group-name event-mgmt-subnet-grp `
        --db-subnet-group-description "Private subnets for RDS" `
        --subnet-ids $PrivateSubnetId $PrivateSubnet2Id --region $Region
    Write-Host "Created RDS Subnet Group" -ForegroundColor Green
} catch {
    Write-Host "RDS subnet group notice: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "Provisioning Free-Tier RDS MySQL Instance (db.t3.micro, Single-AZ)..." -ForegroundColor Cyan
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

Write-Host "`n=== [Person B] SQS Queue ===" -ForegroundColor Yellow
$queue = aws sqs create-queue --queue-name event-registration-queue `
    --attributes '{\"VisibilityTimeout\":\"60\",\"MessageRetentionPeriod\":\"86400\"}' `
    --region $Region | ConvertFrom-Json
$QueueUrl = $queue.QueueUrl
$queueAttrs = aws sqs get-queue-attributes --queue-url $QueueUrl --attribute-names QueueArn --region $Region | ConvertFrom-Json
$QueueArn = $queueAttrs.Attributes.QueueArn
Write-Host "Created SQS Queue: $QueueUrl" -ForegroundColor Green

Write-Host "`n=== [Person B] S3 Flyer Storage ===" -ForegroundColor Yellow
$FlyerBucket = "event-mgmt-flyers-$AccountId"
if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket $FlyerBucket --region $Region
} else {
    aws s3api create-bucket --bucket $FlyerBucket --region $Region --create-bucket-configuration LocationConstraint=$Region
}
aws s3api put-bucket-cors --bucket $FlyerBucket --cors-configuration file://cors.json
Write-Host "Created S3 Flyer Bucket: $FlyerBucket with CORS enabled" -ForegroundColor Green

# ------------------------------------------------------------------------------
# STEP 3: PERSON C - SNS & LAMBDA WORKER
# ------------------------------------------------------------------------------
Write-Host "`n=== [Person C] SNS Topic & Subscription ===" -ForegroundColor Yellow
$topic = aws sns create-topic --name event-ticket-topic --region $Region | ConvertFrom-Json
$TopicArn = $topic.TopicArn
Write-Host "Created SNS Topic: $TopicArn" -ForegroundColor Green
aws sns subscribe --topic-arn $TopicArn --protocol email --notification-endpoint $StudentEmail --region $Region
Write-Host "Sent subscription confirmation to $StudentEmail" -ForegroundColor Green

Write-Host "`n=== [Person C] Packaging & Deploying Lambda Worker ===" -ForegroundColor Yellow
$ZipPath = Join-Path $env:TEMP "worker.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "..\lambda\worker.py" -DestinationPath $ZipPath -Force

Start-Sleep -Seconds 10

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

Write-Host "`n=== [Person C] CloudWatch Monitoring & Budget ===" -ForegroundColor Yellow
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

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " AWS INFRASTRUCTURE DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host " Account ID: $AccountId | Region: $Region" -ForegroundColor Green
Write-Host " S3 Bucket: $FlyerBucket" -ForegroundColor Green
Write-Host " SQS Queue: $QueueUrl" -ForegroundColor Green
Write-Host " SNS Topic: $TopicArn" -ForegroundColor Green
Write-Host " RDS Database: event-mgmt-db (provisioning in background)" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
