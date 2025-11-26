# Deployment Guide

This guide provides step-by-step instructions for deploying the Self-Serve Portal to AWS.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18+** and npm
4. **Docker** installed and running
5. **AWS CDK** installed globally: `npm install -g aws-cdk`
6. **Git** for version control

## Required AWS Permissions

Your AWS user/role needs the following permissions:
- EC2 (VPC, Security Groups, Load Balancers)
- ECS (Clusters, Services, Tasks)
- ECR (Repositories, Images)
- DynamoDB (Tables, Indexes)
- API Gateway (APIs, Deployments)
- IAM (Roles, Policies)
- CloudWatch (Logs, Metrics)
- Secrets Manager (Secrets)

## Step 1: Environment Setup

### 1.1 Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region, and Output format
```

### 1.2 Verify AWS Configuration
```bash
aws sts get-caller-identity
```

### 1.3 Set Environment Variables
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1  # or your preferred region
export ENVIRONMENT=prod      # or 'dev' for development
```

## Step 2: Infrastructure Deployment

### 2.1 Install CDK Dependencies
```bash
cd infrastructure/cdk
npm install
```

### 2.2 Bootstrap CDK (First Time Only)
```bash
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

### 2.3 Review Infrastructure Changes
```bash
ENVIRONMENT=$ENVIRONMENT cdk diff
```

### 2.4 Deploy Infrastructure
```bash
ENVIRONMENT=$ENVIRONMENT cdk deploy --require-approval never
```

This will create:
- VPC with public and private subnets
- DynamoDB tables for users, services, and requests
- ECR repositories for frontend and backend images
- ECS cluster and task definitions
- Application Load Balancers
- API Gateway with VPC Link
- IAM roles and security groups
- CloudWatch log groups

## Step 3: Build and Push Docker Images

### 3.1 Get ECR Login Token
```bash
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

### 3.2 Build Frontend Image
```bash
cd /path/to/project
docker build -f Dockerfile.frontend -t self-serve-frontend .
docker tag self-serve-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/self-serve-portal-frontend-$ENVIRONMENT:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/self-serve-portal-frontend-$ENVIRONMENT:latest
```

### 3.3 Build Backend Image
```bash
docker build -f Dockerfile.backend -t self-serve-backend .
docker tag self-serve-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/self-serve-portal-backend-$ENVIRONMENT:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/self-serve-portal-backend-$ENVIRONMENT:latest
```

## Step 4: Deploy Application Services

### 4.1 Update ECS Services
```bash
# Update backend service
aws ecs update-service \
  --cluster self-serve-portal-$ENVIRONMENT \
  --service self-serve-backend-$ENVIRONMENT \
  --force-new-deployment

# Update frontend service
aws ecs update-service \
  --cluster self-serve-portal-$ENVIRONMENT \
  --service self-serve-frontend-$ENVIRONMENT \
  --force-new-deployment
```

### 4.2 Wait for Deployment to Complete
```bash
# Wait for backend service
aws ecs wait services-stable \
  --cluster self-serve-portal-$ENVIRONMENT \
  --services self-serve-backend-$ENVIRONMENT

# Wait for frontend service
aws ecs wait services-stable \
  --cluster self-serve-portal-$ENVIRONMENT \
  --services self-serve-frontend-$ENVIRONMENT
```

## Step 5: Verify Deployment

### 5.1 Get Application URLs
```bash
# Get frontend ALB DNS name
FRONTEND_URL=$(aws elbv2 describe-load-balancers \
  --names SelfServePortal-$ENVIRONMENT-FrontendService \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Get API Gateway URL
API_URL=$(aws apigateway get-rest-apis \
  --query "items[?name=='self-serve-portal-api-$ENVIRONMENT'].id" \
  --output text)
API_GATEWAY_URL="https://$API_URL.execute-api.$AWS_REGION.amazonaws.com/$ENVIRONMENT"

echo "Frontend URL: http://$FRONTEND_URL"
echo "API Gateway URL: $API_GATEWAY_URL"
```

### 5.2 Run Health Checks
```bash
# Test frontend health
curl -f http://$FRONTEND_URL/health

# Test API health through frontend proxy
curl -f http://$FRONTEND_URL/api/health

# Test API Gateway directly
curl -f $API_GATEWAY_URL/health

# Test services endpoint
curl -f http://$FRONTEND_URL/api/services
```

## Step 6: Initial Data Setup

### 6.1 Create Admin User (Optional)
You can create an initial admin user by calling the registration API:

```bash
curl -X POST http://$FRONTEND_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "department": "IT",
    "role": "admin"
  }'
```

### 6.2 Create Sample Services (Optional)
```bash
# First, login to get JWT token
TOKEN=$(curl -X POST http://$FRONTEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!"
  }' | jq -r '.token')

# Create a sample service
curl -X POST http://$FRONTEND_URL/api/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "New Laptop Request",
    "description": "Request a new laptop for work",
    "category": "Hardware",
    "icon": "bi-laptop",
    "formFields": [
      {
        "name": "laptopType",
        "label": "Laptop Type",
        "type": "select",
        "required": true,
        "options": ["MacBook Pro", "MacBook Air", "Dell XPS", "ThinkPad"]
      }
    ],
    "approvalRequired": true,
    "estimatedTime": "3-5 business days"
  }'
```

## Step 7: Configure Custom Domain (Optional)

### 7.1 Create SSL Certificate
```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name your-domain.com \
  --validation-method DNS \
  --region $AWS_REGION
```

### 7.2 Update ALB with SSL Certificate
After certificate validation, update the ALB listener to use HTTPS.

### 7.3 Configure Route 53 (if using)
Create A records pointing to your ALB DNS names.

## Step 8: Monitoring and Logging

### 8.1 View CloudWatch Logs
```bash
# Backend logs
aws logs tail /ecs/self-serve-portal-backend-$ENVIRONMENT --follow

# Frontend logs
aws logs tail /ecs/self-serve-portal-frontend-$ENVIRONMENT --follow
```

### 8.2 Monitor ECS Services
```bash
# Check service status
aws ecs describe-services \
  --cluster self-serve-portal-$ENVIRONMENT \
  --services self-serve-backend-$ENVIRONMENT self-serve-frontend-$ENVIRONMENT
```

## Troubleshooting

### Common Issues

1. **ECS Tasks Failing to Start**
   - Check CloudWatch logs for error messages
   - Verify ECR images are pushed correctly
   - Check IAM permissions for task roles

2. **ALB Health Check Failures**
   - Verify application is listening on correct port
   - Check security group rules
   - Ensure health check endpoint returns 200

3. **API Gateway 5xx Errors**
   - Check VPC Link configuration
   - Verify backend ALB is accessible from API Gateway
   - Check backend service logs

4. **DynamoDB Access Issues**
   - Verify IAM permissions for task role
   - Check AWS region configuration
   - Ensure table names match environment variables

### Useful Commands

```bash
# Check ECS task logs
aws ecs describe-tasks \
  --cluster self-serve-portal-$ENVIRONMENT \
  --tasks $(aws ecs list-tasks --cluster self-serve-portal-$ENVIRONMENT --query 'taskArns[0]' --output text)

# Restart ECS service
aws ecs update-service \
  --cluster self-serve-portal-$ENVIRONMENT \
  --service self-serve-backend-$ENVIRONMENT \
  --force-new-deployment

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups --names SelfServePortal-$ENVIRONMENT-BackendService --query 'TargetGroups[0].TargetGroupArn' --output text)
```

## Cleanup

To remove all resources:

```bash
# Delete CDK stack
cd infrastructure/cdk
ENVIRONMENT=$ENVIRONMENT cdk destroy

# Delete ECR images (optional)
aws ecr batch-delete-image \
  --repository-name self-serve-portal-frontend-$ENVIRONMENT \
  --image-ids imageTag=latest

aws ecr batch-delete-image \
  --repository-name self-serve-portal-backend-$ENVIRONMENT \
  --image-ids imageTag=latest
```

## Security Considerations

1. **Secrets Management**: JWT secrets are stored in AWS Secrets Manager
2. **Network Security**: Backend services run in private subnets
3. **Access Control**: API endpoints have role-based authorization
4. **Data Encryption**: DynamoDB tables use AWS managed encryption
5. **Container Security**: Docker images run as non-root users

## Cost Optimization

1. **Use Fargate Spot** for non-production environments
2. **Configure Auto Scaling** based on CPU/memory utilization
3. **Use DynamoDB On-Demand** billing for variable workloads
4. **Set up CloudWatch Alarms** for cost monitoring
5. **Regular cleanup** of unused ECR images

---

For additional support, refer to the main README.md or create an issue in the repository.