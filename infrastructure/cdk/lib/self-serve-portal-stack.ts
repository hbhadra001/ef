import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SelfServePortalStackProps extends cdk.StackProps {
  environment: string;
}

export class SelfServePortalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SelfServePortalStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // VPC for the application
    const vpc = new ec2.Vpc(this, 'SelfServeVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `self-serve-users-${environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for email lookup
    usersTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    const servicesTable = new dynamodb.Table(this, 'ServicesTable', {
      tableName: `self-serve-services-${environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for category filtering
    servicesTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
    });

    const requestsTable = new dynamodb.Table(this, 'RequestsTable', {
      tableName: `self-serve-requests-${environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for user requests lookup
    requestsTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for status filtering
    requestsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'submittedAt', type: dynamodb.AttributeType.STRING },
    });

    // JWT Secret in Secrets Manager
    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: `self-serve-portal/jwt-secret-${environment}`,
      description: 'JWT secret for Self-Serve Portal authentication',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 64,
      },
    });

    // ECR Repositories
    const frontendRepo = new ecr.Repository(this, 'FrontendRepository', {
      repositoryName: `self-serve-portal-frontend-${environment}`,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    });

    const backendRepo = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: `self-serve-portal-backend-${environment}`,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          maxImageCount: 10,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'SelfServeCluster', {
      clusterName: `self-serve-portal-${environment}`,
      vpc,
      containerInsights: true,
    });

    // Task execution role
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task role for backend service
    const backendTaskRole = new iam.Role(this, 'BackendTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant DynamoDB permissions to backend task role
    usersTable.grantReadWriteData(backendTaskRole);
    servicesTable.grantReadWriteData(backendTaskRole);
    requestsTable.grantReadWriteData(backendTaskRole);

    // Grant Secrets Manager permissions
    jwtSecret.grantRead(backendTaskRole);

    // CloudWatch Log Groups
    const backendLogGroup = new logs.LogGroup(this, 'BackendLogGroup', {
      logGroupName: `/ecs/self-serve-portal-backend-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const frontendLogGroup = new logs.LogGroup(this, 'FrontendLogGroup', {
      logGroupName: `/ecs/self-serve-portal-frontend-${environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Backend Fargate Service
    const backendService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'BackendService', {
      cluster,
      serviceName: `self-serve-backend-${environment}`,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: environment === 'prod' ? 2 : 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(backendRepo, 'latest'),
        containerPort: 3001,
        taskRole: backendTaskRole,
        executionRole: taskExecutionRole,
        environment: {
          NODE_ENV: 'production',
          PORT: '3001',
          AWS_REGION: this.region,
          DYNAMODB_USERS_TABLE: usersTable.tableName,
          DYNAMODB_SERVICES_TABLE: servicesTable.tableName,
          DYNAMODB_REQUESTS_TABLE: requestsTable.tableName,
          CORS_ORIGIN: '*',
          RATE_LIMIT_WINDOW_MS: '900000',
          RATE_LIMIT_MAX_REQUESTS: '100',
        },
        secrets: {
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret, 'password'),
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'backend',
          logGroup: backendLogGroup,
        }),
      },
      publicLoadBalancer: false,
      listenerPort: 3001,
    });

    // Configure health check
    backendService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Frontend Fargate Service
    const frontendService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FrontendService', {
      cluster,
      serviceName: `self-serve-frontend-${environment}`,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: environment === 'prod' ? 2 : 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(frontendRepo, 'latest'),
        containerPort: 80,
        executionRole: taskExecutionRole,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'frontend',
          logGroup: frontendLogGroup,
        }),
      },
      publicLoadBalancer: true,
      listenerPort: 80,
    });

    // Configure health check for frontend
    frontendService.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // API Gateway for backend service
    const api = new apigateway.RestApi(this, 'SelfServeAPI', {
      restApiName: `self-serve-portal-api-${environment}`,
      description: 'API Gateway for Self-Serve Portal',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
      },
      deployOptions: {
        stageName: environment,
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // VPC Link for private ALB
    const vpcLink = new apigateway.VpcLink(this, 'VpcLink', {
      targets: [backendService.loadBalancer as any], // Type assertion for ALB compatibility
      vpcLinkName: `self-serve-portal-vpc-link-${environment}`,
    });

    // API Gateway integration with backend ALB
    const integration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      uri: `http://${backendService.loadBalancer.loadBalancerDnsName}:3001/{proxy}`,
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink,
        requestParameters: {
          'integration.request.path.proxy': 'method.request.path.proxy',
        },
      },
    });

    // Add proxy resource to API Gateway
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', integration, {
      requestParameters: {
        'method.request.path.proxy': true,
      },
    });

    // Add root method
    api.root.addMethod('ANY', integration);

    // Outputs
    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `http://${frontendService.loadBalancer.loadBalancerDnsName}`,
      description: 'Frontend Application URL',
    });

    new cdk.CfnOutput(this, 'BackendURL', {
      value: `http://${backendService.loadBalancer.loadBalancerDnsName}:3001`,
      description: 'Backend API URL (internal)',
    });

    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'FrontendECRRepository', {
      value: frontendRepo.repositoryUri,
      description: 'Frontend ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'BackendECRRepository', {
      value: backendRepo.repositoryUri,
      description: 'Backend ECR Repository URI',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'DynamoDB Users Table Name',
    });

    new cdk.CfnOutput(this, 'ServicesTableName', {
      value: servicesTable.tableName,
      description: 'DynamoDB Services Table Name',
    });

    new cdk.CfnOutput(this, 'RequestsTableName', {
      value: requestsTable.tableName,
      description: 'DynamoDB Requests Table Name',
    });
  }
}