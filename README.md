
# 🧩 EPIC 1: Automated File Transfer Testing Framework (E2E)

**Epic Description**
Design and implement a production-grade automated testing framework to validate SFTP ↔ S3 and S3 ↔ S3 file transfer flows using synthetic test data, real endpoints, observability, and alerting.

---

## 📘 EPIC 1.1: Architecture & Design

### **Story 1: Architecture design for file transfer testing framework**

**Points:** 2
**Description:**
Design the end-to-end testing framework architecture using AWS EventBridge, Step Functions, Lambda, S3, CloudWatch, and Secrets Manager.
Include flow diagrams, component responsibilities, and failure handling.

**Acceptance Criteria**

* Architecture diagram created
* Control flow documented (happy + failure paths)
* Reviewed with Source team architect

---

### **Story 2: Define JSON-based test configuration contract**

**Points:** 1
**Description:**
Define the standard JSON schema for test flow definitions (source, target, validation, test data).

**Acceptance Criteria**

* JSON schema documented
* Supports SFTP↔SFTP, SFTP↔S3, S3↔S3
* Versioned schema (`schema_ver`)

---

## 🏗 EPIC 1.2: Infrastructure (Terraform)

### **Story 3: Provision S3 config & results storage**

**Points:** 1
**Description:**
Create versioned S3 bucket for test configs and results with lifecycle rules.

**Acceptance Criteria**

* `config/flows/` and `results/` structure created
* Versioning enabled
* Results lifecycle (30 days) applied

---

### **Story 4: Create IAM roles with least privilege**

**Points:** 2
**Description:**
Define IAM roles/policies for test Lambdas with restricted access to S3 prefixes, Secrets Manager, CloudWatch.

**Acceptance Criteria**

* No wildcard S3 access in prod
* Secrets Manager access scoped
* IAM reviewed by security

---

### **Story 5: Provision Step Functions state machine**

**Points:** 2
**Description:**
Create Step Functions workflow orchestrating test execution for each flow.

**Acceptance Criteria**

* Map state supports parallel flows
* Configurable concurrency
* Logs enabled

---

### **Story 6: Configure EventBridge daily schedule**

**Points:** 1
**Description:**
Trigger test execution daily via EventBridge cron rule.

**Acceptance Criteria**

* Default schedule documented
* Manual execution still supported

---

## ⚙️ EPIC 1.3: Lambda Implementation (Core Testing)

### **Story 7: Implement List Configs Lambda**

**Points:** 1
**Description:**
Lambda to read enabled test configs from S3.

**Acceptance Criteria**

* Reads JSON configs
* Skips disabled flows
* Handles pagination

---

### **Story 8: Implement Generate Test Data Lambda**

**Points:** 1
**Description:**
Generate synthetic files with checksum and manifest metadata.

**Acceptance Criteria**

* Supports random & fixed patterns
* Generates SHA256
* Adds run_id

---

### **Story 9: Implement Seed Source Lambda**

**Points:** 2
**Description:**
Seed synthetic file into source endpoint (S3 or SFTP).

**Acceptance Criteria**

* Writes data, `.sha256`, `.manifest.json`
* Uses Secrets Manager for SFTP keys
* Handles permission failures gracefully

---

### **Story 10: Implement Invoke Transfer Lambda**

**Points:** 1
**Description:**
Invoke production transfer Lambda asynchronously.

**Acceptance Criteria**

* Payload matches prod format
* Invocation failures surfaced

---

### **Story 11: Implement Poll Target Lambda**

**Points:** 2
**Description:**
Poll target endpoint (S3 or SFTP) until file arrives or timeout.

**Acceptance Criteria**

* Configurable timeout
* Backoff logic implemented
* Clear timeout error messaging

---

### **Story 12: Implement Validation Lambda**

**Points:** 2
**Description:**
Validate file integrity at target.

**Acceptance Criteria**

* Size match validation
* SHA256 validation
* Emits CloudWatch metrics

---

### **Story 13: Implement Record Results Lambda**

**Points:** 1
**Description:**
Persist test results in S3 and mark outcome.

**Acceptance Criteria**

* Writes run.json per execution
* Includes failure reason
* Results are immutable

---

## 📊 EPIC 1.4: Observability & Alerts

### **Story 14: Emit CloudWatch custom metrics**

**Points:** 1
**Description:**
Publish per-flow RunSuccess and latency metrics.

**Acceptance Criteria**

* Metrics visible in CloudWatch
* Dimensioned by FlowId

---

### **Story 15: Create CloudWatch dashboard**

**Points:** 1
**Description:**
Dashboard showing flow health and execution trends.

**Acceptance Criteria**

* RunSuccess trend per flow
* Execution failures visible
* Latency graph included

---

### **Story 16: Implement webhook notifier Lambda**

**Points:** 2
**Description:**
Notify ServiceNow/Jira/Slack on failures.

**Acceptance Criteria**

* Reads webhook URL from Secrets Manager
* Triggered on SFN failures & alarms
* Payload documented

---

## 🔐 EPIC 1.5: Security & Hardening

### **Story 17: Secrets management & rotation strategy**

**Points:** 1
**Description:**
Document and validate secure storage of SFTP keys and webhook secrets.

**Acceptance Criteria**

* Secrets Manager only
* Rotation supported
* No secrets in code/logs

---

### **Story 18: Failure & blast-radius analysis**

**Points:** 1
**Description:**
Analyze failure scenarios and ensure tests do not impact production data.

**Acceptance Criteria**

* Synthetic file tagging
* Test directories isolated
* Cleanup strategy documented

---

## 🚀 EPIC 1.6: Enablement & Adoption

### **Story 19: Create onboarding guide for new flows**

**Points:** 1
**Description:**
Document steps to add a new flow to the test framework.

**Acceptance Criteria**

* JSON template provided
* Validation checklist
* Troubleshooting section

---

### **Story 20: Run pilot with Source team**

**Points:** 2
**Description:**
Enable testing for selected Source team flows and gather feedback.

**Acceptance Criteria**

* At least 2 real flows onboarded
* Results reviewed with architects
* Adjustments captured

---

## 📐 Total Sizing Summary

| Category                   | Points (Days)            |
| -------------------------- | ------------------------ |
| Architecture & Design      | 3                        |
| Infrastructure (Terraform) | 6                        |
| Core Lambdas               | 11                       |
| Observability & Alerts     | 4                        |
| Security & Hardening       | 2                        |
| Adoption & Pilot           | 3                        |
| **Total**                  | **29 points (~29 days)** |


* Create **exec-friendly Jira Epic descriptions** for leadership review
