#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SelfServePortalStack } from './lib/self-serve-portal-stack';

const app = new cdk.App();

// Get environment configuration
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

// Create the main stack
new SelfServePortalStack(app, `SelfServePortal-${environment}`, {
  env: {
    account,
    region,
  },
  environment,
  description: `Self-Serve Portal infrastructure for ${environment} environment`,
  tags: {
    Project: 'SelfServePortal',
    Environment: environment,
    ManagedBy: 'CDK',
  },
});