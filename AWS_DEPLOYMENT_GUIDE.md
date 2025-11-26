# AWS Deployment Guide for Self-Serve Portal

## 🚀 Quick Deployment

To deploy the Self-Serve Portal to AWS, follow these steps:

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed and running
4. **Node.js 18+** and npm
5. **Git** for version control

### Step 1: Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

### Step 2: Set Environment Variables

```bash
export AWS_REGION=us-east-1        # Your preferred region
export ENVIRONMENT=dev             # or 'prod' for production
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

### Step 3: Run the Deployment Script

```bash
# Make the deployment script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

The deployment script will:
1. ✅ Check prerequisites
2. 🏗️ Bootstrap CDK (if needed)
3. 🏗️ Deploy infrastructure
4. 🐳 Build and push Docker images
5. 🚀 Deploy application services
6. 🏥 Run health checks

## 📋 Manual Deployment Steps

If you prefer to run the deployment manually:

### 1. Install Dependencies

```bash
# Install AWS CDK globally
npm install -g aws-cdk

# Install CDK dependencies
cd infrastructure/cdk
npm install
cd ../..
```

### 2. Bootstrap CDK

```bash
# Bootstrap CDK (first time only)
cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
```

### 3. Deploy Infrastructure

```bash
cd infrastructure/cdk

# Review changes
ENVIRONMENT=$ENVIRONMENT cdk diff

# Deploy infrastructure
ENVIRONMENT=$ENVIRONMENT cdk deploy --require-approval never
```

### 4. Build and Push Docker Images

```bash
cd ../..

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Get ECR repository URIs from CloudFormation outputs
FRONTEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name SelfServePortal-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendECRRepository'].OutputValue" \
    --output text)

BACKEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name SelfServePortal-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='BackendECRRepository'].OutputValue" \
    --output text)

# Build and push frontend
docker build -f Dockerfile.frontend -t self-serve-frontend .
docker tag self-serve-frontend:latest $FRONTEND_REPO:latest
docker push $FRONTEND_REPO:latest

# Build and push backend
docker build -f Dockerfile.backend -t self-serve-backend .
docker tag self-serve-backend:latest $BACKEND_REPO:latest
docker push $BACKEND_REPO:latest
```

### 5. Update ECS Services

```bash
# Update services to use new images
aws ecs update-service \
    --cluster self-serve-portal-$ENVIRONMENT \
    --service self-serve-frontend-$ENVIRONMENT \
    --force-new-deployment

aws ecs update-service \
    --cluster self-serve-portal-$ENVIRONMENT \
    --service self-serve-backend-$ENVIRONMENT \
    --force-new-deployment

# Wait for deployment to complete
aws ecs wait services-stable \
    --cluster self-serve-portal-$ENVIRONMENT \
    --services self-serve-frontend-$ENVIRONMENT self-serve-backend-$ENVIRONMENT
```

### 6. Get Application URLs

```bash
# Get frontend URL
FRONTEND_URL=$(aws elbv2 describe-load-balancers \
    --names SelfServePortal-$ENVIRONMENT-FrontendService \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# Get API Gateway URL
API_GATEWAY_URL=$(aws cloudformation describe-stacks \
    --stack-name SelfServePortal-$ENVIRONMENT \
    --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" \
    --output text)

echo "Frontend URL: http://$FRONTEND_URL"
echo "API Gateway URL: $API_GATEWAY_URL"
```

## 🏗️ Infrastructure Components

The deployment creates the following AWS resources:

### Networking
- **VPC** with public and private subnets across 2 AZs
- **Internet Gateway** and **NAT Gateway**
- **Security Groups** for ALB and ECS tasks

### Compute
- **ECS Fargate Cluster** for containerized applications
- **Application Load Balancers** for frontend and backend
- **ECS Services** with auto-scaling capabilities

### Storage
- **DynamoDB Tables** for users, services, and requests
- **Global Secondary Indexes** for efficient querying

### API Management
- **API Gateway** with VPC Link to backend
- **Custom domain support** (optional)

### Container Registry
- **ECR Repositories** for frontend and backend images
- **Lifecycle policies** for image cleanup

### Security
- **IAM Roles** with least privilege access
- **Secrets Manager** for JWT secrets
- **VPC endpoints** for secure AWS service access

### Monitoring
- **CloudWatch Log Groups** for application logs
- **CloudWatch Metrics** for monitoring

## 💰 Cost Estimation

### Development Environment (dev)
- **ECS Fargate**: ~$30-50/month (0.25 vCPU, 0.5 GB RAM per service)
- **ALB**: ~$20/month (2 load balancers)
- **DynamoDB**: ~$5-10/month (on-demand pricing)
- **API Gateway**: ~$3-5/month (1M requests)
- **NAT Gateway**: ~$45/month
- **CloudWatch**: ~$5/month
- **Total**: ~$110-135/month

### Production Environment (prod)
- **ECS Fargate**: ~$60-100/month (0.5 vCPU, 1 GB RAM per service, 2 instances)
- **ALB**: ~$20/month (2 load balancers)
- **DynamoDB**: ~$20-50/month (depends on usage)
- **API Gateway**: ~$10-20/month (depends on requests)
- **NAT Gateway**: ~$45/month
- **CloudWatch**: ~$10/month
- **Total**: ~$165-245/month

## 🔧 Configuration Options

### Environment Variables

The following environment variables can be configured:

```bash
# Deployment Configuration
export ENVIRONMENT=dev              # dev, staging, prod
export AWS_REGION=us-east-1        # AWS region
export PROJECT_NAME=self-serve-portal

# Application Configuration
export CORS_ORIGIN=*               # CORS origin for API
export JWT_EXPIRES_IN=24h          # JWT token expiration
export RATE_LIMIT_MAX_REQUESTS=100 # API rate limit
```

### Scaling Configuration

Modify the CDK stack to adjust scaling parameters:

```typescript
// In lib/self-serve-portal-stack.ts
desiredCount: environment === 'prod' ? 2 : 1,  // Number of tasks
cpu: 512,                                       // CPU units
memoryLimitMiB: 1024,                          // Memory in MB
```

## 🔒 Security Best Practices

### 1. Network Security
- Backend services run in private subnets
- API Gateway provides public access with VPC Link
- Security groups restrict traffic to necessary ports

### 2. Data Security
- DynamoDB tables encrypted at rest
- JWT secrets stored in AWS Secrets Manager
- HTTPS termination at load balancer

### 3. Access Control
- IAM roles with minimal required permissions
- Role-based access control in application
- API rate limiting and throttling

### 4. Container Security
- Docker images run as non-root user
- Regular security scanning with Trivy
- Minimal base images (Alpine Linux)

## 📊 Monitoring and Logging

### CloudWatch Logs
```bash
# View backend logs
aws logs tail /ecs/self-serve-portal-backend-$ENVIRONMENT --follow

# View frontend logs
aws logs tail /ecs/self-serve-portal-frontend-$ENVIRONMENT --follow
```

### CloudWatch Metrics
- ECS service CPU and memory utilization
- ALB request count and response times
- DynamoDB read/write capacity utilization
- API Gateway request count and latency

### Health Checks
- ALB health checks on `/health` endpoint
- ECS service health monitoring
- API Gateway health monitoring

## 🚨 Troubleshooting

### Common Issues

1. **ECS Tasks Failing to Start**
   ```bash
   # Check task logs
   aws ecs describe-tasks --cluster self-serve-portal-$ENVIRONMENT --tasks $(aws ecs list-tasks --cluster self-serve-portal-$ENVIRONMENT --query 'taskArns[0]' --output text)
   ```

2. **ALB Health Check Failures**
   ```bash
   # Check target health
   aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names SelfServePortal-$ENVIRONMENT-BackendService --query 'TargetGroups[0].TargetGroupArn' --output text)
   ```

3. **API Gateway 5xx Errors**
   ```bash
   # Check VPC Link status
   aws apigateway get-vpc-links
   ```

### Useful Commands

```bash
# Restart services
aws ecs update-service --cluster self-serve-portal-$ENVIRONMENT --service self-serve-backend-$ENVIRONMENT --force-new-deployment

# Scale services
aws ecs update-service --cluster self-serve-portal-$ENVIRONMENT --service self-serve-backend-$ENVIRONMENT --desired-count 2

# View service status
aws ecs describe-services --cluster self-serve-portal-$ENVIRONMENT --services self-serve-backend-$ENVIRONMENT self-serve-frontend-$ENVIRONMENT
```

## 🔄 CI/CD Integration

The project includes GitHub Actions workflows for automated deployment:

### Required Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SLACK_WEBHOOK_URL (optional)
```

### Deployment Triggers
- `main` branch → Production environment
- `develop` branch → Development environment

## 🧹 Cleanup

To remove all AWS resources:

```bash
# Delete the CDK stack
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

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review CloudWatch logs for error messages
3. Verify AWS permissions and quotas
4. Create an issue in the GitHub repository

---

**Happy Deploying! 🚀**