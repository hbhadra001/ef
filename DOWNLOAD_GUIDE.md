# Download Guide - Self-Serve Portal to Mac

This guide explains how to download the complete Self-Serve Portal project to your Mac laptop.

## 📥 Method 1: Direct Download (Recommended)

### Step 1: Create a ZIP Archive
The easiest way is to download the entire project as a ZIP file.

### Step 2: Extract and Setup on Mac
```bash
# After downloading, extract the ZIP file
unzip self-serve-portal.zip
cd self-serve-portal

# Install dependencies
npm install
cd backend && npm install && cd ..
cd infrastructure/cdk && npm install && cd ../..

# Make scripts executable
chmod +x deploy.sh
```

## 🔄 Method 2: Git Repository (If you have Git)

If you want to maintain version control:

```bash
# On your Mac, clone or download the repository
# (You'll need to create a Git repository first)

# Initialize Git repository
git init
git add .
git commit -m "Initial commit: Complete Self-Serve Portal"

# Add remote repository (replace with your GitHub/GitLab URL)
git remote add origin https://github.com/yourusername/self-serve-portal.git
git push -u origin main
```

## 🛠️ Method 3: Manual File Transfer

### Step 1: Copy Project Structure
Create the following directory structure on your Mac:

```
self-serve-portal/
├── src/                          # Angular frontend
├── backend/                      # Node.js API
├── infrastructure/cdk/           # AWS CDK
├── nginx/                        # NGINX config
├── .github/workflows/            # CI/CD
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.backend
├── deploy.sh
├── package.json
├── README.md
├── DEPLOYMENT.md
├── AWS_DEPLOYMENT_GUIDE.md
└── DOWNLOAD_GUIDE.md
```

### Step 2: Copy All Files
You'll need to copy all the files from this workspace to your Mac.

## 🚀 Setup on Mac

Once you have the files on your Mac:

### 1. Install Prerequisites
```bash
# Install Node.js (if not already installed)
# Download from https://nodejs.org/ or use Homebrew:
brew install node

# Install Docker Desktop for Mac
# Download from https://www.docker.com/products/docker-desktop

# Install AWS CLI (if you plan to deploy)
brew install awscli

# Install AWS CDK
npm install -g aws-cdk
```

### 2. Install Project Dependencies
```bash
# In the project root directory
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install CDK dependencies
cd infrastructure/cdk
npm install
cd ../..
```

### 3. Start Development Environment
```bash
# Option A: Using Docker Compose (Recommended)
docker-compose up --build

# Option B: Manual startup
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm start
```

### 4. Access the Application
- Frontend: http://localhost:4200
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

## 📋 Project Files Checklist

Make sure you have all these files on your Mac:

### Frontend Files
- [ ] `src/app/` - Angular application source
- [ ] `src/assets/` - Static assets
- [ ] `src/styles.scss` - Global styles
- [ ] `angular.json` - Angular configuration
- [ ] `package.json` - Frontend dependencies
- [ ] `tsconfig.json` - TypeScript configuration

### Backend Files
- [ ] `backend/src/` - Node.js API source
- [ ] `backend/package.json` - Backend dependencies
- [ ] `backend/src/server.js` - Express server
- [ ] `backend/src/config/` - Configuration files
- [ ] `backend/src/models/` - Data models
- [ ] `backend/src/routes/` - API routes
- [ ] `backend/src/middleware/` - Express middleware

### Infrastructure Files
- [ ] `infrastructure/cdk/` - AWS CDK stack
- [ ] `infrastructure/cdk/lib/` - CDK constructs
- [ ] `infrastructure/cdk/package.json` - CDK dependencies
- [ ] `infrastructure/cdk/cdk.json` - CDK configuration
- [ ] `infrastructure/cdk/app.ts` - CDK app entry point

### Docker Files
- [ ] `Dockerfile.frontend` - Frontend container
- [ ] `Dockerfile.backend` - Backend container
- [ ] `docker-compose.yml` - Local development
- [ ] `nginx/` - NGINX configuration

### CI/CD Files
- [ ] `.github/workflows/ci-cd.yml` - GitHub Actions
- [ ] `deploy.sh` - Deployment script

### Documentation
- [ ] `README.md` - Main documentation
- [ ] `DEPLOYMENT.md` - Deployment guide
- [ ] `AWS_DEPLOYMENT_GUIDE.md` - AWS-specific guide
- [ ] `DOWNLOAD_GUIDE.md` - This file

### Configuration Files
- [ ] `.gitignore` - Git ignore rules
- [ ] `package.json` - Root package configuration
- [ ] `tsconfig.json` - TypeScript configuration

## 🔧 Troubleshooting on Mac

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Fix script permissions
   chmod +x deploy.sh
   chmod +x backend/src/server.js
   ```

2. **Node.js Version Issues**
   ```bash
   # Check Node.js version (should be 18+)
   node --version
   
   # Use nvm to manage Node.js versions
   brew install nvm
   nvm install 18
   nvm use 18
   ```

3. **Docker Issues**
   ```bash
   # Make sure Docker Desktop is running
   docker --version
   docker-compose --version
   ```

4. **Port Conflicts**
   ```bash
   # Check if ports are in use
   lsof -i :4200  # Frontend port
   lsof -i :3001  # Backend port
   
   # Kill processes if needed
   kill -9 <PID>
   ```

## 🌐 Development Workflow on Mac

### Daily Development
```bash
# Start development environment
docker-compose up

# Or start services individually
npm run dev:backend &  # Start backend
npm start              # Start frontend
```

### Testing
```bash
# Run frontend tests
npm test

# Run backend tests
cd backend && npm test

# Run linting
npm run lint
```

### Building for Production
```bash
# Build frontend
npm run build

# Build Docker images
docker build -f Dockerfile.frontend -t self-serve-frontend .
docker build -f Dockerfile.backend -t self-serve-backend .
```

## 🚀 Deploying from Mac

### AWS Deployment
```bash
# Configure AWS credentials
aws configure

# Deploy to AWS
./deploy.sh
```

### Environment Variables
Create a `.env` file in the backend directory:
```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:4200
```

## 📞 Support

If you encounter issues downloading or setting up on Mac:

1. **Check Prerequisites**: Ensure Node.js, Docker, and other tools are installed
2. **File Permissions**: Make sure all files have correct permissions
3. **Port Conflicts**: Ensure ports 3001 and 4200 are available
4. **Dependencies**: Run `npm install` in all directories with package.json

## 🎉 You're Ready!

Once you have the project on your Mac and dependencies installed, you can:

- ✅ Run the application locally
- ✅ Make modifications and improvements
- ✅ Deploy to AWS
- ✅ Set up CI/CD pipelines
- ✅ Customize for your organization's needs

Happy coding! 🚀