```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
AWS_REGION=ap-northeast-1
CONTAINER_NAME=bastion
REPO_URL=$AWS_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $REPO_URL
docker build -f Dockerfile -t $CONTAINER_NAME:latest .
docker tag $CONTAINER_NAME:latest $REPO_URL/$CONTAINER_NAME:latest
docker push $REPO_URL/$CONTAINER_NAME:latest
```
