Below is a **clean, ARC-ready Technology Selection Scorecard** slide you can paste directly into your presentation.
It uses a **weighted scoring model** and clearly shows why ECS + API Gateway + Lambda + DynamoDB + Okta were selected over alternatives.

I can also generate a **visual chart** or **PNG diagram** if you want.

---

# **📊 Technology Selection Scorecard**

### **Self-Service Web Portal – Architecture Decision Framework**

| **Criteria**                                                          | **Weight** | **ECS + API GW + Lambda + DynamoDB (Chosen)** | **S3 Static Hosting** | **EC2 / Custom Servers** |
| --------------------------------------------------------------------- | ---------- | --------------------------------------------- | --------------------- | ------------------------ |
| **Security (Internal-only, Okta, Private VPC)**                       | 25%        | **5**                                         | 1                     | 3                        |
| **Meets Functional Requirements (NGINX, Reverse Proxy, API routing)** | 20%        | **5**                                         | 1                     | 4                        |
| **High Availability & DR (Active-Active Multi-Region)**               | 20%        | **5**                                         | 2                     | 3                        |
| **Scalability & Elasticity**                                          | 10%        | **5**                                         | 4                     | 3                        |
| **Operational Overhead**                                              | 10%        | **5**                                         | **5**                 | 1                        |
| **Integration with Okta + API Gateway**                               | 10%        | **5**                                         | 2                     | 3                        |
| **Cost**                                                              | 5%         | 3                                             | **5**                 | 2                        |
| **Total Weighted Score**                                              | **100%**   | **4.7 / 5**                                   | **2.4 / 5**           | **2.9 / 5**              |

---

# **🔍 Summary Interpretation**

### **Why ECS (w/ API Gateway, Lambda, DynamoDB) Scored Highest**

* Only option supporting **internal-only** intranet hosting
* Allows **private ALB + VPC-isolated compute**
* Supports **NGINX routing** → required to proxy Angular UI → API Gateway
* Only architecture supporting **Active-Active multi-region** resiliency
* Serverless backend (Lambda + DynamoDB) eliminates ops overhead
* Strongest integration with **Okta SSO, MFA, RBAC**
* Balanced cost vs compliance, governance, and DR requirements

### **Why S3 Static Hosting Scored Low**

* No VPC isolation → cannot be internal-only
* No NGINX support → cannot route API traffic securely
* Doesn't integrate securely with Okta + private APIs
* Cannot support Active-Active compute across 2 regions
* Lowest cost → but fails security, functionality, and enterprise requirements

### **Why EC2 Scored in the Middle**

* Could meet functionality but too much ops overhead
* Patch management, OS hardening, scaling policies, AMIs
* Not aligned with serverless-first cloud strategy

---

# **⭐ Slide Footer One-Liner**

**“ECS + API Gateway + Lambda + DynamoDB provided the strongest combination of security, functionality, DR resilience, and operational efficiency, making it the highest-scoring architecture.”**

---

If you'd like, I can also produce:

📌 A **visual scorecard infographic (PNG)**
📌 A **radar chart comparing all options**
📌 A **one-slide Architecture Decision Matrix**
📌 A **formal ADR (Architecture Decision Record) document**

Just tell me!
