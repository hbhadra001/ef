Below is a **customer-friendly field guide** (simple wording) in **tabular format**, aligned to your workbook where each workflow sheet has:

**Workflow Metadata → Customer → Network & Boundaries → Source → Target → Security → Ops**

---

## 1) Workflow Metadata (top of each workflow tab)

| Field                       | What customer should enter                                                | Example                  |
| --------------------------- | ------------------------------------------------------------------------- | ------------------------ |
| Workflow ID                 | A unique name for this transfer (don’t reuse for other flows)             | `wf-acme-settlement-001` |
| Flow Type                   | Choose the workflow type                                                  | `SFTP_to_S3`             |
| Environment (Dev/Test/Prod) | Where this will run                                                       | `Test`                   |
| Enabled (Yes/No)            | Keep `No` until everything is filled; set `Yes` only when ready to submit | `No`                     |

---

## 2) Customer

| Field                    | What customer should enter             | Example             |
| ------------------------ | -------------------------------------- | ------------------- |
| Customer ID (Short Code) | Short identifier (no spaces)           | `ACME`              |
| Customer Name            | Full company name                      | `Acme Retail Inc.`  |
| Business Unit / LOB      | Team/department that owns this         | `Payments Ops`      |
| AWS Account ID           | 12-digit AWS account (target side)     | `123456789012`      |
| AWS Region               | AWS region for processing/storage      | `us-west-2`         |
| Primary Contact Email    | Best email/distro for onboarding + ops | `acme-ops@acme.com` |

---

## 3) Network & Boundaries (new section)

| Field                       | What customer should enter                               | Example                                  |
| --------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| Source Endpoint Location    | Where the source lives                                   | `External`                               |
| Target Endpoint Location    | Where the target lives                                   | `Internal`                               |
| Source Network Zone         | Source network zone                                      | `Internet` / `Partner Network`           |
| Target Network Zone         | Target network zone                                      | `Cloud VPC`                              |
| Connectivity Path           | How we connect                                           | `Public Internet (allowlist + key auth)` |
| Allowlisting Responsibility | Who must allowlist IPs                                   | `Customer must allowlist our IPs`        |
| Data Classification         | Sensitivity of files                                     | `Confidential`                           |
| Boundary Crossing (Yes/No)  | Does traffic cross boundaries (e.g., external→internal)? | `Yes`                                    |
| From Boundary               | If Boundary Crossing = Yes, origin boundary              | `External`                               |
| To Boundary                 | If Boundary Crossing = Yes, destination boundary         | `Internal`                               |

**Important:** If Connectivity Path is **Public Internet**, customers must fill **Allowlisting Responsibility** (and SFTP allowlist IPs below).

---

## 4) Source (SFTP) — for SFTP_to_S3 and SFTP_to_SFTP

| Field                            | What customer should enter                           | Example               |
| -------------------------------- | ---------------------------------------------------- | --------------------- |
| Source SFTP Hostname             | DNS name or IP of source SFTP                        | `sftp.partner.com`    |
| Source SFTP Port                 | Usually 22                                           | `22`                  |
| Auth Type (Key/Password)         | Choose how you authenticate                          | `Key`                 |
| SFTP Username                    | Username on SFTP server                              | `acme_inbound`        |
| SFTP Public Key (if key-based)   | Provide SSH public key text if Auth Type = Key       | `ssh-rsa AAAA...`     |
| Public IP(s) to Allowlist        | IPs that must be allowed on the SFTP firewall (CIDR) | `203.0.113.10/32`     |
| Source Directory Path            | Folder to read files from                            | `/inbound/settlement` |
| File Name Pattern                | Which files to pick (wildcards allowed)              | `settlement_*.csv`    |
| Expected File Size Range (MB/GB) | Typical and max sizes                                | `50MB–2GB`            |
| Transfer Frequency               | When files arrive / when to pick up                  | `Daily 02:00 PT`      |

---

## 5) Source (S3) — for S3_to_SFTP and S3_to_S3

| Field                        | What customer should enter | Example                     |
| ---------------------------- | -------------------------- | --------------------------- |
| Source S3 Bucket             | Bucket where files exist   | `acme-source-bucket`        |
| Source S3 Prefix/Folder      | Folder path (prefix)       | `exports/daily/`            |
| File Name Pattern            | Which files to pick        | `*.csv`                     |
| Transfer Frequency / Trigger | Schedule or trigger style  | `Hourly` / `Daily 01:00 PT` |

---

## 6) Target (S3) — for SFTP_to_S3 and S3_to_S3

| Field                   | What customer should enter  | Example               |
| ----------------------- | --------------------------- | --------------------- |
| Target S3 Bucket        | Destination bucket          | `acme-landing-bucket` |
| Target S3 Prefix/Folder | Destination folder (prefix) | `inbound/settlement/` |
| S3 Storage Class        | Storage tier                | `STANDARD`            |

---

## 7) Target (SFTP) — for SFTP_to_SFTP and S3_to_SFTP

| Field                            | What customer should enter | Example                |
| -------------------------------- | -------------------------- | ---------------------- |
| Target SFTP Hostname             | Destination SFTP host      | `sftp.acme.com`        |
| Target SFTP Port                 | Usually 22                 | `22`                   |
| Target Auth Type (Key/Password)  | Auth method                | `Key`                  |
| Target Username                  | Username on target SFTP    | `acme_drop`            |
| Target Public Key (if key-based) | SSH public key if Key auth | `ssh-rsa AAAA...`      |
| Target Directory Path            | Folder to write files      | `/dropzone/settlement` |

---

## 8) S3→S3 extra fields (only for S3_to_S3)

| Field                                    | What customer should enter               | Example        |
| ---------------------------------------- | ---------------------------------------- | -------------- |
| Cross-Account Copy (Yes/No)              | Is target bucket in another AWS account? | `Yes`          |
| Target AWS Account ID (if cross-account) | Required if Cross-Account Copy = Yes     | `999988887777` |
| Target Region (if cross-region)          | Only if target is in different region    | `us-east-1`    |

---

## 9) Security

| Field                          | What customer should enter                | Example                             |
| ------------------------------ | ----------------------------------------- | ----------------------------------- |
| Encryption at Rest (Yes/No)    | Should files be encrypted in storage      | `Yes`                               |
| Encryption in Transit (Yes/No) | Should data be encrypted in transit       | `Yes`                               |
| PGP Encryption (Yes/No)        | If files must be PGP encrypted            | `No`                                |
| PGP Public Key (if applicable) | Required if PGP Encryption = Yes          | `-----BEGIN PGP PUBLIC KEY-----...` |
| Checksum Validation (Yes/No)   | Validate file integrity after transfer    | `Yes`                               |
| KMS Key ARN (if applicable)    | Only if customer-managed KMS key required | `arn:aws:kms:...`                   |
| IAM Role Name (Execution Role) | Role used by automation to access SFTP/S3 | `acme-filetransfer-role`            |

---

## 10) Operations

| Field                               | What customer should enter          | Example                         |
| ----------------------------------- | ----------------------------------- | ------------------------------- |
| Retry Strategy                      | None / Fixed / Exponential          | `Exponential`                   |
| Max Retry Attempts                  | Number of retries                   | `5`                             |
| Backoff (Fixed/Exponential)         | Retry delay strategy                | `Exponential`                   |
| Failure Handling (Alert/Fail/Hold)  | What to do after retries fail       | `Alert`                         |
| Notification Email(s)               | Emails for alerts                   | `ops@acme.com; oncall@acme.com` |
| Monitoring Required (Yes/No)        | Should monitoring/alarms be enabled | `Yes`                           |
| SLA (Hours)                         | Expected response time window       | `4`                             |
| Support Window                      | Business hours or 24x7              | `24x7`                          |
| Change Management Required (Yes/No) | If change approvals needed          | `Yes`                           |
| Ticketing System                    | ServiceNow / Jira / Other           | `ServiceNow`                    |
| Runbook Link                        | Optional link to procedure/runbook  | `https://confluence/...`        |

---

If you want, I can also convert this into:

* a **“Help” tab inside the Excel workbook**, and/or
* add **Required/Optional** tags per field (customer sees what’s mandatory immediately).
