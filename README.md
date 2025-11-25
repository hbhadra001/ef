Below is a **clear, ARC-ready response** to the team’s questions about **DynamoDB RTO/RPO vs. End-to-End Service RTO/RPO/SLA**, directly addressing the points raised in the message you shared.

You can paste this directly into the ARC Teams chat or email.

---

### **Response to ARC Team – RTO, RPO & SLA Clarification**

Thanks for the question — here is the clarification on how the RTO, RPO, and SLA apply to both **DynamoDB Global Tables in isolation** and the **end-to-end Self-Service Portal**.

**1. DynamoDB RTO/RPO (Data Layer Only)**
DynamoDB Global Tables provide **near-zero RPO (0–5 seconds)** and **sub-minute RTO** because data is already replicated across both regions. This aligns with AWS guidance that the service, *in isolation*, offers **multiple 9s of durability and availability**.

**2. End-to-End Service RTO/RPO**
While DynamoDB is the determining factor for data continuity, the overall RTO/RPO for the *entire service* also depends on:

* ALB failover
* API Gateway routing
* ECS tasks in the secondary region
* DNS/Route53 health checks
* Client DNS TTL propagation

Because compute is fully active-active in both us-west-2 and us-east-1, the **end-to-end RTO remains under ~5 minutes**, and the **RPO stays near-zero**, since the metadata layer is continuously replicated.

**3. End-to-End Service SLA**
You’re correct — although DynamoDB alone offers multiple 9s of availability, the **overall service availability is bound by the lowest common denominator**, which is the entire chain (ALB + ECS + API Gateway + Lambda + DynamoDB).
As a result, the expected end-to-end **service availability SLA is ~99.9%**, even though some individual components provide higher SLAs.

**Summary**

* **RPO (end-to-end): Near-zero (0–5 seconds)**
* **RTO (end-to-end): < 5 minutes**
* **Service Availability SLA: ~99.9%**
  This reflects both the strengths of DynamoDB Global Tables and the practical realities of multi-component failover routing in an active-active architecture.

Happy to walk through the full failover path or provide an RTO/RPO sequence diagram if needed.

---

If you'd like, I can also prepare a **one-slide “End-to-End DR Model”** or a **visual failover diagram** for the ARC deck.
