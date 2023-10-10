#!/bin/bash

portfoward=$1

# 環境情報設定
export AWS_DEFAULT_REGION=ap-northeast-1
SUBNET_NAME=NetworkStack/VPC/private-subnetSubnet1
SG_NAME=
RDS_SECRETS_NAME=
# CLUSTER_NAME=Bastion
# TASK_DEFINITION=Bastion

# ネットワーク情報設定
SUBNET_ID=$(aws ec2 describe-subnets --filter Name=tag-key,Values=Name Name=tag-value,Values=$SUBNET_NAME | jq -r '.Subnets[0].SubnetId')
# SG_ID=$(aws ec2 describe-security-groups --filter Name=tag-key,Values=Name Name=tag-value,Values=$SG_NAME | jq -r '.SecurityGroups[0].GroupId')
SG_ID=$(aws cloudformation describe-stacks --stack-name NetworkStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputBastionSecurityGroupId") | .OutputValue')
CLUSTER_NAME=$(aws cloudformation describe-stacks --stack-name NetworkStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputBastionClusterName") | .OutputValue')
TASK_DEFINITION=$(aws cloudformation describe-stacks --stack-name NetworkStack | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "OutputBastionTaskDefFamily") | .OutputValue')
NETWORK_CONFIG=awsvpcConfiguration={subnets=[$SUBNET_ID],securityGroups=[$SG_ID],assignPublicIp=DISABLED}

# 踏み台コンテナを起動
echo "Running ecs bastion container..."
RESPONSE=$(aws ecs run-task \
  --cluster $CLUSTER_NAME \
  --enable-execute-command \
  --launch-type FARGATE \
  --network-configuration $NETWORK_CONFIG \
  --propagate-tags TASK_DEFINITION \
  --task-definition $TASK_DEFINITION)

TASK_ID=$(echo $RESPONSE | jq -r '.tasks[0].taskArn' | awk -F'[/]' '{print $3}')

# 起動したタスクの情報を取得
TASK_INFO=$(aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ID)
TASK_STATUS=$(echo $TASK_INFO | jq -r '.tasks[0].lastStatus')
RUNTIME_ID=$(echo $TASK_INFO | jq -r '.tasks[0].containers[0].runtimeId')

# コンテナが起動するまで待機
while [ $TASK_STATUS != "RUNNING" ]
do
  sleep 10
  TASK_INFO=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks  $TASK_ID)
  TASK_STATUS=$(echo $TASK_INFO | jq -r '.tasks[0].lastStatus')
  RUNTIME_ID=$(echo $TASK_INFO | jq -r '.tasks[0].containers[0].runtimeId')
  echo "Waiting for container status is running..."
done

# 直ぐに開始するとエラーになるため待機
sleep 5

if [ "$portfoward" == "database" ]; then
  # RDSシークレットを取得
  SECRET_VALUES=$(aws secretsmanager get-secret-value --secret-id $RDS_SECRETS_NAME --query 'SecretString' --output text | jq -r)
  DB_HOST=$(echo $SECRET_VALUES | jq -r '.host')
  # データベースのポートフォワーディング開始
  aws ssm start-session \
    --target ecs:${CLUSTER_NAME}_${TASK_ID}_${RUNTIME_ID} \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "host=$DB_HOST,portNumber=3306,localPortNumber=13306"
else
  # コンテナへ接続
  aws ssm start-session --target ecs:${CLUSTER_NAME}_${TASK_ID}_${RUNTIME_ID}
fi
