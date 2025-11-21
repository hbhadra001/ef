Perfect, let’s fold those pieces in so your **security slide matches the real architecture** (Angular+NGINX on ECS → API Gateway → Python Lambda → DynamoDB).

Here’s an **updated, ARC-ready security slide** you can use as-is.

---

### 🔐 Slide Title

**Security Architecture – Internal Self-Service Web Portal**

---

### 1. Identity & Access (Okta + Internal-Only Access)

* **Internal intranet portal** – accessible only from **corporate network / VPN**.
* **Okta as IdP** (SSO via OIDC/SAML) for all portal users.
* **MFA + conditional access** policies enforced in Okta.
* **RBAC via Okta groups** → mapped to app roles (Admin / Flow Owner / Read-only) inside the portal & APIs.
* De-provisioning in Okta immediately removes access to the portal and APIs.

---

### 2. Network & Transport Security (ALB + ECS + API Gateway)

* **Internal-facing ALB (HTTPS)** in private VPC, fronting the **Angular + NGINX** ECS service.
* **TLS 1.2+ with ACM certificates** for `https://selfserve-fileportal.corp.local`.
* **Security groups**:

  * ALB: inbound 443 only from corporate/VPN CIDRs.
  * ECS tasks: inbound only from ALB SG.
* **NGINX → API Gateway**:

  * NGINX proxies `/api/*` calls to **API Gateway** over **HTTPS**.
  * API Gateway is **private or tightly restricted regional**:

    * Access via **VPC endpoint** and/or
    * **Resource policies** allowing only the intranet VPC / ALB / ECS security group.

---

### 3. Application / API Security (API Gateway + Python Lambda)

* **API Gateway** enforces:

  * **Authentication** (Okta JWT / IAM-based auth) for all API calls.
  * **Request validation & throttling** to prevent abuse.
  * Optional **WAF** integration to mitigate OWASP Top 10 patterns.
* **Python Lambda functions**:

  * Run in **private subnets** with **no public IPs**.
  * Use **least-privilege IAM roles** to write onboarding metadata to DynamoDB and invoke Step Functions / other AWS services.
  * No credentials in code; config and secrets pulled from **AWS Secrets Manager / SSM**.

---

### 4. Data Protection (DynamoDB + Metadata)

* **DynamoDB table** storing onboarding configuration metadata:

  * **KMS-encrypted at rest** using a customer-managed CMK.
  * **Fine-grained IAM policies**: only specific Lambda roles can read/write.
  * **Point-in-time recovery (PITR)** enabled for resilience and auditability.
* All traffic **in transit encrypted (HTTPS/TLS)** end-to-end: browser → ALB → ECS/NGINX → API Gateway → Lambda → DynamoDB.

---

### 5. Logging, Monitoring & Compliance

* **ALB access logs → S3**, internal-only, with retention & lifecycle.
* **API Gateway access logs + execution logs → CloudWatch Logs**.
* **Lambda logs → CloudWatch Logs** with correlation IDs (user, request, flow ID).
* **DynamoDB CloudTrail & access logs** available via CloudTrail & CloudWatch.
* **CloudTrail + GuardDuty + Security Hub** for AWS API visibility & threat detection.
* Periodic **access reviews** for IAM roles, Okta groups, and DynamoDB permissions.

---

### Optional Footer Line

> “Internal Okta-authenticated portal behind a private ALB and ECS, calling a restricted API Gateway → Lambda → KMS-encrypted DynamoDB, with least-privilege IAM and full audit logging.”

---

If you’d like, next I can:

* Turn this into a **simple security diagram** (User → Okta → ALB/ECS → API GW → Lambda → DynamoDB) with labels you can drop into PowerPoint, and/or
* Write **60–90 second speaker notes** for how to present this slide confidently to the ARC.
