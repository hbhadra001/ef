#!/bin/bash

# Self-Serve Portal AWS Deployment Script
# This script automates the deployment of the Self-Serve Portal to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${ENVIRONMENT:-dev}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="self-serve-portal"

echo -e "${BLUE}🚀 Starting deployment of Self-Serve Portal to AWS${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    exit 1
fi
print_status "AWS CLI is installed"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi
print_status "AWS credentials are configured"

# Check CDK
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Run 'npm install -g aws-cdk'"
    exit 1
fi
print_status "AWS CDK is installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
print_status "Docker is installed"

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_status "AWS Account ID: ${AWS_ACCOUNT_ID}"

# Step 1: Bootstrap CDK (if needed)
echo -e "\n${BLUE}🏗️  Step 1: CDK Bootstrap${NC}"
cd infrastructure/cdk

if ! cdk bootstrap aws://${AWS_ACCOUNT_ID}/${AWS_REGION} 2>/dev/null; then
    print_warning "CDK bootstrap may have already been done or failed"
else
    print_status "CDK bootstrap completed"
fi

# Step 2: Deploy Infrastructure
echo -e "\n${BLUE}🏗️  Step 2: Deploying Infrastructure${NC}"
print_status "Reviewing infrastructure changes..."

# Show diff
echo -e "${YELLOW}Infrastructure changes:${NC}"
ENVIRONMENT=${ENVIRONMENT} cdk diff || true

echo -e "\n${YELLOW}Deploying infrastructure stack...${NC}"
if ENVIRONMENT=${ENVIRONMENT} cdk deploy --require-approval never; then
    print_status "Infrastructure deployed successfully"
else
    print_error "Infrastructure deployment failed"
    exit 1
fi

# Get stack outputs
echo -e "\n${BLUE}📊 Getting stack outputs...${NC}"
STACK_NAME="SelfServePortal-${ENVIRONMENT}"

# Get ECR repository URIs
FRONTEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='FrontendECRRepository'].OutputValue" \
    --output text 2>/dev/null || echo "")

BACKEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='BackendECRRepository'].OutputValue" \
    --output text 2>/dev/null || echo "")

if [[ -z "$FRONTEND_REPO" || -z "$BACKEND_REPO" ]]; then
    print_error "Could not retrieve ECR repository URIs from stack outputs"
    exit 1
fi

print_status "Frontend ECR Repository: ${FRONTEND_REPO}"
print_status "Backend ECR Repository: ${BACKEND_REPO}"

# Step 3: Build and Push Docker Images
echo -e "\n${BLUE}🐳 Step 3: Building and Pushing Docker Images${NC}"
cd ../..

# Login to ECR
print_status "Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push frontend image
echo -e "\n${YELLOW}Building frontend image...${NC}"
docker build -f Dockerfile.frontend -t ${PROJECT_NAME}-frontend .
docker tag ${PROJECT_NAME}-frontend:latest ${FRONTEND_REPO}:latest
docker tag ${PROJECT_NAME}-frontend:latest ${FRONTEND_REPO}:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

print_status "Pushing frontend image..."
docker push ${FRONTEND_REPO}:latest
docker push ${FRONTEND_REPO}:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Build and push backend image
echo -e "\n${YELLOW}Building backend image...${NC}"
docker build -f Dockerfile.backend -t ${PROJECT_NAME}-backend .
docker tag ${PROJECT_NAME}-backend:latest ${BACKEND_REPO}:latest
docker tag ${PROJECT_NAME}-backend:latest ${BACKEND_REPO}:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

print_status "Pushing backend image..."
docker push ${BACKEND_REPO}:latest
docker push ${BACKEND_REPO}:$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Step 4: Deploy Application Services
echo -e "\n${BLUE}🚀 Step 4: Deploying Application Services${NC}"

# Update ECS services to use new images
CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
FRONTEND_SERVICE="${PROJECT_NAME}-frontend-${ENVIRONMENT}"
BACKEND_SERVICE="${PROJECT_NAME}-backend-${ENVIRONMENT}"

print_status "Updating backend service..."
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${BACKEND_SERVICE} \
    --force-new-deployment > /dev/null

print_status "Updating frontend service..."
aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${FRONTEND_SERVICE} \
    --force-new-deployment > /dev/null

# Wait for services to stabilize
echo -e "\n${YELLOW}Waiting for services to stabilize...${NC}"
print_status "Waiting for backend service..."
aws ecs wait services-stable \
    --cluster ${CLUSTER_NAME} \
    --services ${BACKEND_SERVICE}

print_status "Waiting for frontend service..."
aws ecs wait services-stable \
    --cluster ${CLUSTER_NAME} \
    --services ${FRONTEND_SERVICE}

# Step 5: Get Application URLs
echo -e "\n${BLUE}🌐 Step 5: Getting Application URLs${NC}"

# Get frontend ALB DNS name
FRONTEND_ALB_NAME="SelfServePortal-${ENVIRONMENT}-FrontendService"
FRONTEND_URL=$(aws elbv2 describe-load-balancers \
    --names ${FRONTEND_ALB_NAME} \
    --query 'LoadBalancers[0].DNSName' \
    --output text 2>/dev/null || echo "Not found")

# Get API Gateway URL
API_GATEWAY_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" \
    --output text 2>/dev/null || echo "Not found")

# Step 6: Run Health Checks
echo -e "\n${BLUE}🏥 Step 6: Running Health Checks${NC}"

if [[ "$FRONTEND_URL" != "Not found" ]]; then
    print_status "Frontend URL: http://${FRONTEND_URL}"
    
    # Wait a bit for ALB to be ready
    sleep 30
    
    # Test frontend health
    if curl -f -s "http://${FRONTEND_URL}/health" > /dev/null; then
        print_status "Frontend health check passed"
    else
        print_warning "Frontend health check failed (may need more time to start)"
    fi
    
    # Test API through frontend proxy
    if curl -f -s "http://${FRONTEND_URL}/api/health" > /dev/null; then
        print_status "Backend API health check passed"
    else
        print_warning "Backend API health check failed (may need more time to start)"
    fi
else
    print_warning "Could not retrieve frontend URL"
fi

if [[ "$API_GATEWAY_URL" != "Not found" ]]; then
    print_status "API Gateway URL: ${API_GATEWAY_URL}"
    
    # Test API Gateway
    if curl -f -s "${API_GATEWAY_URL}/health" > /dev/null; then
        print_status "API Gateway health check passed"
    else
        print_warning "API Gateway health check failed"
    fi
else
    print_warning "Could not retrieve API Gateway URL"
fi

# Final Summary
echo -e "\n${GREEN}🎉 Deployment Summary${NC}"
echo -e "${GREEN}===================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "AWS Region: ${AWS_REGION}"
echo -e "AWS Account: ${AWS_ACCOUNT_ID}"
if [[ "$FRONTEND_URL" != "Not found" ]]; then
    echo -e "Frontend URL: http://${FRONTEND_URL}"
fi
if [[ "$API_GATEWAY_URL" != "Not found" ]]; then
    echo -e "API Gateway URL: ${API_GATEWAY_URL}"
fi

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo -e "1. Access the application using the Frontend URL"
echo -e "2. Create an admin user via the registration API"
echo -e "3. Configure custom domain (optional)"
echo -e "4. Set up monitoring and alerts"
echo -e "5. Configure backup and disaster recovery"

echo -e "\n${BLUE}🔧 Useful Commands:${NC}"
echo -e "View logs: aws logs tail /ecs/${PROJECT_NAME}-backend-${ENVIRONMENT} --follow"
echo -e "Check services: aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${BACKEND_SERVICE} ${FRONTEND_SERVICE}"
echo -e "Redeploy: ./deploy.sh"
echo -e "Destroy: cd infrastructure/cdk && ENVIRONMENT=${ENVIRONMENT} cdk destroy"