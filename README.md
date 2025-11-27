Below is the **updated, Security-team–ready explanation**, now fully aligned with the **attached “Decentralized Ingress Traffic DMZ” diagram** from ARC Template v2.0.

You can paste this directly into Confluence, your ARC packet, or email.

---

# **Why Static IP Addresses Cannot Be Provided for Our External Landing Zone**

### *Updated Based on “Decentralized Ingress Traffic DMZ” Architecture Diagram*

## **1. Context**

Our external-facing application is onboarded into the CFS 2.0 model, where all internet-bound ingress traffic follows the **standard enterprise ingress security stack** shown in the diagram:

**Internet → Neustar External DNS → Akamai (DDoS + WAF) → Internet Gateway → GWLB → Outer Perimeter Firewall → Customer External Application VPC → Transit Gateway → Internal Zones (optional)**

Because traffic is routed through these shared enterprise controls, the IPs reaching our application **belong to the Akamai edge network**, not to a static range we control.

---

## **2. Key Reason Static IPs Cannot Be Provided**

### **2.1 Akamai Edge Nodes Terminate Traffic**

The diagram shows:

* **Neustar External DNS** resolving the hostname
* **Akamai** providing **DDoS, WAF, and global edge protection** BEFORE traffic reaches our AWS infrastructure
* Our VPCs only receive traffic **after** it is processed by Akamai and the enterprise DMZ stack

This means:

> **Traffic entering our AWS VPC does not originate from a fixed IP range—it originates from Akamai’s globally distributed and dynamically shifting edge POPs.**

---

## **2.2 Akamai Does Not Support Customer-Owned Static IPs**

Akamai’s edge network:

* Is globally Anycast
* Has hundreds of IPs per region
* Continuously rotates IPs for DDoS absorption
* Performs routing optimization based on load and proximity
* Uses dynamic pools for WAF and rate-limiting engines

Therefore:

> **There is no single IP or CIDR block that we can provide or guarantee. Attempting to do so would break customer access and violate enterprise ingress architecture.**

---

## **2.3 The External Landing Zone *Must* Route Through the Enterprise DMZ**

Per the diagram:

* All customer-facing applications **must** onboard through the **Customer External Application VPCs** using the **Outer Perimeter Firewall**, **GWLB**, and **Akamai**.
* This is a **mandatory enterprise control**, not optional.
* Direct exposure to AWS public IPs is **prohibited**.

Allow-listing static IPs would bypass:

* Akamai DDoS
* Akamai WAF
* Outer Perimeter Firewall
* Standard Inspection Controls

Thus:

> **Static IP allow-listing is not architecturally supported nor allowed under CFS 2.0 external DMZ standards.**

---

## **3. Approved Compensating Security Controls Already Protecting the Application**

### **Akamai (as shown in the diagram)**

* DDoS absorption at the edge
* Web Application Firewall (OWASP Top 10)
* Bot mitigation
* Client reputation filtering
* TLS termination
* Edge rate limiting

### **Neustar External DNS**

* DNS DDoS protection
* DNSSEC
* Enterprise aliasing of customer endpoints

### **Outer Perimeter Firewall (GWLB)**

* Packet inspection
* Rule-based filtering
* Intrusion prevention

### **AWS Application Load Balancer + Security Groups**

* Origin-level protection
* Path-based routing
* Traffic segmentation inside CFS 2.0

In short:

> **The system is protected by multiple layers of enterprise-mandated controls that are stronger and more adaptive than static IP allow-listing.**

---

## **4. Acceptable Security Enhancements (If Required)**

Instead of static IP allow-listing, we can implement:

### **Option A — Akamai Access Control Lists**

* IP allow/deny lists at the edge
* Geo-blocking
* URL-level firewall rules

### **Option B — Mutual TLS at the Origin**

* Only Akamai certificates allowed
* Prevents any direct internet access

### **Option C — Token-Based Authentication**

* JWT validation
* HMAC signatures
* Signed URLs
* API Gateway Authorizer (if applicable)

### **Option D — Zero-Trust Patterns**

* Okta integration
* Private API access
* Session-based access control

---

## **5. Final Summary (Attach to Your ARC Review)**

**“We cannot provide static IP addresses because all inbound traffic is routed through Neustar External DNS and Akamai’s globally distributed DDoS/WAF edge network as mandated by the CFS 2.0 decentralized ingress model. Akamai uses dynamic IP pools that constantly change for resiliency and performance, and exposing static IPs would require bypassing enterprise security (Akamai, GWLB, Outer Perimeter Firewall), which is not allowed. The current architecture already provides stronger protection than static IP allow-listing.”**

---

## **6. One-Sentence Version (for email/Slack)**

> **Because our external landing zone is fronted by Neustar DNS and Akamai (per the CFS 2.0 DMZ architecture), we cannot provide static IPs—Akamai uses dynamic global edge IPs and is the mandatory DDoS/WAF control for all external-access applications.**


