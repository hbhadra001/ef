Here is a **clean, ARC-ready “Cost Comparison” slide** for your deck, focused on:

* **S3 Static Website Hosting**
  vs
* **ECS Fargate Web Portal**
* **With Active-Active DR across us-west-2 and us-east-1**

You can copy/paste directly into PowerPoint.
If you want a visual infographic version afterward, I can generate it too.

---

# 💰 **Cost Comparison: S3 Static Hosting vs ECS Fargate (Active-Active DR)**

### **Slide Title:**

**Cost Evaluation – Self-Service Web Portal Deployment Models**

---

# ✅ **1. Summary Table (Drop into Slide)**

| Cost Area          | **S3 Static Site (Single Region + DR)** | **ECS Fargate (Active-Active: us-west-2 & us-east-1)**                                             |
| ------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Compute**        | None (static hosting)                   | Fargate tasks in both regions (min 2 per region)                                                   |
| **Load Balancing** | No ALB required                         | ALBs in both regions                                                                               |
| **API Hosting**    | Still requires API Gateway + Lambda     | API Gateway + Lambda                                                                               |
| **DR Strategy**    | Replicate S3 content + Failover routing | Full Active-Active compute in both regions                                                         |
| **Ops Complexity** | Very low                                | Higher (containers, ALB, scaling policies, deployments)                                            |
| **Monthly Cost**   | **Very low ($10–30/mo)**                | **Moderate ($350–550/mo)** depending on task runtime                                               |
| **Scalability**    | High for static content                 | High for UI + APIs                                                                                 |
| **Best For**       | Simple UI with no server-side logic     | Enterprise-grade secure portals requiring NGINX, Auth, Internal network only, fine-grained routing |

---

# ⭐ **2. Detailed Cost Breakdown (Approx.)**

### **S3 Static Website Hosting**

* S3 Storage (HTML/JS/CSS): **$1–5 / month**
* S3 GET/PUT requests: **$1–3 / month**
* CloudFront (optional): **$10–20 / month**
* Route53: **$1 / month**
* DR (Cross-Region Replication):

  * Storage replication: **$1–3 / month**
  * Failover routing: **$0.50 / month**

📌 **Total Estimate: ~ $10–$30 / month**

---

### **ECS Fargate (Active-Active: us-west-2 + us-east-1)**

Assuming:

* 2 tasks per region (min)
* 0.25 vCPU + 0.5 GB RAM per task
* ALB per region
* API Gateway + Lambda (same for both approaches)
* Inter-region DynamoDB global table (for metadata)

**Compute – Fargate**

* 0.25 vCPU + 0.5GB ~ **$15–20 per task per month**
* 4 tasks total → **$60–80 / month**

**Load Balancers**

* Each ALB ~ **$18–22 / month**
* 2 ALBs → **$36–44 / month**

**Data Transfer (Internal)**

* Minimal, ~$5-10 per month

**DynamoDB Global Table Replication**

* ~**$30–50 / month** depending on RCU/WCU

📌 **Total ECS Estimate: ~ $350–550 / month**
(depends on number of tasks, workload, and scaling)

---

# 🔍 **3. Why ECS Was Selected (ARC Justification)**

Even though S3 is cheaper, it **fails enterprise security and functional requirements** for internal customers:

### **Why S3 static site WAS NOT selected**

* Cannot run **NGINX reverse proxy** for internal APIs
* Cannot enforce **Okta tokens → API Gateway** mapping
* Cannot host private intranet site inside VPC
* Cannot support **internal-only ALB + corporate network** restrictions
* No container support → cannot implement internal routing rules
* Does not align with **Active-Active DR** compute parity

### **Why ECS Fargate WAS chosen**

* Private ALB + Fargate tasks fully isolated inside VPC
* Supports **internal-only portal (no internet exposure)**
* Allows **NGINX-based routing**, header injection, and API auth flows
* Runs consistently in **two regions** for Active-Active DR
* Matches internal policies for **container governance & auditability**
* Works seamlessly with **API Gateway, Lambda, DynamoDB Global Tables**

---

# 🟦 **4. Optional Slide Footer (Highly Recommended for ARC)**

> “While S3 static hosting offers low cost, it does not meet enterprise security, internal-network access, or Active-Active DR requirements. ECS Fargate provides the right balance of security, reliability, and standardization across regions, at a predictable monthly cost.”

---

If you want, I can:

📌 Build a **visual 2-column cost diagram**
📌 Provide a **chart bar comparison**
📌 Create a **CFO-friendly cost/benefit slide**
📌 Generate a **single-slide visual infographic**
📌 Add **speaker notes** explaining the cost tradeoff

Just tell me!
