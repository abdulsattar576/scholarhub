# Scholarship SaaS — Master Implementation Context (v1.3: Service-Oriented Architecture)

**Document version:** 1.2  
**Date:** 2026-10-14  
**Status:** Product and architecture specification; implementation has not started  
**Audience:** Gemini coding assistant and project developer

> This document is the single source of truth for the initial implementation. Do not assume a feature exists until code and tests prove it. Implement incrementally, explain tradeoffs, and request clarification for decisions explicitly marked TBD.

## 1. Product vision

Build a trustworthy, Pakistan-first scholarship discovery and application-readiness SaaS, expandable to other Asian countries. Students should be able to discover verified scholarships and university programs, filter by country/university type/degree/funding, understand eligibility and document requirements, track deadlines and applications, and generate accurate, tailored academic CVs and application documents with AI.

**Core differentiation:** Not just a scholarship directory or generic resume builder. Combine official-source-backed scholarship data with individualized application readiness, document preparation, and persistent application history.

**Primary initial persona:** Pakistani bachelor's graduate looking for funded master's programs abroad. **Initial geography:** Germany. Expand to Italy and other countries only after the ingestion and verification process is reliable.

**Non-goals for MVP:** Applying to universities on the student's behalf; guaranteeing scholarships/admission/visa; selling placement promises; scraping the whole internet; automatic legal/attestation certification; a consultant marketplace; fully autonomous publishing of AI-extracted high-impact requirements.

## 2. Confirmed architecture decisions

| Area | Choice | Notes |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Deploy on Vercel |
| UI | Tailwind CSS, shadcn/ui | Responsive, accessible |
| API | NestJS, TypeScript | Deploy on Hostinger VPS |
| Primary DB | Self-hosted PostgreSQL in Docker | **No Supabase database** |
| ORM | Prisma | Migrations committed to repository |
| Authentication | Google OAuth 2.0 / OpenID Connect, NestJS-managed | **No Supabase Auth**; use authorization code flow, PKCE, state, nonce |
| Sessions | Opaque server-managed sessions with HttpOnly cookies | Session hashes in DB or Redis; revocation supported |
| Queue | Redis + BullMQ | Node-based scheduling and jobs |
| Internal RPC | gRPC + Protocol Buffers | Node BullMQ worker to Python crawler; private network only |
| Crawling | Python + Scrapy + Playwright (selectively) | Only authorized/allowed access; Python not a native BullMQ worker |
| AI | Gemini API (model configurable via env) | For extraction, CV tailoring, letters; model/version TBD |
| Documents | HTML/CSS templates, Puppeteer PDF, `docx` package | Human-editable structured source |
| File storage | Private S3-compatible object storage | Provider TBD; no public passport/transcript URLs |
| Search | PostgreSQL indexes + full-text search | No Elasticsearch in MVP |
| Deployment | Docker Compose + Nginx on Hostinger VPS | Frontend hosted separately on Vercel |
| Monitoring | Structured logs, health checks, Sentry optional | Alert on crawler failures and job backlog |
| Payments | Provider TBD | Must validate Pakistan merchant availability and payout requirements |

**AI naming:** The developer intends to use Gemini for code implementation and runtime AI features. Do not hardcode or assume a specific model called “Gemini 3.8”; use configuration and confirm actual available model IDs.

### Hosting topology

- `www.example.com` or `example.com` → Vercel / Next.js.
- `api.example.com` → Hostinger VPS / Nginx TLS reverse proxy / NestJS.
- VPS private Docker network: API, worker, PostgreSQL, Redis, Python gRPC crawler service.
- PostgreSQL port 5432 and Redis port 6379 must not be publicly exposed.
- Google OAuth callback points to API HTTPS domain; cookies/CORS/CSRF must be explicitly designed for the chosen domain arrangement.
- Start with approximately 2 vCPU / 8 GB RAM VPS; resource-limit Playwright browser concurrency. Monitor before scaling.
- Back up DB off-server and regularly test restores. Docker volumes are not backups.

## 3. Product modules

### 3.1 Public scholarship discovery (free)
- Search scholarships and universities without mandatory account creation.
- Filters: country, nationality eligibility, degree level, discipline, university type (public/private), funding level, language, deadline window, open/closed status, program, university.
- Sort: upcoming deadline, recently verified, relevance.
- Show official application URL, source verification date, funding details, academic requirements, required documents, deadline and timezone, confidence/review state.
- Separate **university admission** from **scholarship funding**: a scholarship may be national, independent, or applicable to multiple programs.
- Search active/verified cycles by default; offer an explicit archived/expired toggle.
- Use URL query parameters for shareable filters, pagination, SEO metadata and canonical URLs.
- Label sponsored listings clearly; never let payment affect eligibility ranking.

### 3.2 Student profiles
- Google sign-in and optional later email/password.
- Structured profile: nationality, residence, target countries, education, degree, CGPA and grading scale, discipline, language tests, experience, research, publications, projects, awards, volunteering, skills.
- Student controls visibility, corrections and deletion.
- Store user-uploaded transcripts/passports in private storage, not public buckets or logs.
- Never invent credentials or student achievements.

### 3.3 Eligibility matching
- Rules engine evaluates structured requirements: nationality, degree level, academic discipline, GPA with grading scale, language evidence, graduation year, age if official, other restrictions.
- Return `ELIGIBLE`, `INELIGIBLE`, or `NEEDS_REVIEW` **per rule**, plus an overall status and explanation.
- Unknown/absent requirement must not be interpreted as no requirement.
- Do not convert CGPA scales automatically without an explicitly justified policy.
- Rules carry source evidence, effective cycle and last verification.
- AI may explain a rule in simple language but must not be sole source of eligibility truth.

### 3.4 Document readiness
- For each selected scholarship cycle/program, generate a checklist: required, optional, unknown, conditional, ready, missing, needs verification.
- Document metadata: kind, language, format, attestation, translation, validity, submission stage, official source evidence.
- **Never claim HEC attestation is universally mandatory.** Check the specific scholarship/university and application stage.
- Save checklist progress per application; do not overwrite student history when source requirements change.
- Track uploaded files, verification status, and sensitive-file retention policy.

### 3.5 Application tracking
- Student can save scholarships, create an application for a specific cycle, add notes and tasks, mark submitted, record outcome.
- Suggested states: `PLANNING`, `PREPARING`, `READY`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`.
- Application state is independent of scholarship cycle state. Expiring a cycle must not delete an application.
- Optional deadline alerts and reopen alerts; opt-in and notification preferences.

### 3.6 AI application studio
- Store one canonical student profile; derive multiple CV versions without changing source facts.
- Initial templates: simple academic, research-focused, clean European-style. Do not copy protected templates.
- CV editor with editable sections and reorder/hide controls; preview and PDF/DOCX export.
- Tailoring input: student structured profile + verified university/program requirements + target purpose + selected template.
- AI outputs structured JSON, not arbitrary HTML; validate and render through controlled templates.
- AI can improve language, relevance, ordering and clarity but cannot fabricate dates, grades, publications, experience or awards.
- SOP/motivation letter drafts are paid and editable; provide originality and accuracy reminders.
- Save document versions, source profile revision, target program/cycle, generation timestamp and usage records.
- Use idempotency and rate limits to prevent duplicate paid generation.

### 3.7 Admin console
- RBAC for admin/editor/reviewer; secure invite-based provisioning, no public admin signup.
- Manage countries, institutions, programs, scholarships, cycles, sources, reviews, crawl schedules and failed jobs.
- Side-by-side source evidence and proposed structured changes.
- Approve/reject critical changes; log who approved and when.
- Manually override incorrect records with provenance and recheck scheduling.
- Metrics: active opportunities, stale sources, pending reviews, failed crawls, user conversion, AI cost.

## 4. Scholarship ingestion strategy

**Key principle:** Extract and store scholarship data in our own PostgreSQL database **before** users search. User requests query the database; they do not trigger live crawling or per-search AI extraction.

### 4.1 Source categories
1. Official government scholarship portals (e.g., DAAD, Erasmus Mundus, HEC notices).
2. Official university program/admissions/scholarship pages.
3. Official documents and PDFs.
4. Licensed/authorized APIs and feeds, if available.
5. Manual admin curation when automation is unreliable.

No universal free scholarship API exists that provides all eligibility rules, universities, deadlines and documents. Public pages are not automatically licensed for bulk copying. Check terms, robots.txt, copyright, rate limits and redistribution permissions for each source. Do not bypass login, CAPTCHA, or anti-bot restrictions.

### 4.2 Pipeline
1. **Source registry:** Admin creates source with URL, institution/provider, allowed collection method, refresh policy, parser type, terms notes.
2. **Discovery:** Scheduled worker checks authorized feeds/sitemaps/listing pages for new opportunities; deduplicate by normalized official URL + provider + program + cycle, not title alone.
3. **Fetch:** HTTP first; Playwright only for genuinely dynamic allowed pages. Store fetch timestamp, status, ETag/Last-Modified, content hash and limited source snapshot where permitted.
4. **Change detection:** If unchanged, update last checked timestamp; skip AI extraction.
5. **Extraction:** Parse HTML/PDF into text; Gemini structured extraction into strict schema. Unknown values remain `null`.
6. **Validation:** Zod/Pydantic schemas, normalized dates, enums, required official URL, country, source evidence; detect conflicts and impossible deadlines.
7. **Review:** New records and critical changes (deadline, funding, eligibility, required documents) require reviewer approval initially.
8. **Publish:** Transactionally upsert approved records and searchable indexes; retain prior versions and audit trail.
9. **Refresh:** Scheduler adjusts frequency based on active cycle, approaching deadline, source reliability and past change rate.
10. **Failure handling:** Exponential backoff, bounded retries, dead-letter/failure queue, alerts; a failed crawl does not imply the scholarship is closed.

### 4.3 Scheduler defaults (tune after measuring)
- Active scholarship deadline/source checks: daily.
- Upcoming openings/closings: daily; more often only if source permits and justified.
- Eligibility/doc requirements: weekly.
- University program metadata: every 2–4 weeks.
- New discovery: daily or weekly.
- Keep separate `last_checked_at`, `last_changed_at`, `last_verified_at`; do not label data verified merely because it was fetched.

### 4.4 Integration between Node and Python (gRPC)
- NestJS API enqueues a crawl in BullMQ; the separate Node worker consumes it.
- Node worker calls the Python crawler via **gRPC**, using a versioned shared Protocol Buffers contract (`crawler.v1`). The Python crawler is a gRPC server, **not** a BullMQ consumer.
- Python fetches only permitted sources, normalizes content, and returns status, content hash, and small structured artifacts. Large HTML/PDF payloads go to controlled object storage; return an artifact key instead of transporting large blobs over gRPC.
- Node worker validates responses and performs PostgreSQL writes through Prisma. The Python service must not directly modify application tables.
- Use private Docker networking, explicit allowlisting of caller identity (service token or mTLS where appropriate), gRPC deadlines, bounded payload sizes, error status mapping, and graceful shutdown.
- For the MVP use one Node worker deployment with multiple BullMQ queues and one Python gRPC crawler deployment. No need to split NestJS into additional microservices.


## 4A. Redis, BullMQ and background worker implementation contract

This section is mandatory for Gemini implementation. **Never run crawling, AI extraction, CV rendering, bulk emails or lifecycle scans in an HTTP request handler.** API endpoints enqueue work, return a job/resource ID, and expose authorized progress/status endpoints. Persist durable business state in PostgreSQL, not solely in Redis.

### 4A.1 Deployment and service boundaries

- `api`: NestJS HTTP application, validates requests, authorizes users, persists intent and enqueues jobs.
- `worker`: separate Node.js/NestJS standalone process using BullMQ workers and BullMQ Job Schedulers; no public HTTP port required.
- `redis`: private Docker service, persistent storage configuration appropriate to queue durability, memory cap and eviction policy **noeviction**; monitor memory and queue health. Do not expose port 6379 publicly.
- `crawler`: private Python gRPC service with Scrapy/Playwright, called by the Node worker; require internal authentication and explicit per-source permissions. Do not attempt to use a native BullMQ Python consumer.
- `postgres`: durable system of record for scholarship records, cycles, sources, crawl history, generated document metadata and user-visible job statuses.
- `document-worker`: initially part of the Node worker process, logically separated by queue and concurrency. Extract to its own deployment when PDF workload warrants it.

### 4A.2 Named queues and job payloads

Use typed, versioned payload contracts with IDs, not full PII or raw document content. Queue names and suggested jobs:

| Queue | Jobs | Trigger | Initial concurrency |
|---|---|---|---|
| `source-discovery` | `discover-source`, `discover-new-opportunities` | scheduled + admin | 1 |
| `source-crawl` | `fetch-source`, `refresh-scholarship`, `refresh-program` | scheduled + discovery | 1–2 total; per-domain throttling |
| `source-extraction` | `extract-structured-data`, `compare-snapshot` | successful fetch + content change | 1–2 |
| `scholarship-lifecycle` | `expire-cycles`, `recheck-deadlines`, `archive-cycles` | recurring schedule | 1 |
| `student-notifications` | `deadline-reminder`, `cycle-reopened`, `email-delivery` | business events + scheduled | 2–5, provider-rate-limited |
| `ai-documents` | `generate-academic-cv`, `generate-sop`, `tailor-cv` | authorized paid/free quota request | 1–2 |
| `document-export` | `render-pdf`, `render-docx` | user request or AI completion | 1 on 2-vCPU VPS |
| `maintenance` | `cleanup-temporary-files`, `reconcile-stale-jobs` | scheduled | 1 |

These are initial tuning values, not capacity guarantees. Separate priority queues or priority rules so user document generation is not starved by crawling. Set timeouts and concurrency caps for browser and PDF jobs.

### 4A.3 Job lifecycle and reliable persistence

1. Validate and authorize API request. For paid generation, reserve credits transactionally in PostgreSQL with an idempotency key.
2. Insert a durable `background_jobs` row with `job_type`, `owner_user_id` (nullable), `entity_id`, `status=QUEUED`, `idempotency_key`, `attempts`, `created_at`, `updated_at`, and sanitized error information.
3. Enqueue BullMQ with stable job IDs derived from operation + entity + cycle/version; use a transactional outbox or periodic reconciliation to recover if DB commit succeeds but enqueue fails.
4. Worker claims job, updates durable state to `RUNNING`, emits progress, and performs the operation. Check idempotency before side effects.
5. On success, persist result and mark `COMPLETED`; on retryable failure use bounded exponential backoff with jitter; on exhausted retries mark `FAILED`, preserve review/audit context, and alert an admin.
6. Support `GET /api/jobs/:id` for owner/admin and progress polling (SSE optional later). Never expose another student's job or documents.
7. Treat BullMQ processing as **at-least-once**: jobs can run again after worker crashes. Use unique constraints, upserts, version checks, idempotent email delivery and payment-safe reservation/settlement. Do not assume exactly-once execution.
8. Set sensible BullMQ retention for completed/failed job metadata; keep durable audit records in PostgreSQL. Use an admin-only retry flow for failed jobs.

### 4A.4 Scheduled operations

Use BullMQ Job Schedulers or repeatable scheduling supported by the installed BullMQ version, with exactly one logical scheduler configuration per job and stable scheduler IDs. Jobs must be safe if triggered twice.

- New scholarship discovery: daily/weekly per authorized source.
- Open-cycle deadline refresh: daily, increased near deadlines where sources permit.
- University program refresh: every 2–4 weeks.
- Scholarship expiration: hourly or daily; compare timezone-aware verified `deadline_at` values against UTC now. If only a calendar date is known, do not invent a closing hour; mark for conservative review.
- Student deadline reminders: configurable intervals (e.g., 14/7/1 days) only when opted in; deduplicate by student + cycle + reminder window.
- Expired cycle archival: scheduled transition; **never delete** a cycle referenced by a saved scholarship or student application.
- Cleanup: purge temporary crawler files and temporary PDF artifacts according to retention policy; preserve student data according to privacy settings.
- Reconciliation: identify stalled/missing jobs, incomplete outbox events and missing queue deliveries.

### 4A.5 Crawling workflow

`discover-source -> fetch-source -> compare-content-hash -> (if changed) extract-structured-data -> validate-schema -> deduplicate -> create-review-task -> approve/publish`.

Store source URLs, ETag/Last-Modified when available, content hashes, timestamps, source snapshots where legally permitted, extraction version, verification status and field-level provenance. Do not call Gemini for unchanged content. Respect robots.txt, provider terms, domain rate limits, and retry-after responses. A 404 or temporary failure is **not** proof that a scholarship expired.

### 4A.6 AI documents workflow

`request -> authorization/quota check -> credit reservation -> enqueue -> Gemini structured response -> factual validation -> store editable version -> (optional) PDF/DOCX render -> finalize credit -> notify user`.

- Do not invent qualifications, research, degrees, publications or university requirements.
- User input and verified scholarship data must be separate from model instructions.
- Store generated artifacts in private object storage, not Redis.
- Failed jobs release reserved credits where no billable generation was delivered, according to a documented refund/usage policy.
- Never put passport images, transcripts, raw SOP text, API keys or OAuth tokens into BullMQ payloads or logs.

### 4A.7 Resource, security and observability requirements

- Target initial Hostinger VPS: 2 vCPU / 8 GB RAM; prioritize API/DB latency, limit Playwright to at most one browser instance initially and PDF rendering to one concurrent job; benchmark before increasing.
- Define Docker memory/CPU budgets and health checks; worker restart policy; graceful shutdown so running jobs can finish or safely retry.
- Redis password/private network, minimal ACL where supported, persistence and memory monitoring; no public Redis/PostgreSQL ports.
- Track queue waiting/active/failed counts, job latency, retries, source failures, crawler success rate, AI cost, API latency, DB connections and worker memory.
- Avoid multiple independent schedulers creating duplicate schedules; make registration idempotent.
- Tests: unit-test handlers and state transitions; integration-test BullMQ with Redis/PostgreSQL; simulate worker crash, duplicate delivery, provider 429, malformed AI JSON, expired deadline, credit rollback, and notification deduplication.

### 4A.8 Implementation order

1. Docker Compose: PostgreSQL and Redis with private networking, volumes and health checks.
2. NestJS API and standalone Node worker packages with shared typed queue contracts.
3. One demonstrable `test-job` end-to-end: API enqueue -> BullMQ -> worker -> PostgreSQL job status -> API polling.
4. Add outbox/reconciliation and retry/idempotency tests before processing payments or sending emails.
5. Add lifecycle queue and safe expiration/archival logic.
6. Add authorized crawler adapter and extraction/verification queues.
7. Add AI document generation and exports, with quota enforcement.
8. Add scheduled notifications, monitoring and scaling limits.

Do not implement all queues in Phase 0. Scaffold infrastructure and prove one worker end-to-end first.


## 4B. gRPC service contract and operational requirements

**Boundary:** Browser → NestJS uses HTTPS REST. NestJS → Redis uses BullMQ. **BullMQ Node worker → Python crawler uses gRPC**. Prisma handles PostgreSQL persistence. Gemini uses the vendor HTTPS API. Do not use gRPC for browser-facing endpoints or replace BullMQ with gRPC.

### Protobuf contract (starter; evolve with versioned migrations)

```proto
syntax = "proto3";
package crawler.v1;

service CrawlerService {
  rpc CrawlPage(CrawlPageRequest) returns (CrawlPageResponse);
  rpc Health(HealthRequest) returns (HealthResponse);
}

message CrawlPageRequest {
  string job_id = 1;
  string source_id = 2;
  string source_url = 3;
  string expected_content_hash = 4;
}

message CrawlPageResponse {
  string job_id = 1;
  string source_id = 2;
  bool changed = 3;
  string content_hash = 4;
  string artifact_storage_key = 5;
  int32 http_status = 6;
  string fetched_at_iso = 7;
  string error_code = 8;
  string error_message = 9;
}

message HealthRequest {}
message HealthResponse { bool ready = 1; }
```

### Rules

1. Put `.proto` files in `packages/proto/crawler/v1/`; generate TypeScript and Python bindings from the same definitions. Pin protobuf and gRPC dependencies and automate code generation.
2. The Node worker passes a verified source ID and an allowlisted source URL. The Python crawler must independently enforce URL scheme, DNS/IP checks, redirect restrictions, robots/access policy and rate limits to mitigate SSRF.
3. Use a configurable per-call deadline, bounded concurrency, response-size limits, and retries via BullMQ with exponential backoff and jitter. Avoid nested unbounded Python retries.
4. Map gRPC status codes: `INVALID_ARGUMENT` → no retry; `PERMISSION_DENIED` → no retry; `UNAVAILABLE` / `DEADLINE_EXCEEDED` → bounded retry. Log with `job_id`, `source_id` and trace/correlation ID, but no secrets or student documents.
5. Keep crawler port internal to Docker Compose; never publish it to the internet. Authenticate internal calls; private networking alone is not authentication.
6. Store source snapshots, crawl history, and durable job outcomes in PostgreSQL; Redis/BullMQ is orchestration, not the system of record.
7. Deduplicate work by source/cycle/version; all writes and external side effects must be idempotent because jobs may execute more than once.
8. Test a full pipeline: API enqueue → BullMQ worker → Python gRPC crawler (fixture source) → Prisma persistence → API status polling; include deadline, unavailable crawler, malformed response, and duplicate-job cases.
9. On a 2-vCPU/8-GB VPS, initially allow very few concurrent browser crawls and run lightweight HTTP extraction first. Tune based on measurements.

## 5. Scholarship lifecycle, expiry and student history

**Do not delete a scholarship because its deadline passed.** Keep permanent scholarship identity and separate application cycles.

### Lifecycle states
- Opportunity: `DRAFT`, `PUBLISHED`, `INACTIVE`, `RETIRED`.
- Cycle: `DISCOVERED`, `PENDING_REVIEW`, `UPCOMING`, `OPEN`, `CLOSED`, `ARCHIVED`, `CANCELLED`, `UNKNOWN`.
- Student application state is separate.

### Example
Scholarship A has cycle 2026 deadline 2026-05-10. When verified deadline passes, cycle becomes `CLOSED` and disappears from default active search. A student's saved opportunity and application still link to the 2026 cycle. If 2027 opens, create a new cycle. Do not overwrite 2026 requirements/deadline.

### Important edge cases
- Extended deadline: update same cycle after official verification; log old/new values and notify affected students.
- Multiple rounds: represent separate deadline windows/rounds rather than one date.
- Rolling admissions: model `ROLLING`, not fabricated deadline.
- Date-only deadline: store local date and timezone separately; do not invent 23:59 or UTC closing time.
- Unknown/ambiguous deadline: mark `UNKNOWN`, do not auto-close.
- Source unavailable: mark `STALE`/`NEEDS_REVIEW`, not `CLOSED`.
- Scholarship discontinued: mark retired after verification, preserve historic cycles.
- Archiving is a visibility/state transition, not physical deletion.
- Retention and deletion of uploaded personal documents follow separate privacy policies.

### Lifecycle jobs
- Periodic `reconcileCycleStatus` based on verified start/end times and source state.
- `archiveOldCycles` only changes visibility/archived timestamp after grace period.
- `detectReopenedCycles` links verified new cycles and optionally notifies opted-in students.
- Every state transition must be idempotent and audited.

## 6. PostgreSQL schema: logical design

Use UUID PKs, UTC timestamps for instants, explicit timezones for deadlines, indexes, foreign keys, unique constraints, and migrations. Core tables:

### Catalog
- `countries`: id, iso_code, name.
- `universities`: id, country_id, name, official_domain, institution_type (PUBLIC/PRIVATE/OTHER/UNKNOWN), city, status, last_verified_at.
- `programs`: id, university_id, name, degree_level, field_of_study, language, official_url, active_status.
- `scholarship_providers`: id, name, type, official_domain.
- `scholarships`: id, provider_id, title, description, official_url, funding_type, opportunity_status, created_at, updated_at.
- `scholarship_programs`: scholarship_id, program_id, applicability_status, evidence_id (many-to-many). Allow scholarships with no program links.
- `scholarship_cycles`: id, scholarship_id, cycle_label, status, open_at, deadline_at, deadline_local_date, deadline_timezone, deadline_precision, verified_at, archived_at.
- `application_rounds`: id, cycle_id, label, open_at, deadline_at, local_date, timezone, deadline_precision.
- `eligibility_rules`: id, cycle_id, program_id nullable, rule_type, operator, structured_value JSONB, evidence_id, review_status.
- `document_requirements`: id, cycle_id, program_id nullable, document_type, requirement_level, attestation_status, translation_status, application_stage, instructions, evidence_id.
- `funding_components`: id, cycle_id, kind, amount, currency, period, conditions, evidence_id.

### Provenance and ingestion
- `data_sources`: id, url, provider_id, source_kind, fetch_policy, enabled, last_checked_at, last_verified_at.
- `source_snapshots`: id, source_id, fetched_at, http_status, etag, last_modified, content_hash, storage_key nullable, parser_version.
- `source_evidence`: id, snapshot_id, field_path, source_excerpt, source_locator, extracted_at.
- `crawl_jobs`: id, source_id, job_type, status, attempts, started_at, completed_at, error_code.
- `extraction_candidates`: id, source_id, snapshot_id, extracted_json, schema_version, model_id, status.
- `review_tasks`: id, candidate_id, change_type, severity, reviewer_id, status, reviewed_at.
- `audit_logs`: id, actor_id nullable, entity_type, entity_id, action, before_json, after_json, created_at.

### Identity, students and applications
- `users`: id, email, name, role, password_hash nullable, created_at, updated_at.
- `oauth_identities`: id, user_id, provider, provider_subject, created_at; UNIQUE(provider, provider_subject).
- `sessions`: id, user_id, token_hash, expires_at, revoked_at; indexed by user_id/expiry.
- `student_profiles`: user_id, nationality, country_of_residence, preferences JSONB, created_at, updated_at.
- `education_records`, `experience_records`, `projects`, `publications`, `skills`, `language_tests`, `awards`: user_id FK and appropriate structured fields.
- `student_documents`: id, user_id, document_type, private_storage_key, mime_type, size, retention_until, created_at.
- `saved_scholarships`: user_id, scholarship_id, saved_at; UNIQUE(user_id, scholarship_id).
- `applications`: id, user_id, cycle_id, program_id nullable, status, created_at, updated_at; preserve links to expired cycles.
- `application_tasks`: id, application_id, requirement_id nullable, title, status, due_at.
- `application_document_snapshots`: id, application_id, requirement_snapshot JSONB, captured_at.
- `cv_versions`: id, user_id, application_id nullable, template_id, content_json, source_profile_version, created_at.
- `generated_documents`: id, user_id, application_id nullable, kind, storage_key, model_id, generation_metadata, created_at.
- `notification_preferences`, `notifications`: opt-in channels, reminders, delivery state.

### Billing
- `plans`, `orders`, `payments`, `entitlements`, `credit_ledger`, `ai_usage`.
- Use a transaction-safe immutable credit ledger; don't store credits as an untracked mutable number.
- Ensure idempotent payment webhooks, entitlement enforcement and refund handling.

**Indexes:** university(country_id, institution_type), program(university_id, degree_level), scholarship_cycle(status, deadline_at), full-text indexes for titles/programs, eligibility rule keys as appropriate, source normalized URL unique, application(user_id, status), job(status, scheduled_at). Build indexes from real query plans rather than guessing every combination.

**Data integrity:** Prefer soft retirement/archival for published catalog records. Avoid cascading deletion of cycles referenced by applications. Define foreign-key delete behavior deliberately.

## 7. Authentication and security

- NestJS owns Google OpenID Connect login: authorization code + PKCE, validated state/nonce, issuer/audience/signature checks.
- Identify Google user by stable `sub`, not email alone.
- Existing account linking requires verified, authenticated workflow; no automatic linking based solely on matching email.
- Create opaque random session token, store only hash server-side, set Secure + HttpOnly cookie and appropriate SameSite policy.
- Enforce CSRF protection for cookie-authenticated state-changing routes and strict CORS origin allowlist.
- RBAC on server for admin/reviewer; object-level authorization for every student file/application.
- Rate limit login, AI generation, search and upload routes; size/type-check uploads; malware scanning if feasible.
- Encrypt in transit; encrypt backups and storage; do not log OAuth codes, session tokens, student PII, CV content or API keys.
- Store secrets in environment/secret manager, never commit `.env`.
- Provide data export/deletion requests and a documented retention policy.

## 8. Search API and eligibility engine

### Example endpoints (v1)
- `GET /v1/countries`
- `GET /v1/universities?country=DE&type=PUBLIC&page=1`
- `GET /v1/programs?country=DE&degree=MASTERS&field=CS`
- `GET /v1/scholarships?country=DE&universityType=PUBLIC&degree=MASTERS&funding=FULL&status=OPEN&page=1`
- `GET /v1/scholarships/:id`
- `GET /v1/scholarships/:id/cycles`
- `POST /v1/eligibility/evaluate` (authenticated, validated student profile + cycle)
- `GET /v1/me/profile`, `PATCH /v1/me/profile`
- `POST /v1/me/applications`, `GET /v1/me/applications`
- `POST /v1/me/cv-versions`, `POST /v1/me/cv-versions/:id/export`
- `POST /v1/me/documents/generate`
- `GET /v1/admin/review-tasks`, `POST /v1/admin/review-tasks/:id/approve`
- `POST /v1/admin/sources`, `POST /v1/admin/sources/:id/refresh`

Use cursor or bounded offset pagination, DTO validation, explicit sorting, stable error contracts, rate limits, and OpenAPI docs. Never interpolate raw SQL from filters. University type is an institution attribute, not a scholarship attribute. Search may need to return external/national scholarships not tied to one university; document matching semantics clearly.

## 9. AI design

### Extraction prompt contract
Input: source text + URL + retrieval metadata. Output: JSON matching versioned schema with each claim carrying evidence/source locator. `null` for unknown. No fabricated dates, eligibility, funding or attestation rules. Flag conflicts. Review critical changes before publication.

### CV generation prompt contract
Input: canonical student profile + target program requirements + requested sections + template schema. Output: valid JSON sections with provenance to student fields. Improve writing but do not invent facts. Let student review/edit before exporting.

### Operational controls
- Central `AIProvider` abstraction; configurable model ID, token limits, timeouts, retries.
- Meter token/cost per task and user; enforce plan limits.
- Do not send passports or transcripts to AI by default; explicit consent and minimization where necessary.
- Never use free consumer-facing AI tiers for sensitive student data without reviewing provider data-use terms.
- Cache normalized extraction results by content hash; do not pay AI again for unchanged sources.

## 10. Free and paid product boundaries (launch hypothesis)

**Free:** public scholarship/university search, official links, key eligibility and mandatory requirements, basic matching, limited saves, one application tracker, limited CV preview. Never hide official deadline or mandatory documents behind a paywall.

**Starter — proposed PKR 999 one-time:** one tailored academic CV, one SOP/motivation draft, five AI revisions, exports.

**Pro — proposed PKR 2,499 one-time / 90-day access:** five tailored CV versions, five letters, 25 AI revisions, application tracking, detailed readiness support and exports.

Prices are hypotheses; test with students. Avoid unlimited AI promises. Track entitlements and usage atomically. Payments provider is TBD pending Pakistan merchant support, checkout, payouts and compliance review.

## 11. Cost and scaling assumptions

- Domain: one `.com`, renewal and registration costs to verify.
- Vercel: budget for commercial-appropriate plan and usage; verify current plan terms.
- Hostinger VPS: start at approximately 2 vCPU / 8 GB RAM, confirm current pricing, renewal and prepaid term.
- PostgreSQL, Redis and crawler run as self-hosted Docker services with no separate software license cost, but consume VPS resources.
- Variable: Gemini token usage, object storage/egress, email, off-server backups, paid search/crawl APIs, payment fees.
- Keep a per-job AI cost ledger and quotas. Initial operating budget is only a planning assumption, not a supplier quote.
- Scale crawler separately if CPU/RAM pressure rises; use bounded Playwright concurrency and rate limits.

## 12. Repository structure

```text
scholarship-saas/
  apps/
    web/                 # Next.js
    api/                 # NestJS modules and controllers
    worker/              # Node BullMQ scheduling and processing
    crawler/             # Python Scrapy/Playwright gRPC server
  packages/
    database/            # Prisma schema, migrations, seed
    shared/              # Types, DTO contracts, validation schemas
    proto/               # Versioned protobuf contracts (crawler/v1/crawler.proto)
    ui/                  # Reusable components
  infrastructure/
    docker/
    nginx/
    backup/
  docs/
    CONTEXT.md
    ADR/
    api/
  docker-compose.yml
  pnpm-workspace.yaml
  .env.example
  README.md
```

### NestJS modules
`AuthModule`, `UsersModule`, `ProfilesModule`, `CountriesModule`, `UniversitiesModule`, `ProgramsModule`, `ScholarshipsModule`, `ScholarshipCyclesModule`, `EligibilityModule`, `DocumentRequirementsModule`, `ApplicationsModule`, `DocumentsModule`, `AiModule`, `BillingModule`, `DataSourcesModule`, `IngestionModule`, `ReviewsModule`, `NotificationsModule`, `AdminModule`.

## 13. Delivery roadmap and acceptance criteria

### Phase 0 — Foundation
- Initialize monorepo, lint/format, TypeScript strict, env validation, Docker Compose (PostgreSQL + Redis), NestJS, Next.js, Prisma migrations.
- Health checks, structured logs, CI, test setup.
- **Done when:** local developer can start all services with documented commands, DB persists across restarts, migrations work.

### Phase 1 — Authentication and catalog
- Google OIDC, secure sessions, RBAC, countries/universities/programs/scholarships/cycles schema, admin CRUD.
- **Done when:** student can sign in and search seeded verified records; admins can edit; unauthorized users cannot access admin routes.

### Phase 2 — Ingestion and lifecycle
- Source registry, first allowed-source adapter, fetch/hash, extraction schema, human review, upsert, scheduled refresh, cycle closing/archiving.
- **Done when:** unchanged sources do not trigger AI, changed critical fields require review, expired cycles leave student references intact, extended deadline can reopen a cycle.

### Phase 3 — Student application workflow
- Profile, eligibility rules, saved scholarships, application checklist, history, deadline notifications.
- **Done when:** unknown requirements return NEEDS_REVIEW, an expired cycle is hidden from default search but remains visible in the student's application.

### Phase 4 — AI document studio
- Structured academic profile, 2–3 original templates, AI CV tailoring, SOP draft, editing, versioning, PDF/DOCX exports, usage limits.
- **Done when:** generated content never fabricates absent profile facts, exports render reliably, usage is metered.

### Phase 5 — Payments and production
- Payment provider integration, webhooks, entitlements, production deploy, backups, monitoring, security review, load test, pilot students.
- **Done when:** duplicate webhooks cannot double-credit, off-server backup restore succeeds, rate limits and authorization tests pass.

**Pilot dataset:** Begin with Germany and approximately 50–100 carefully verified opportunities. Avoid promising comprehensive coverage until measured.

## 14. Testing plan

- Unit: eligibility tri-state, cycle transitions, normalization, deduplication, AI output validation, entitlements.
- Integration: Prisma transactions, DB uniqueness, NestJS auth guards, crawler adapter with recorded permitted fixtures, review-to-publish pipeline.
- E2E: Google sign-in test strategy, filter results, save/apply, expired record access, CV generation/export, payment webhook idempotency.
- Security: CSRF, session fixation, cross-user object access, admin privilege escalation, signed URL expiration, upload validation.
- Data-quality: deadline timezone cases, date-only vs datetime, rolling applications, scholarship renewal, multi-round, changed attestation rule, source outage.
- Performance: indexed scholarship filters, pagination, queue backlog, concurrent PDF renders and crawler throttling.

## 15. Instructions to Gemini coding assistant

1. Treat this file as the product specification; do not silently replace chosen stack (no Supabase, MongoDB, Firebase, Kubernetes or Elasticsearch).
2. Start by inspecting existing repository files and reporting what exists before changing code.
3. Work **one milestone at a time**; provide a short implementation plan, then create complete working code and tests.
4. Use a service-oriented monorepo with an API Gateway, independently owned Scholarship Service, and Python gRPC Crawler; keep Identity and Application as modules initially with explicit extraction boundaries. Do not deploy all proposed services on day one.
5. Before coding DB tables, propose Prisma schema with explicit relations, indexes, delete policies, migrations and representative seed data.
6. Never invent real scholarship data. Seed fixtures must be clearly fictional and isolated from production search.
7. Always preserve source provenance, cycle history and student application links.
8. Do not scrape sites in violation of access restrictions; implement provider adapters with permission-aware policies.
9. Use environment variables for OAuth credentials, DB URL, Redis URL, Gemini API key, storage credentials, payment keys.
10. Produce commands for local Docker startup, migration, seed, tests and deployment.
11. Validate API inputs; enforce authorization at backend; do not trust frontend filters or user IDs.
12. For AI, require structured validated JSON and never fabricate academic or scholarship facts.
13. Do not implement paid features before entitlement model and idempotency strategy are designed.
14. Flag ambiguous requirements and ask a focused question instead of making a consequential assumption.
15. After each milestone, summarize files changed, commands to run, tests passing/failing, and next milestone.

## 16. Open decisions (do not assume)

- Brand/domain name.
- Payment provider with confirmed Pakistan merchant availability.
- S3-compatible object storage provider and retention policy.
- Transactional email provider.
- Exact Gemini model IDs and AI cost budgets.
- Whether email/password is included in MVP or Google-only first.
- Final scholarship source list and access/redistribution permissions.
- Formal privacy policy, user consent, retention and deletion schedule.
- Whether German language UI is needed or English-only initially.

## 17. First implementation request to Gemini

> Read `docs/CONTEXT.md` completely. We are beginning **Phase 0 only**. First propose the service-oriented monorepo structure, Docker Compose services (PostgreSQL + Redis + API Gateway + Scholarship Service + worker + Python gRPC crawler), Next.js bootstrap, service-specific Prisma setup, protobuf code generation, environment variable contract, and testing strategy. Do not implement crawler, AI CV generation, billing or the full schema yet. After I approve the plan, implement Phase 0 with runnable commands and verification checks. Respect all confirmed stack decisions and open decisions in this document.


---

## 18. Architecture revision v1.3 — authoritative overrides

**Status:** This section supersedes earlier text wherever the architecture conflicts. Earlier sections describe product requirements and initial implementation ideas; implement the architecture in this section as the source of truth. This is a **microservice-ready, incrementally deployed service-oriented architecture**, not a requirement to split every feature immediately. gRPC is a transport choice, not a reason by itself to create microservices.

### 18.1 Product goals and engineering goals

Product: a trustworthy Pakistan-first (later Asia-wide) platform that discovers legitimate scholarships and public/private universities, tracks scholarship cycles and verified requirements, checks student eligibility, prepares application-specific documents, and supports paid AI tools. Free official links, basic eligibility and mandatory requirements remain accessible. No admission/scholarship guarantees or fabricated documents.

Engineering: practice domain boundaries, API Gateway/BFF patterns, gRPC and protobuf compatibility, asynchronous processing, idempotency, transactional outbox, database ownership, observability, distributed tracing, contract testing, and secure deployment. Prefer correctness and operational simplicity over microservice count.

### 18.2 Deployment topology and service inventory

**Frontend**: Next.js/TypeScript/shadcn/ui on Vercel Pro for commercial production; communicates only over HTTPS with the public NestJS API Gateway. Do not connect browsers to gRPC or internal services.

**Public API Gateway (NestJS)**: one internet-facing backend on Hostinger VPS, behind Nginx TLS. Owns public REST endpoints, validation, throttling, correlation IDs, session-cookie handling and CSRF controls, authorization checks, response aggregation, and routing. Does not directly query another service's tables. Can host the initial Identity and Application modules until extraction is justified.

**Scholarship Service (NestJS gRPC)**: first separately deployed domain service. Owns countries/universities/programs/scholarships/cycles, catalog search, source provenance, verified eligibility rules, expiry/archive/reopening, and catalog admin review. Provides versioned gRPC APIs to Gateway and worker. All data mutations are made through this service or its owned worker logic.

**Crawler Service (Python gRPC)**: independent private service using Scrapy/Cheerio-equivalent Python parsers, httpx and Playwright only where needed. Performs permitted source fetching, extraction of raw text and metadata, conditional requests and hashes. Does not have database write privileges for Scholarship Service. Returns bounded payloads or object-storage references. It does not independently publish scholarships.

**Background Worker (NestJS/Node + BullMQ)**: separate deployable process, not a public API. Schedules discovery, refresh, AI extraction, verification tasks, lifecycle checks, notifications, AI document generation and export. Calls Python Crawler via gRPC, and Scholarship Service via its internal gRPC commands. Workers can be split by queue and scaled independently later.

**Identity Service (planned extraction)**: initially a well-isolated NestJS module in Gateway for Google OIDC authorization-code flow + PKCE, secure session handling, student profiles and RBAC. Extract to NestJS gRPC only after contracts and operational needs justify it. The Gateway validates sessions at the trust boundary; never rely on a browser-provided role.

**Application Service (planned extraction)**: initially isolated module for saved opportunities, student applications, document checklists, CV versions and generated documents. Extract later; access Scholarship Service only via gRPC, not cross-service SQL. AI and billing can remain modules/worker jobs initially.

**Billing**: provider unselected. Model entitlements, credits and immutable ledger now, integrate a Pakistan-compatible payment provider only after verification. Never trust client payment-success redirects; verify signed webhooks and use idempotent transaction processing.

**Infrastructure**: one self-hosted PostgreSQL Docker server with *separate logical databases and DB users per independently owned service* (e.g. `identity_db`, `scholarship_db`, `application_db`); Redis for BullMQ; private object storage for documents and source snapshots; Nginx HTTPS; offsite backups and tested restores. Separate logical DBs are not separate physical PostgreSQL servers. No cross-database foreign keys, cross-service joins, or shared writable Prisma client. Stable UUIDs + API contracts + denormalized read models where necessary. Initial identity/application modules may have separate Prisma schemas/DB users even before process extraction.

### 18.3 Request and background flows

**Search:** Browser -> HTTPS Gateway REST `/v1/scholarships?...` -> Scholarship Service gRPC `SearchScholarships` -> indexed scholarship DB -> Gateway response. No live crawling or Gemini request during search. Catalog status and `last_verified_at` must be returned.

**Crawl:** BullMQ scheduled discovery/refresh -> Node worker -> Python gRPC `CrawlSource` -> source content/hash -> worker validation and optional Gemini structured extraction -> Scholarship Service gRPC `SubmitCandidate` -> provenance snapshot + duplicate check -> pending human review -> verified publication. Changed deadlines or mandatory requirements must trigger review; do not silently overwrite approved data.

**Expiry:** scheduler -> lifecycle queue -> Scholarship Service `ExpireCycles` using official deadline timezone -> mark EXPIRED and hide from default active search; preserve historical cycles and student links. Reopen an existing cycle only on verified extension; create a new cycle for a new year. For date-only deadlines, represent uncertainty and avoid inventing a closing hour.

**AI CV:** Gateway authorizes request/entitlement -> Application module creates immutable job + version intent -> BullMQ -> document worker loads authorized profile and program requirements -> Gemini structured result -> validate against source facts and anti-fabrication rules -> save version + generate PDF/DOCX -> object storage -> notify student. Idempotent credit reservation/settlement/refund on failure; don't double-charge on retries.

### 18.4 gRPC contract rules

- Keep `.proto` in `packages/contracts/proto/` with `scholarship.v1`, `crawler.v1` namespaces and generated TS/Python clients. Use `buf` or pinned protoc tooling and check backward compatibility in CI.
- Include request IDs, versioned message names, pagination and typed filters. Use `google.protobuf.Timestamp` or explicit timezone/date semantics; do not treat date-only values as timestamps.
- Define `SearchScholarships`, `GetScholarship`, `SubmitCandidate`, `ApproveCandidate`, `ExpireCycles` for Scholarship Service; `CrawlSource`, `GetSourceMetadata` for Python crawler. Avoid huge gRPC payloads; store large source snapshots in private object storage.
- Use deadlines, cancellation, bounded message sizes, concurrency limits and clear gRPC status mapping to public HTTP errors.
- Private Docker network only; never expose gRPC ports publicly. Authenticate internal callers (e.g. service identity/mTLS or a securely managed short-lived credential) and authorize each method. Docker network isolation alone is not authentication.
- No distributed transaction assumptions. Retries only for safe/idempotent operations with exponential backoff + jitter; deduplicate by stable job IDs and source/cycle keys.

### 18.5 Redis/BullMQ queues and delivery semantics

Queues: `source-discovery`, `source-crawl`, `source-extraction`, `source-verification`, `scholarship-lifecycle`, `student-notifications`, `ai-documents`, `document-export`, `maintenance`. Queue processors run in dedicated Node worker process(es). Python crawler is called from Node worker via gRPC, **not** a native BullMQ Python consumer.

BullMQ is at-least-once in practice: jobs can execute again after failure or stalled recovery. Persist authoritative job and business state in PostgreSQL; use unique constraints and idempotency keys. Set retries/backoff, timeouts, dead-letter/failure handling, and manual replay from admin. Keep queue payloads minimal (IDs/references, never passports or raw transcripts). Schedule near-deadline checks more frequently, respect source robots/ToS/rate limits, and cap Playwright concurrency for a 2-vCPU VPS.

For reliable DB-change-to-queue/event propagation, use a **transactional outbox** in the owning database with a dispatcher; don't pretend a DB commit and Redis enqueue are atomic. Consumers keep an inbox/processed-event record when side effects matter. Distinguish BullMQ jobs from durable cross-service domain events.

### 18.6 Catalog data model and lifecycle invariants

Scholarship identity persists across years. `scholarship_cycles` stores each annual/round-specific deadline, opening date, timezone, state and source verification. `scholarship_programs` is many-to-many; scholarships may be national and not tied to a single university. University `institution_type` (public/private) is distinct from tuition-free status. Preserve provenance at field or requirement level, content hashes, review decisions, source permissions, and `last_verified_at`.

Allowed lifecycle: DISCOVERED -> PENDING_REVIEW -> UPCOMING/OPEN -> EXPIRED -> ARCHIVED, with REJECTED/UNVERIFIED/PAUSED states as needed. A cycle's published status changes only after validated evidence, except deterministic deadline expiry based on verified timestamps. Student saved items and application histories always point to stable cycle IDs; archival never cascades to delete them. Student private documents follow separate consent/retention/deletion policy.

Eligibility returns `eligible`, `ineligible`, or `needs_review` with rule-level reasons and evidence. Do not infer missing requirements as zero, not-required, or eligible. If a source changes, mark the relevant result stale until reverified.

### 18.7 Proposed repository layout

```text
scholarship-saas/
  apps/
    web/                        # Next.js (Vercel)
    api-gateway/                # NestJS public REST, initial identity/application modules
    scholarship-service/       # NestJS private gRPC + owned Prisma schema
    worker/                    # NestJS BullMQ processors, schedulers, outbox dispatcher
    crawler-service/           # Python gRPC + Scrapy/httpx/Playwright
  packages/
    contracts/proto/           # versioned .proto files + generated clients
    types/                     # public DTOs, avoid shared domain persistence models
    ui/                        # reusable frontend components
    config/                    # env schema, lint/TS config
  prisma/
    identity/                  # separate Prisma config/migrations
    scholarship/               # separate Prisma config/migrations
    application/               # separate Prisma config/migrations
  infrastructure/
    docker/                    # Dockerfiles and healthchecks
    nginx/                     # HTTPS and gateway proxy
    monitoring/                # logs, metrics, traces
  docs/
    CONTEXT.md
    adr/                       # architecture decision records
    runbooks/                  # recovery, migration, incident response
  docker-compose.yml
  pnpm-workspace.yaml
```

### 18.8 Production engineering and security standards

- Auth: Google OIDC Authorization Code + PKCE, state/nonce checks, verified `iss/aud/sub`; HttpOnly Secure SameSite session cookies; CSRF protections; account-linking safeguards; short session TTL and revocation. No OAuth secrets in Next.js client bundles.
- Authorization: Gateway validates identity; downstream services also validate trusted service identity and user authorization context. Never trust an arbitrary `user_id` in a gRPC request.
- Student PII: encrypted transport and storage, least-privilege DB users, signed URLs, audit logs, private buckets, deletion/export controls. No sending passports/transcripts to AI providers without explicit informed consent and an approved data-handling configuration.
- Observability: JSON logs with request/job IDs, OpenTelemetry traces across Gateway/gRPC/workers, metrics for queue depth, crawl success, stale records, API p95 latency, failed PDF jobs, and billing reconciliation. Redact secrets and PII.
- Reliability: health/readiness endpoints, graceful shutdown, resource limits, DB connection pool limits, backup+restore drills, migration rollback plan, failure injection and restart recovery.
- CI: unit, integration, gRPC contract, E2E, security/dependency scanning, Prisma migration validation, proto compatibility checks, Docker build and smoke tests.
- Performance: indexed filters and cursor pagination; avoid cross-service fan-out per scholarship row (N+1). Use batched RPCs and cached materialized read models if needed. No Elasticsearch until measured search limitations justify it.

### 18.9 Cost-aware deployment plan

On Hostinger KVM 2 (2 vCPU, 8 GB RAM), run only essential independently deployed services: Gateway, Scholarship Service, one Node worker, Python crawler, PostgreSQL, Redis, Nginx. Limit browser crawls and PDF rendering to low concurrency, stagger heavy jobs, cap memory/CPU, and measure actual peak load. If resource pressure appears, move crawler/worker to another VPS before adding more always-on microservices. Vercel hosts frontend only. Provider prices and Gemini model IDs are configuration decisions, not hardcoded guarantees.

### 18.10 Milestones and acceptance criteria (revised)

**M0 Foundation:** pnpm monorepo; Next.js; NestJS Gateway + Scholarship Service; Python gRPC stub; versioned proto generation; PostgreSQL with service-owned DBs; Redis/BullMQ; Docker Compose; CI; health checks. Prove Gateway REST -> Scholarship gRPC and worker -> Python gRPC. Include automated integration tests.

**M1 Identity and catalog:** Google OAuth + secure session; RBAC; admin; university/program/scholarship/cycle schema; indexed filters; verified source evidence; fictional seeds separated from production.

**M2 Ingestion:** permission-aware provider adapters; discovery and refresh jobs; content hashes; extraction validation; review dashboard; deduplication; outbox/inbox; idempotent retries; source failure observability.

**M3 Lifecycle and applications:** timezone-aware expiry, archive/reopen, saved scholarships, student application state, eligibility and document checklists, deadline notifications.

**M4 AI studio:** academic CV templates, student fact model, university-specific tailoring, editable previews, version history, PDF/DOCX export, secure storage, credits and failure compensation.

**M5 Billing and production:** validated Pakistan-compatible provider, verified webhooks, entitlements, refund paths, rate limits, offsite backups, monitoring, load testing, privacy controls, pilot release.

**M6 Extract services only if justified:** Move Identity/Application modules into separate NestJS gRPC processes when operational independence, team ownership, load isolation or security requires it. Write ADR with measurable reason, migration strategy and rollback. Don't extract just to increase service count.

### 18.11 Engineering learning objectives

For each milestone, Gemini must explain the trade-offs and include one focused exercise: M0 gRPC timeout/contract evolution; M1 OAuth attack scenarios; M2 duplicate delivery and outbox replay; M3 timezone and state machine edge cases; M4 idempotent AI billing and document security; M5 tracing and load testing; M6 distributed data ownership and migration. Include unit/integration tests demonstrating the failure mode, not only happy paths.

### 18.12 Instructions to Gemini (override earlier conflicting instructions)

1. Inspect repo and this entire file; explicitly apply Section 18 when earlier sections conflict.
2. Plan and implement **one milestone at a time**. Never generate the whole platform in one response.
3. For M0, first provide an ADR and a resource-budget estimate for the 2-vCPU/8-GB VPS, then wait for approval before writing code.
4. Preserve service-owned DB boundaries and versioned protobuf contracts. Gateway is the only public backend.
5. Do not replace self-hosted PostgreSQL with Supabase, or replace BullMQ with an unapproved broker. No Kubernetes at MVP.
6. Write real tests, Docker healthchecks, `.env.example`, migrations, and reproducible run commands. Never commit secrets.
7. Treat all real scholarship content as untrusted, unverified until source evidence and review are complete. Follow access and redistribution permissions.
8. At end of each milestone provide: changed files, architectural decisions, commands, tests, remaining risks, and next milestone.

**Suggested first prompt:**

> Read `docs/CONTEXT.md` fully. Section 18 is authoritative for service architecture. We are beginning M0 only. Inspect the repository, then propose an ADR for the API Gateway + Scholarship gRPC service + Python crawler gRPC + Redis/BullMQ worker + self-hosted PostgreSQL on a 2-vCPU/8-GB VPS. Include repo structure, protobuf contracts, database ownership, Docker resource estimates, test strategy, and implementation sequence. Do not code until I approve the plan.
