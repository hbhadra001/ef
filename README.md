 ┌───────────────────────────────────────────┐
 │               Internal User               │
 │      (Corporate Network / VPN Only)       │
 └───────────────────────────────────────────┘
                       │
                       ▼
 ┌───────────────────────────────────────────┐
 │                  Okta                     │
 │   (SSO, MFA, RBAC Policies, AuthZ)        │
 └───────────────────────────────────────────┘
                       │ (OIDC/SAML Token)
                       ▼
 ┌───────────────────────────────────────────┐
 │      Internal HTTPS ALB (Private)         │
 │   - TLS Termination (ACM Certificates)     │
 │   - Only internal CIDRs allowed           │
 └───────────────────────────────────────────┘
                       │
                       ▼
 ┌───────────────────────────────────────────┐
 │      ECS Fargate (Angular + NGINX)        │
 │   - Private Subnets                       │
 │   - No Public Access                      │
 └───────────────────────────────────────────┘
                       │ (HTTPS /api/*)
                       ▼
 ┌───────────────────────────────────────────┐
 │          Amazon API Gateway               │
 │   - Private / Restricted Access           │
 │   - JWT/IAM AuthN, Request Validation     │
 │   - Throttling / WAF                      │
 └───────────────────────────────────────────┘
                       │
                       ▼
 ┌───────────────────────────────────────────┐
 │             AWS Lambda (Python)           │
 │   - Private Subnets                       │
 │   - Least-Priv IAM Roles                  │
 │   - Secrets from SSM/Secrets Manager      │
 └───────────────────────────────────────────┘
                       │
                       ▼
 ┌───────────────────────────────────────────┐
 │            DynamoDB (Metadata)            │
 │   - KMS-Encrypted at Rest                 │
 │   - Fine-Grained IAM Access               │
 │   - PITR Enabled                          │
 └───────────────────────────────────────────┘
