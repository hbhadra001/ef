
# **🎤 60–90 Second Story for ARC Review – Slide 1**

“Good morning, everyone. Let me begin by framing the purpose of this initiative.
National Integration Services is introducing a **Self-Service Portal for Enterprise File integrations** as part of the NIS landing zone within CFS 2.0. Historically, onboarding file integrations has required back-and-forth emails, manual Excel intake forms, and valuable engineering time to interpret and validate information. Our goal is to **modernize that entire experience**.

Today's presentation focuses specifically on the **frontend web application design** for this new self-service portal. In Phase 1, the portal will support **Enterprise File integrations**, enabling internal customers to independently submit and configure their file transfer needs without relying on engineering intervention. Over time, this capability will extend to API integrations, ESB flows, and MQ—building a unified integration onboarding experience across NIS.

It’s important to call out that today's session does **not** cover the backend file engine. Instead, we’re presenting how the Self-Service Portal provides the **automated intake, validation, routing, and metadata capture** needed to significantly reduce onboarding timelines. By removing manual steps and enabling customers to self-configure their integrations, we lower onboarding effort, standardize data quality, and free up engineering teams to focus on higher-value tasks.

Overall, this portal lays the foundation for a scalable, secure, and fully automated onboarding model that aligns with our enterprise integration strategy.”




# 🎤 **60–90 Second Story for ARC Review – Slide 2 (Scope)**

“Now that we’ve set the context for the project, let me clarify the scope of what we are reviewing today.
For this ARC session, we are focusing **only on the frontend Self-Service Portal**—the part of the system that empowers internal customers and partners to onboard and manage their file transfer integrations independently.

The Self-Service Portal provides the automation, visibility, and governance required to standardize onboarding across NIS environments. This includes the intake process, validation, metadata creation, and managing configuration details that ultimately drive automation in the backend.

It’s equally important to highlight what is **not** in scope today. We are not reviewing the underlying **File Transfer Engine**—the backend components responsible for actually moving files, orchestrating transfers, handling retries, or executing event-driven workflows between source and target systems. Those backend responsibilities remain with the existing file engine services and are not impacted by the decisions we are reviewing here.

By keeping today’s discussion focused on the **portal layer**, we ensure clarity around the architectural decisions specific to onboarding logic, user experience, API integration, security, and governance. The backend execution engine will be addressed separately in future phases.

This gives us a clean boundary for today’s review and ensures we’re aligned on exactly which components we’re approving in this ARC session.”




# 🎤 **60–90 Second Story for ARC Review – Slide 3 (Architecture Journey)**

“Before diving into the technical architecture, I want to walk you through the **journey** that brought us to this Self-Service Portal.
Our current state for onboarding file transfer workflows is heavily manual and inconsistent. It begins with an **Excel-based intake form**, which requires customers to fill out a spreadsheet and email it around. There’s **no schema validation**, so the data we receive varies widely in quality. This forces engineering teams to spend time interpreting, correcting, and validating submissions—sometimes multiple times. And because this process is manual end-to-end, there is **no centralized tracking**, no visibility into status, and no governance across environments.

The target architecture replaces this entire manual flow with a **web-based, automated, schema-driven self-service portal**. Instead of Excel, users interact with a guided UI that enforces **JSON schema standards**, ensuring clean and consistent data from the start. Real-time validation checks for accuracy, and users receive immediate feedback and error notifications—enabling same-day onboarding when appropriate.

We also introduce **standardized workflow templates**, enabling customers to self-configure common transfer patterns without engineering involvement. Behind the scenes, submissions drive **automated provisioning**, ensuring the same workflow can be deployed consistently across Dev, Test, and Prod environments. And for the first time, all activity is captured in **centralized tracking and audit logs**, giving NIS complete visibility and governance over the full onboarding lifecycle.

This journey highlights the shift from a manual, error-prone, engineering-dependent process to a truly **automated, standardized, and governed self-service model**.”




# 🎤 **60–90 Second Story for ARC Review – Slide 4 (Business Value Proposition)**

“Now let’s shift from the journey to the **business value** this Self-Service File Transfer Onboarding Portal delivers. At the highest level, this is not just a UI—it's a strategic shift in how NIS manages integration onboarding.

The first major value is **standardization**. By replacing the Excel intake form with a schema-driven portal, we enforce consistent naming conventions, IAM policies, and architecture standards across the enterprise. This significantly reduces variability and brings every customer through a unified intake process.

Next, we unlock **operational efficiency**. Today, onboarding requires engineers to manually review, interpret, validate, and configure integrations. With automation from intake through provisioning, we dramatically reduce engineering involvement and allow teams to focus on higher-value work rather than operational overhead.

We also achieve meaningful **risk reduction**. Manual Excel submissions introduce data inconsistencies that can lead to misconfigurations, incorrect routing, or even security issues. By enforcing schema validation and automated checks, we reduce those risks at the source.

There is also a clear **cost optimization** benefit. Automation eliminates rework cycles caused by human error and cuts down on the back-and-forth across Teams, email, and tickets.

From a customer perspective, we improve **visibility and transparency**. Customers can now track onboarding progress directly through the portal, reducing support interactions and increasing overall satisfaction.

And finally, this solution becomes an **extensible platform**. What we build now for Enterprise File establishes the foundation for future capabilities—API onboarding, ESB, MQ, and even AI-assisted workflows and lifecycle management.

Overall, the Self-Service Portal reduces manual overhead, enhances governance, improves customer experience, and positions NIS for scalable integration growth.”



# 🎤 **60–90 Second Story for ARC Review – Slide 5 (Architecture Overview)**

“Let me walk you through the high-level architecture of the Self-Service Portal and how the components work together to deliver a secure, internal-only onboarding experience.

Access begins with **Okta**, which acts as our enterprise Identity Provider. All internal users—whether they are customers requesting file transfers, onboarding analysts, or system administrators—authenticate through Okta and acquire OIDC tokens. These tokens secure the entire interaction with the portal.

Once authenticated, users access the **Self-Serve Web UI**, which is hosted on **ECS Fargate inside a private VPC**. Traffic reaches the UI only through our **internal ALB**, ensuring the portal is strictly limited to corporate network or VPN access. DNS routing is handled internally, and all communication is encrypted over HTTPS.

The UI interacts with backend services through a **private Amazon API Gateway**, which acts as the secure entry point for all onboarding APIs. API Gateway performs token validation, request throttling, and enforces IAM-based authorization before invoking our **Python-based Lambda functions**.

These Lambda functions execute onboarding logic and store metadata in a **KMS-encrypted DynamoDB table**. That metadata drives automation downstream in the NIS file-transfer engine, which is shown on the right side of the diagram. While the backend file-movement execution is out of scope for today’s ARC, this metadata provides the contract that backend services consume.

For observability, all API calls, UI activity, and Lambda executions are logged into **CloudWatch**, and engineering teams can visualize operational telemetry in **Grafana**. Additionally, **Dynatrace** monitors the full flow end-to-end for performance and application health.

Overall, this architecture provides a secure, token-validated, VPC-isolated, and fully auditable path from user authentication through metadata provisioning, while keeping all sensitive components within our controlled infrastructure.”




# 🎤 **60–90 Second Story for ARC Review – Slide 6 (Design Decisions)**

“On this slide, I want to highlight the key architectural decisions that shaped the Self-Service Portal and why each decision was made.

The first major decision was the use of **AWS ECS Fargate** to host the Angular + NGINX frontend. This gives us a fully managed, serverless container environment with no EC2 infrastructure to patch or maintain. Fargate allows us to run the UI within private subnets, behind an internal ALB, which aligns perfectly with the security requirements for an intranet-only portal. It also provides consistent performance and easy autoscaling as adoption grows.

The second key decision is our **Active/Active architecture**. We deploy the portal across **three Availability Zones per region** and run the full stack in **two AWS regions**—us-west-2 and us-east-1. This multi-AZ, multi-region setup ensures high resiliency, protects us from zonal and regional failures, and supports near-zero RPO with low RTO during a failover scenario.

And finally, every decision is anchored around the mission of enabling **self-service onboarding** for NIS customers. The architecture needed to support real-time validation, secure API access, and integration with the underlying onboarding engine in a way that is highly available, observable, and easy to evolve. These design choices create a strong foundation not just for Enterprise File onboarding today, but for future onboarding types such as API, MQ, and ESB.

In summary, these decisions balance resiliency, security, operational simplicity, and long-term extensibility—ensuring the portal can meet enterprise expectations as it scales.”



# 🎤 **60–90 Second Story for ARC Review – Slide 7 (Architecture Pillars)**

“On this slide, I’m highlighting how the Self-Service Portal aligns with our enterprise **Architecture Pillars**, ensuring the solution is not only functional but also secure, reliable, and scalable for long-term use.

Starting with **Security**, the portal follows a strict defense-in-depth strategy. Access is restricted to the corporate network or VPN, enforced by Okta SSO with strong identity governance. All communication is encrypted end-to-end—from the browser through the internal ALB, ECS, API Gateway, Lambda, and DynamoDB. Every layer is protected through least-privilege IAM and full audit logging.

Under **Operational Excellence**, we rely on automation and strong observability. Terraform delivers consistent deployments, while CloudWatch and our CI/CD pipelines ensure predictable, low-risk releases. This gives us a healthy operational lifecycle for ongoing improvements.

For **Reliability**, the architecture is built on a multi-region active/active model with multi-AZ deployment in each region. DynamoDB Global Tables ensure that onboarding metadata is always available and synchronized, even during regional disruptions. This supports our near-zero RPO and rapid failover goals.

Next, **Functional Ability**. The portal doesn’t just automate intake—it provides a secure, intuitive, guided onboarding experience. It helps customers submit clear and consistent configurations, improving validation, reducing back-and-forth, and accelerating onboarding across environments.

With **Performance**, the system provides fast, predictable response times. Angular optimizations like lazy loading and compression, ECS autoscaling, tuned Lambda memory allocations, and efficient DynamoDB queries ensure that the UI and backend scale smoothly with usage.

In terms of **Cost Optimization**, we intentionally leverage serverless and autoscaling AWS services. This minimizes infrastructure overhead, reduces engineering involvement, and lowers cloud spend while still supporting high availability.

And finally, **Sustainability**. By using serverless, right-sized resources and automated scaling, we maximize efficiency across compute, storage, and networking. Our multi-region architecture remains efficient without waste.

Overall, the solution aligns with all key architecture pillars, ensuring it is secure, resilient, efficient, and sustainable as the platform grows.”




🎤 **C1 – System Context Story (Self-Serve Onboarding Portal)**

“Let me start at the highest level with the system context for the Self-Serve Onboarding Portal.

At the center of this diagram is the **Self-Serve Onboarding Portal**—this is the system we’re designing. It’s the front door where internal customers request new file-transfer onboarding and where internal teams can view status and help customers if they get stuck.

On the **left**, you see our **users and identity**.
We have three main user groups:

* **Customers / internal partners**, who initiate new file-transfer onboarding requests.
* The **Internal Onboarding Team**, who assist customers, validate details, and may intervene when something unusual comes in.
* **System Administrators / Platform Engineering**, who are responsible for the reliability and operation of the platform.

All of these users authenticate via **Okta**, our enterprise Identity Provider. They’re redirected to Okta, acquire an **OIDC token** over HTTPS, and then return to the portal with a secure, scoped identity. That gives us SSO, MFA, and RBAC from day one.

On the **right side**, we show the systems that surround the portal. The **NIS Self-Serve Backend** represents the underlying file-transfer engine that actually provisions and executes transfers. Our portal doesn’t move files itself—it captures configuration and passes it on to that backend platform.

We also integrate with our **observability stack**. **ELMA** and **Dynatrace** consume logs, metrics, and traces from the portal so operations and SRE teams can monitor health, performance, and customer journeys end-to-end.

So at the C1 level, you can think of this as a secure, Okta-protected internal portal that sits between our users on the left and the NIS backend + observability platforms on the right, acting as the control plane for file-transfer onboarding and status.”




# 🎤 **60–90 Second Story — C2 Container Diagram (Self-Serve Onboarding Portal)**

“Now that we've seen the high-level system context, this C2 diagram breaks the Self-Serve Onboarding Portal into its major architectural containers and shows how they collaborate to deliver onboarding end-to-end.

At the center, we have the **Self-Serve Web UI**, which is an Angular + NGINX container hosted on **ECS Fargate**. This is the interactive front-end that customers, onboarding analysts, and system administrators use. All three user groups authenticate through **Okta**, acquiring an OIDC token and coming into the portal over HTTPS via our internal ALB. This enforces SSO, MFA, and RBAC across all roles.

From the UI, onboarding requests flow to the **Onboarding APIs**, which run as Python-based Lambda functions behind a private **API Gateway**. API Gateway handles token validation, authorization, throttling, and request shaping before anything hits our backend logic. The Lambdas perform schema validation, store standardized onboarding metadata into DynamoDB, and trigger downstream automation.

To the right, we show the **NIS Self-Serve Backend**, which consumes the metadata and drives the actual provisioning of file-transfer workflows. The portal’s responsibility is strictly intake, validation, and metadata generation—not file movement. That separation preserves clean layering and minimizes coupling.

Supporting containers sit above and below the flow.
**Monitoring and Observability** tools—Dynatrace, CloudWatch, ELMA—collect logs, metrics, traces, and user activity so operations teams can monitor performance and reliability in real time.
We also have **Audit Logging**, which captures API calls, UI activity, and operational interactions for compliance and traceability.

So in summary, at the C2 level the portal consists of:
✔ a secure NGINX + Angular front-end container on ECS,
✔ a private API layer on API Gateway + Lambda,
✔ DynamoDB for metadata,
✔ full observability and auditing,
✔ and a clean interface to the NIS backend platform.

This container view shows how each piece is isolated, secure, and purpose-aligned while forming a cohesive, resilient onboarding platform.”




## **1️⃣ Why did you choose ECS Fargate over S3 Static Hosting or EC2?**

**Answer:**
ECS Fargate is the only option that meets our core enterprise requirements: internal-only access, NGINX reverse proxying, Okta integration, VPC isolation, and active-active deployment. S3 hosting cannot support private intranet access or secured API routing, and EC2 has significant operational overhead. Fargate gives us the security of private subnets, the flexibility of containers, and zero server maintenance.

---

## **2️⃣ Why Active/Active instead of Active/Passive DR?**

**Answer:**
We selected Active/Active to achieve near-zero RPO and fast sub-5-minute RTO. Because onboarding metadata is stored in DynamoDB Global Tables, we get continuous multi-region replication with minimal data loss. Running ECS, ALB, and API Gateway in both regions eliminates cold-start delays and ensures seamless failover with Route53.

---

## **3️⃣ What is the end-to-end RTO and RPO?**

**Answer:**

* **RPO:** Near-zero (0–5 seconds) due to DynamoDB Global Tables continuous replication.
* **RTO:** <5 minutes end-to-end, driven by Route53 failover, ALB health checks, and DNS propagation.
  The compute layer is always active, so there is no restart time.

---

## **4️⃣ How do you ensure security across the architecture?**

**Answer:**
We use a full defense-in-depth model:

* Okta SSO + MFA + RBAC for identity
* Private ALB + ECS Fargate in private subnets
* Restricted API Gateway with JWT validation
* Least-privilege IAM roles for Lambda
* KMS-encrypted DynamoDB
* TLS 1.2+ encryption end-to-end
* CloudTrail, GuardDuty, Security Hub for audit & monitoring
  Every layer is isolated, authenticated, and audited.

---

## **5️⃣ How do you prevent inconsistent or bad onboarding data?**

**Answer:**
The portal enforces **JSON Schema validation** in real time. Users receive immediate feedback on incorrect or missing fields. This eliminates the Excel-driven inconsistencies we see today and reduces engineering rework. Every workflow uses predefined templates for consistency across environments.

---

## **6️⃣ How does this architecture scale as usage grows?**

**Answer:**
ECS Fargate autoscales based on load, Lambda scales automatically with demand, and DynamoDB provides millisecond performance at any scale. API Gateway throttling protects downstream systems. The entire design is serverless or autoscaling, enabling us to scale without adding operational overhead.

---

## **7️⃣ What happens if file sizes grow very large?**

**Answer:**
Large-file requirements were explicitly designed into the portal. We capture file size, volume, and viscosity as part of the intake and enforce thresholds that drive chunking guidance or alternative routing. In addition, we have validated large-file solutions using Lambda-based multi-part S3 transfers and can leverage our EF-made SFTP server for extremely large payloads.

---

## **8️⃣ What is the biggest risk in the architecture and how is it mitigated?**

**Answer:**
The biggest risk is misconfiguration of onboarding metadata, which could lead to downstream routing issues. We mitigate this through strong schema validation, predefined templates, role-based access in Okta, and end-to-end audit logging. All onboarding changes are traceable, validated, and reversible.

---

## **9️⃣ How does this architecture reduce cost long-term?**

**Answer:**
By eliminating manual data validation, engineering interpretation, and rework cycles. The portal reduces engineer involvement in routine onboarding and standardizes configurations, reducing errors that lead to costly remediation. Serverless and autoscaling services ensure we only pay for what we use.

---

## **🔟 Is this architecture extensible for future onboarding types (API, MQ, ESB)?**

**Answer:**
Yes — the architecture is designed as a platform. The UI framework, schema-based intake, API Gateway routing, metadata model, and automation patterns can all be extended to support API onboarding, MQ flows, ESB integrations, and future AI-assisted workflows without redesigning the core platform.




## 1️⃣ Why ECS Fargate instead of S3 static hosting or EC2?

**Q:** *Why not just host Angular as an S3 static site or run it on EC2? Why Fargate?*

**A:**
S3 static hosting can’t satisfy our **intranet + security** requirements: it’s internet-facing by design, doesn’t live in our VPC, and cannot run **NGINX as a reverse proxy** for secure routing and header/token handling to API Gateway.
EC2 gives us that flexibility but at a **high operational cost** (patching, AMIs, scaling groups, OS hardening).

ECS Fargate gives us the best of both:

* **Private VPC** + internal ALB for **internal-only** access
* Supports **Angular + NGINX** container pattern
* **No servers to manage**, automatic scaling, integrated with IAM, CloudWatch, and CloudTrail

So Fargate is the only choice that meets **security, intranet, NGINX, and ops** requirements simultaneously.

---

## 2️⃣ Why an Active–Active multi-region design?

**Q:** *Why did you choose active–active instead of active–passive or single-region HA?*

**A:**
We need the portal to be available even during **regional disruptions** because it’s a control plane for onboarding. With **active–active**:

* Traffic can be served from **either us-west-2 or us-east-1**
* DynamoDB Global Tables keep metadata **replicated in near real time**
* RPO is **0–5 seconds**, and end-to-end RTO is **< 5 minutes** (mainly DNS/Route53 + health checks)

Active–passive would either give us **longer RTO** (time to spin up infra) or require us to constantly pay for idle capacity anyway. Active–active is **simpler operationally** and aligned with our DR posture.

---

## 3️⃣ What are your end-to-end RTO, RPO, and SLA—and what determines them?

**Q:** *You quoted numbers for DynamoDB, but what about the whole service?*

**A:**
For the **data layer** (DynamoDB Global Tables), RPO is **0–5 seconds** and RTO is effectively **sub-minute**, because the data is already present in both regions.

For the **end-to-end service**, we factor in:

* Route53 health checks & DNS failover
* ALB health checks
* ECS/ALB/API Gateway/Lambda already running in both regions

That gives us **near-zero RPO** and **RTO < 5 minutes**.
Because availability is the product of multiple components, the **service-level SLA** is realistically **~99.9%**, even though DynamoDB itself offers multi-9s.

---

## 4️⃣ How do you ensure security from end to end?

**Q:** *What prevents this portal from becoming a new security risk?*

**A:**
We use a **defense-in-depth model**:

* **Identity:** Okta SSO + MFA + RBAC; Okta groups map to portal roles.
* **Network:** Internal ALB, ECS & Lambda in **private subnets**, VPC endpoints for API GW/DynamoDB, no public IPs.
* **Transport:** TLS 1.2+ from browser → ALB → ECS/NGINX → API Gateway → Lambda → DynamoDB.
* **Access Control:** Least-privilege IAM roles for ECS tasks, Lambda, and DynamoDB; fine-grained table permissions.
* **Data:** KMS encryption at rest, Secrets Manager/SSM for secrets.
* **Audit:** CloudTrail, ALB/API GW/Lambda logs in CloudWatch, GuardDuty & Security Hub for anomaly detection.

Every hop is **authenticated, authorized, encrypted, and logged**.

---

## 5️⃣ How do you prevent bad or inconsistent onboarding data?

**Q:** *Today Excel-based intake is messy. How is the new portal better?*

**A:**
We switched to a **schema-driven intake model**:

* Forms are backed by **JSON schema**, enforcing required fields, formats, ranges, and enumerations.
* **Real-time validation** in the UI gives immediate feedback (e.g., invalid path, unsupported protocol, missing IAM role).
* We use **predefined workflow templates** (SFTP→S3, S3→S3, etc.), so customers choose patterns versus inventing their own.

This drastically reduces ambiguity and rework and standardizes onboarding across customers and environments.

---

## 6️⃣ How does the solution handle very large files and high volumes?

**Q:** *What happens when file sizes or volumes explode, like Cash did in the past?*

**A:**
We treat large-file behavior as a **first-class requirement**:

* Intake explicitly captures **expected file size, daily volume, and frequency**.
* Based on these values, we apply **thresholds and rules** that:

  * Flag when chunking, compression, or large-file pipelines are required
  * Route flows to the appropriate backend pattern (e.g., Lambda-based multi-part S3, Fargate workers, or EF-made SFTP server)

We’ve also built and tested a **Lambda-based large-file transfer pattern** and can front it using our **EF-made SFTP server** for extreme cases. The portal becomes the place where we **steer customers to the right option** instead of discovering issues later in production.

---

## 7️⃣ How does this reduce operational load on engineering?

**Q:** *You say this frees engineering time—how, concretely?*

**A:**
Today, engineers:

* Interpret Excel sheets
* Email back for clarifications
* Manually validate configs
* Manually provision infrastructure

With the portal:

* Intake is **validated at the source**, reducing clarifications and corrections
* Metadata is stored in DynamoDB and feeds **automation pipelines** (Terraform/Step Functions)
* Engineers primarily **define templates and guardrails**, not individual flows

We estimate a **50–70% reduction in manual onboarding effort** per flow, and a huge reduction in back-and-forth communications.

---

## 8️⃣ How will you monitor the health and performance of the portal?

**Q:** *What observability is in place?*

**A:**

* **CloudWatch**: Logs and metrics for ALB, ECS, API Gateway, Lambda, and DynamoDB.
* **Dashboards/Grafana**: Unified view of request rates, errors, latency, and capacity.
* **Dynatrace**: End-to-end traces: user → UI → API → Lambda → DynamoDB, with SLOs & alerting.
* **Synthetic checks**: Scheduled probes to validate core journeys (login, submit onboarding request, etc.).

This gives us visibility into **latency, errors, and saturation** according to the SRE “golden signals.”

---

## 9️⃣ How do you roll out changes safely?

**Q:** *What’s your deployment and release strategy?*

**A:**
We use **CI/CD pipelines** with:

* Build & test stages (linting, unit tests, container scan)
* Deploy to **Dev → Test → Prod** using Terraform/CloudFormation
* **Blue/green or canary** deployment patterns for ECS and Lambda where practical
* Rollback hooks if health checks or error budgets are violated

Infrastructure and app changes are **versioned, auditable, and reversible**, reducing change risk.

---

## 🔟 How do you avoid vendor lock-in with AWS services?

**Q:** *You are using a lot of managed AWS services. Are we locked in?*

**A:**
We intentionally use **cloud-native services** because they give us the **best security, reliability, and operations story**. However, we limit lock-in by:

* Keeping business logic in **Python (Lambda)** and **TypeScript (Angular)**—portable languages
* Using **well-understood patterns** (REST APIs, JSON metadata) rather than tightly coupled proprietary formats
* Documenting the data contract in DynamoDB so it can be migrated to another store if needed

For this class of internal portal, the **benefit of managed AWS services outweighs the theoretical cost of portability**, and we can still migrate if strategy changes.

---

## 1️⃣1️⃣ How do you ensure least-privilege access for every component?

**Q:** *IAM is usually where things get too broad. How are you controlling that?*

**A:**
We design IAM with a **“start from zero, then add only what’s needed”** approach:

* ECS task roles limited to **calling API Gateway** and writing logs
* Lambda roles limited to **specific DynamoDB tables and KMS keys**
* DynamoDB table policies that **only allow** access from those Lambda roles
* No wide `*` permissions; all ARNs are **resource-scoped**
* Periodic **access reviews** and Config rules to detect policy drift

This keeps each component’s blast radius as small as possible.

---

## 1️⃣2️⃣ How does this portal integrate with existing NIS file-transfer engines?

**Q:** *If backend engines are out of scope, how do they consume this portal’s output?*

**A:**
The integration contract is **metadata in DynamoDB**:

* Each onboarding flow is stored as a **normalized JSON configuration**
* Backend engines read this metadata via **well-defined APIs** or data feeds
* We maintain **versioning** so changes are tracked and can be rolled back

This decouples the **frontend portal** from any specific backend technology. If NIS changes engines, the contract remains the same, they just adapt the consumer.

---

## 1️⃣3️⃣ How will you onboard existing integrations into this portal?

**Q:** *What is the migration plan for current customers?*

**A:**
We’ll take a **phased approach**:

1. New integrations must go through the portal (“**forward migration**”).
2. For existing integrations, we’ll create **migration tooling** to populate metadata in DynamoDB from current sources where feasible.
3. High-value or high-change flows will be prioritized, while low-change legacy flows can be left on the current path until there’s a business driver.

This avoids a risky “big bang” and lets us progressively increase coverage over time.

---

## 1️⃣4️⃣ What is the biggest technical risk in this design?

**Q:** *From your perspective, what worries you the most?*

**A:**
The biggest technical risk is **over-complexity in configuration** if we allow too many variations. That can lead to harder testing and more edge cases. We mitigate this by:

* Starting with a **small set of standardized templates**
* Limiting optional fields initially
* Adding new options only when they’re common and well understood
* Using strong validation + feature flags to roll out new patterns safely

So the portal grows **deliberately**, not chaotically.

---

## 1️⃣5️⃣ How will you test failover between regions?

**Q:** *Have you actually validated that active–active works?*

**A:**
Our DR plan includes **regular game days**, where we:

* Simulate regional failure by **disabling Route53 health checks** for one region
* Observe traffic failing over to the other region
* Validate that the portal remains usable and that new onboarding metadata is correctly written to the surviving region’s DynamoDB and replicated back when the failed region returns

We treat this as a **repeatable test**, not just a design assumption.

---

## 1️⃣6️⃣ What’s your approach to large-scale performance testing?

**Q:** *How do you know this will hold up under load?*

**A:**
We run **load tests** focused on:

* Concurrent logins and form interactions
* Peak onboarding request submissions
* DynamoDB read/write capacity and latency

Using tools like Locust/JMeter plus synthetic traffic, we tune:

* ECS task count & autoscaling policies
* Lambda memory/timeout
* DynamoDB capacity (on-demand/ provisioned with autoscaling)

We also define **performance SLOs** (e.g., p95 latency for key APIs) and ensure we stay below them with headroom.

---

## 1️⃣7️⃣ How do you prevent “portal sprawl” and governance issues?

**Q:** *If everyone can self-serve, how do you stop chaos?*

**A:**
Governance is built into the portal:

* Templates encode **architecture standards** and naming conventions
* Okta roles restrict who can create vs. approve certain flows
* Approval workflows (if required later) can be integrated at the metadata level
* Full **audit trail** of who created/changed what and when

So self-service is **guardrailed**, not a free-for-all.

---

## 1️⃣8️⃣ What’s your rollback strategy if something goes wrong?

**Q:** *If a deployment or metadata change breaks things, how do you recover?*

**A:**
For the application:

* CI/CD supports **rolling back to the last known-good container image or Lambda version** quickly.

For metadata:

* DynamoDB has **Point-In-Time Recovery**, allowing table-level restore
* We can implement **soft deletes and versioning**, so previous configurations can be restored without restoring entire tables

This gives us both **code rollback** and **config rollback** paths.

---

## 1️⃣9️⃣ How does this align with our long-term integration strategy (API, MQ, ESB, AI)?

**Q:** *Is this just for file transfer, or is it a broader platform?*

**A:**
We deliberately built this as a **platform**, not a point solution:

* UI and backend are **pattern-based** (templates, JSON config)
* The same intake/validation model can apply to API onboarding, MQ queues, ESB flows, etc.
* The architecture is ready for **AI assistance**: we can later add a Bedrock-based “onboarding assistant” that helps users choose patterns and auto-fill configs using the same metadata model.

Enterprise File is simply **Phase 1** of a broader self-service integration ecosystem.

---

## 2️⃣0️⃣ If you had to cut scope to reduce risk, what would you cut first?

**Q:** *What would you be willing to simplify if timelines or risk change?*

**A:**
We would keep the **core self-service flow + schema validation** and be willing to:

* Start with **single-region active/active within AZs**, then add second region later
* Limit the number of initial templates to the **top 2–3 file patterns**
* Defer advanced features like AI assistance or complex approval workflows

This preserves the **core business value** (self-service, standardization, automation) while reducing initial complexity if needed.


