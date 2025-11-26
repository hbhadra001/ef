# 🚀 Complete Self-Serve Portal Setup Guide

Since direct download isn't available, here's how to recreate the **complete project** on your Mac.

## 📁 Step 1: Create Directory Structure

Run these commands in Terminal on your Mac:

```bash
# Create main project directory
mkdir -p ~/self-serve-portal
cd ~/self-serve-portal

# Create all subdirectories
mkdir -p src/app/{components/{dashboard,service-catalog,request-form,user-profile,navigation},services,interfaces}
mkdir -p backend/src/{config,controllers,middleware,models,routes,utils}
mkdir -p infrastructure/cdk/{lib,bin}
mkdir -p nginx/conf.d
mkdir -p .github/workflows
mkdir -p public

echo "✅ Directory structure created!"
```

## 📄 Step 2: Create Root Configuration Files

### package.json (Root)
```json
{
  "name": "self-serve-portal",
  "version": "1.0.0",
  "description": "Enterprise Self-Serve Web Portal with Angular 19, Node.js API, and AWS Fargate deployment",
  "scripts": {
    "ng": "ng",
    "start": "ng serve --host 0.0.0.0 --port 4200",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "npm start",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up",
    "docker:down": "docker-compose down",
    "deploy:aws": "./deploy.sh",
    "lint": "ng lint"
  },
  "dependencies": {
    "@angular/animations": "^19.0.0",
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/forms": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "@angular/router": "^19.0.0",
    "bootstrap": "^5.3.2",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.2"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^19.0.0",
    "@angular/cli": "^19.0.0",
    "@angular/compiler-cli": "^19.0.0",
    "@types/jasmine": "~5.1.0",
    "@types/node": "^18.18.0",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-headless": "~3.1.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "typescript": "~5.6.0"
  },
  "keywords": [
    "angular",
    "nodejs",
    "aws",
    "fargate",
    "self-serve",
    "portal",
    "enterprise"
  ],
  "author": "Self-Serve Portal Team",
  "license": "MIT"
}
```

### angular.json
```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "self-serve-portal": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "scss"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/self-serve-portal",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": [],
            "tsConfig": "tsconfig.app.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "node_modules/bootstrap/dist/css/bootstrap.min.css",
              "src/styles.scss"
            ],
            "scripts": [
              "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"
            ]
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "2kb",
                  "maximumError": "4kb"
                }
              ],
              "outputHashing": "all"
            },
            "development": {
              "buildOptimizer": false,
              "optimization": false,
              "vendorChunk": true,
              "extractLicenses": false,
              "sourceMap": true,
              "namedChunks": true
            }
          },
          "defaultConfiguration": "production"
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "self-serve-portal:build:production"
            },
            "development": {
              "buildTarget": "self-serve-portal:build:development"
            }
          },
          "defaultConfiguration": "development"
        },
        "extract-i18n": {
          "builder": "@angular-devkit/build-angular:extract-i18n",
          "options": {
            "buildTarget": "self-serve-portal:build"
          }
        },
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": [],
            "tsConfig": "tsconfig.spec.json",
            "inlineStyleLanguage": "scss",
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.scss"
            ],
            "scripts": []
          }
        }
      }
    }
  }
}
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "4200:80"
    environment:
      - NODE_ENV=development
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - JWT_SECRET=dev-secret-key-change-in-production
      - CORS_ORIGIN=http://localhost:4200
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

## 🎯 Next Steps

1. **Create these files** in your project directory
2. **I'll provide the remaining files** in the next message (Angular components, backend API, etc.)
3. **Run setup commands** to get everything working

Would you like me to continue with:
- ✅ Angular frontend components (15+ files)
- ✅ Node.js backend API (20+ files) 
- ✅ AWS CDK infrastructure (10+ files)
- ✅ Docker configurations
- ✅ CI/CD pipeline
- ✅ Documentation files

This approach will give you the **exact same result** as downloading the archive!