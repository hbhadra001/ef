# Self-Serve Web Portal

A modern, scalable self-serve portal built with Angular frontend, Node.js backend, and deployed on AWS using Fargate, API Gateway, and DynamoDB.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Angular SPA   │    │   API Gateway    │    │  Node.js API    │
│   (Frontend)    │◄──►│   (Public)       │◄──►│   (Backend)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  NGINX + ALB    │    │   VPC Link       │    │   DynamoDB      │
│  (Load Balancer)│    │   (Private)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│  ECS Fargate    │
│  (Container)    │
└─────────────────┘
```

## 🚀 Features

### Frontend (Angular 19)
- **Modern UI**: Responsive design with Bootstrap 5
- **Component Architecture**: Modular, reusable components
- **Routing**: Client-side routing with lazy loading
- **State Management**: Service-based state management
- **Authentication**: JWT-based authentication
- **Form Handling**: Dynamic form generation and validation

### Backend (Node.js/Express)
- **RESTful API**: Clean, documented API endpoints
- **Authentication**: JWT token-based authentication
- **Authorization**: Role-based access control (User, Manager, Admin)
- **Validation**: Request validation with Joi schemas
- **Security**: Rate limiting, CORS, security headers
- **Database**: DynamoDB integration with AWS SDK

### Infrastructure (AWS)
- **Containerization**: Docker containers on ECS Fargate
- **Load Balancing**: Application Load Balancer (ALB)
- **API Management**: API Gateway with VPC Link
- **Database**: DynamoDB with GSI for efficient queries
- **Security**: VPC, Security Groups, IAM roles
- **Monitoring**: CloudWatch logs and metrics

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- AWS CLI configured
- AWS CDK CLI installed
- Git

## 🛠️ Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd self-serve-portal
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Start Development Servers

#### Option A: Using Docker Compose (Recommended)
```bash
docker-compose up --build
```

#### Option B: Manual Setup
```bash
# Terminal 1: Start backend API
cd backend
npm run dev

# Terminal 2: Start frontend
npm start
```

### 5. Access the Application
- Frontend: http://localhost:4200
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

## 🧪 Testing

### Frontend Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Test coverage
npm run test:coverage
```

### Backend Tests
```bash
cd backend
npm run test
npm run test:coverage
```

### Linting
```bash
# Frontend
npm run lint

# Backend
cd backend
npm run lint
```

## 🐳 Docker Deployment

### Build Images
```bash
# Frontend
docker build -f Dockerfile.frontend -t self-serve-frontend .

# Backend
docker build -f Dockerfile.backend -t self-serve-backend .
```

### Run with Docker Compose
```bash
docker-compose up -d
```

## ☁️ AWS Deployment

### Prerequisites
1. AWS CLI configured with appropriate permissions
2. AWS CDK installed: `npm install -g aws-cdk`
3. Docker for building and pushing images

### 1. Deploy Infrastructure
```bash
cd infrastructure/cdk
npm install
cdk bootstrap  # First time only
cdk deploy
```

### 2. Build and Push Images
```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push frontend
docker build -f Dockerfile.frontend -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/self-serve-portal-frontend-prod:latest .
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/self-serve-portal-frontend-prod:latest

# Build and push backend
docker build -f Dockerfile.backend -t <account-id>.dkr.ecr.us-east-1.amazonaws.com/self-serve-portal-backend-prod:latest .
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/self-serve-portal-backend-prod:latest
```

### 3. Update ECS Services
```bash
aws ecs update-service --cluster self-serve-portal-prod --service self-serve-frontend-prod --force-new-deployment
aws ecs update-service --cluster self-serve-portal-prod --service self-serve-backend-prod --force-new-deployment
```

## 🔄 CI/CD Pipeline

The project includes a comprehensive GitHub Actions pipeline that:

1. **Tests**: Runs unit tests and linting for both frontend and backend
2. **Security**: Performs vulnerability scanning with Trivy
3. **Build**: Creates Docker images and pushes to ECR
4. **Deploy**: Updates AWS infrastructure and deploys applications
5. **Verify**: Runs smoke tests to ensure deployment success

### Required GitHub Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SLACK_WEBHOOK_URL (optional)
```

### Deployment Branches
- `main` → Production environment
- `develop` → Development environment

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Service Endpoints
- `GET /api/services` - Get all active services
- `GET /api/services/:id` - Get service by ID
- `POST /api/services` - Create service (Admin only)
- `PUT /api/services/:id` - Update service (Admin only)
- `DELETE /api/services/:id` - Delete service (Admin only)

### Request Endpoints
- `GET /api/requests/my` - Get user's requests
- `GET /api/requests/my/stats` - Get user's statistics
- `GET /api/requests` - Get all requests (Manager/Admin)
- `GET /api/requests/:id` - Get request by ID
- `POST /api/requests` - Create new request
- `PATCH /api/requests/:id/status` - Update request status
- `POST /api/requests/:id/comments` - Add comment to request

### User Management Endpoints
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

## 🔐 Security Features

- **Authentication**: JWT-based with secure token storage
- **Authorization**: Role-based access control
- **Rate Limiting**: API endpoint protection
- **CORS**: Configured for secure cross-origin requests
- **Security Headers**: Comprehensive security headers via NGINX
- **Input Validation**: Server-side validation with Joi
- **SQL Injection Protection**: NoSQL database (DynamoDB)
- **Container Security**: Non-root user, minimal base images

## 🏗️ Project Structure

```
self-serve-portal/
├── src/                          # Angular frontend source
│   ├── app/
│   │   ├── components/          # Angular components
│   │   ├── services/            # Angular services
│   │   ├── interfaces/          # TypeScript interfaces
│   │   └── app.routes.ts        # Routing configuration
│   ├── assets/                  # Static assets
│   └── styles.scss             # Global styles
├── backend/                     # Node.js backend
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   ├── middleware/         # Express middleware
│   │   ├── models/             # Data models
│   │   ├── routes/             # API routes
│   │   ├── utils/              # Utility functions
│   │   └── server.js           # Express server
│   └── package.json
├── infrastructure/              # AWS CDK infrastructure
│   └── cdk/
│       ├── lib/                # CDK stack definitions
│       ├── app.ts              # CDK app entry point
│       └── package.json
├── nginx/                      # NGINX configuration
│   ├── nginx.conf
│   └── conf.d/
├── .github/workflows/          # CI/CD pipeline
├── docker-compose.yml          # Local development
├── Dockerfile.frontend         # Frontend container
├── Dockerfile.backend          # Backend container
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📝 Environment Variables

### Backend (.env)
```bash
NODE_ENV=development
PORT=3001
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_USERS_TABLE=self-serve-users
DYNAMODB_SERVICES_TABLE=self-serve-services
DYNAMODB_REQUESTS_TABLE=self-serve-requests
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:4200
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3001 and 4200 are available
2. **AWS credentials**: Verify AWS CLI is configured correctly
3. **Docker issues**: Ensure Docker daemon is running
4. **Build failures**: Clear node_modules and reinstall dependencies

### Logs
```bash
# Docker logs
docker-compose logs -f

# AWS ECS logs
aws logs tail /ecs/self-serve-portal-backend-prod --follow

# Local backend logs
tail -f backend/server.log
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

---

**Built with ❤️ using Angular, Node.js, and AWS**
