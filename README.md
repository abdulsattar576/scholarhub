# ScholarHub 🎓🇵🇰

> **Trustworthy, Pakistan-First Scholarship Discovery & Application Readiness SaaS**  
> Connecting Pakistani and South Asian graduates with verified, official European scholarships and university programs.

---

## 🌟 Key Features

1. **Verified Public Scholarship Discovery**
   - Official-source-backed catalog (TUM International Grant, DAAD Helmut-Schmidt-Programme, Erasmus Mundus Joint Master).
   - Multi-facet filters: Degree level, Country, Funding type, University type (Public/Private), and Deadlines.
   - Zero-unverified listings: Every rule links to official source quotes and timestamps.

2. **Deterministic Eligibility Matching Engine**
   - Multi-rule verification evaluating Degree Level, Nationality (EU vs. Non-EU / Pakistan), Grading Scale (CGPA / 4.0), and Language Certifications (IELTS/TOEFL).
   - Per-rule evidence breakdown returning tri-state verdicts: `ELIGIBLE`, `INELIGIBLE`, `NEEDS_REVIEW`.

3. **Pakistan Document Readiness & Attestation Guide**
   - Step-by-step guidance for **HEC Degree Attestation** (e-portal verification, courier vs walk-in).
   - **IBCC Equivalence** procedures for Matric & FSc certificates.
   - **German Embassy Certified Translations** (Sworn German translators vs local authorized translation rules).
   - **Anabin Database H+ University Verification** checking Pakistani degree equivalency for German visa and uni-assist admissions.

4. **AI Application Studio & Document Export**
   - **Strict Zero-Fabrication Policy:** Formats and elevates only actual student credentials without hallucinating grades, awards, or fake employment.
   - **European Academic CV Builder:** Europass and DAAD compliant academic CV generation.
   - **Tailored Motivation Letter (SOP) Drafter:** Word-capped letter generator with context for Pakistani economic realities (PKR-to-EUR currency shocks).
   - **One-Click Export:** Download as clean Markdown (`.md`) or print-ready European styled HTML/PDF (`.html`).

5. **Application Tracker & Document Checklist**
   - Track application readiness across lifecycle states (`PLANNING`, `PREPARING`, `READY`, `SUBMITTED`, `ACCEPTED`, `REJECTED`).
   - Per-document readiness flags: Prepared, HEC/IBCC Attested, Certified German Translation.

6. **In-App Notification Center & Deadline Radar**
   - Proactive automated alerts dispatched when tracked deadlines reach $14$, $7$, $3$, or $1$ day windows.
   - Deduplicated alert delivery ensuring students receive reminders without redundant spam.
   - Notifications when scholarship cycles close, preserving student document history.

7. **Admin Moderation & Verification Console**
   - Cross-database KPI telemetry (`identity_db`, `scholarship_db`, `application_db`).
   - Side-by-side evidence inspection of AI-extracted candidate rules against official source text.
   - One-click rule verification and opportunity publishing controls.
   - Automated lifecycle reconciliation engine auto-closing expired deadlines.

8. **Durable Background Jobs Architecture**
   - Asynchronous job execution system in PostgreSQL (`background_jobs`) with non-blocking HTTP APIs.
   - Idempotency key protection and polling status endpoints (`/v1/jobs/:id`).

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Responsibilities |
|---|---|---|
| **Frontend** | **Next.js 16 (Turbopack), React 19, Tailwind CSS** | Fast, responsive client-side SPA with real-time modal interfaces and print styles |
| **API Gateway** | **NestJS, TypeScript, Express** | Public REST API, Session authentication (opaque hashed tokens, HttpOnly cookies), Admin console, Jobs runner |
| **Scholarship Catalog** | **NestJS, gRPC Microservice, Prisma** | Logical database owner of `scholarship_db`, catalog search, eligibility engine |
| **Crawler & AI Service**| **Python 3, gRPC, httpx, Google Gemini 3.8 Flash** | Official portal fetching, structured AI schema extraction with field-level evidence citations |
| **Databases** | **Self-hosted PostgreSQL** | 3 isolated logical databases: `identity_db`, `scholarship_db`, `application_db` |

---

## 📂 Repository Structure

```text
Scholarhsip-Platform/
├── api-gateway/            # NestJS Public REST API Gateway
│   ├── prisma/             # Multi-database schemas (identity, scholarship, application)
│   └── src/                # Auth, Applications, Studio, Readiness, Admin, Jobs, Notifications
├── scholarship-service/    # NestJS gRPC Catalog Microservice
│   ├── prisma/             # scholarship_db schema & migrations
│   └── src/                # Eligibility engine & catalog RPCs
├── crawler-service/        # Python gRPC crawler & Gemini extractor
│   ├── extract_scholarship.py
│   └── crawler_server.py
├── client/                 # Next.js 16 App Router UI
│   └── app/                # Single-page discovery, tracker, studio, and admin console
├── proto/                  # Protocol Buffer contracts (crawler.proto, scholarship.proto)
├── database/               # PostgreSQL initialization scripts
└── docker-compose.yml      # Multi-container orchestration topology
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20+
- **Python**: 3.10+
- **PostgreSQL**: 16+

### 2. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env
```
Ensure your database URLs and `GEMINI_API_KEY` are configured in `.env`.

### 3. Install Dependencies
```bash
# Install API Gateway dependencies
cd api-gateway && npm install

# Install Scholarship Service dependencies
cd ../scholarship-service && npm install

# Install Client UI dependencies
cd ../client && npm install

# Install Python Crawler dependencies
cd ../crawler-service && pip install -r requirements.txt
```

### 4. Database Setup & Seed
```bash
cd api-gateway
npx prisma db push --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/scholarship.prisma
npx prisma db push --schema=prisma/applications.prisma

# Ingest multi-source sample scholarships (TUM, DAAD, Erasmus Mundus)
cd ../scholarship-service
npx tsx src/ingest_cli.ts
```

### 5. Running the Application
```bash
# Terminal 1: API Gateway
cd api-gateway && npm run start:dev

# Terminal 2: Web Client
cd client && npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 License
MIT License. Built for Pakistani students and scholars pursuing global higher education.

