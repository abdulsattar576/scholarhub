# ADR 001: Service-Oriented Microservice Architecture, Protobuf Contracts, and Resource Budget

- **Status:** Approved
- **Date:** 2026-10-14
- **Context:** Milestone 0 (M0 - Foundation) of Scholarship SaaS per `SCHOLARSHIP_SAAS_CONTEXT.md` (v1.3 authoritative overrides).

## 1. Context & Problem Statement
The platform requires a clean service-oriented architecture separating public web interactions, scholarship catalog ownership, background crawling, and asynchronous job processing, while keeping deployment lightweight enough to run reliably on a 2 vCPU / 8 GB RAM Hostinger VPS.

## 2. Decision

### 2.1 Repository Layout (Monorepo)
```text
scholarship-platform/
  apps/
    web/                        # Next.js (Client frontend)
    api-gateway/                # NestJS public REST API gateway (Auth, routing, validation)
    scholarship-service/       # NestJS private gRPC microservice (Catalog & rules owner)
    worker/                    # NestJS BullMQ background queue worker
    crawler-service/           # Python gRPC crawler service (Scrapy / Playwright)
  packages/
    contracts/proto/           # Protobuf definitions (crawler.v1, scholarship.v1)
    types/                     # Shared TypeScript DTOs and contracts
    config/                    # Shared system configurations and queue constants
  prisma/
    identity/                  # Isolated logical DB schema: identity_db
    scholarship/               # Isolated logical DB schema: scholarship_db
    application/               # Isolated logical DB schema: application_db
  infrastructure/
    docker/                    # Dockerfiles, init-db.sh, healthchecks
```

### 2.2 Protobuf & RPC Contracts
- **`crawler.v1` (`crawler.proto`)**: Defines `CrawlPage` and `Health`. Invoked over gRPC solely by the background worker. Python crawler never writes directly to PostgreSQL.
- **`scholarship.v1` (`scholarship.proto`)**: Defines `SearchScholarships`, `GetScholarship`, `SubmitCandidate`, `ApproveCandidate`, `ExpireCycles`, and `Health`. Invoked by the API Gateway and background worker.

### 2.3 Database Isolation & Ownership
- One PostgreSQL 16 container hosts three logically isolated databases: `identity_db`, `scholarship_db`, and `application_db`.
- Each database is owned by a dedicated PostgreSQL user (`identity_user`, `scholarship_user`, `application_user`).
- No cross-database foreign keys, cross-service SQL joins, or shared writable Prisma clients.

### 2.4 Resource Budget (2 vCPU / 8 GB RAM VPS)
| Service | CPU Limit | Memory Reservation | Memory Limit |
|---|---|---|---|
| PostgreSQL 16 | 1.0 CPU | 256 MB | 1,024 MB |
| Redis 7 | 0.5 CPU | 128 MB | 384 MB |
| Scholarship Service (gRPC) | 0.5 CPU | - | 512 MB |
| Crawler Service (Python gRPC) | 0.5 CPU | - | 768 MB |
| Worker (BullMQ) | 0.5 CPU | - | 512 MB |
| API Gateway (REST) | 0.5 CPU | - | 512 MB |
| Next.js Web | 0.5 CPU | - | 512 MB |
| **Total Peak Limits** | - | - | **~4.2 GB (Well within 8 GB)** |

The remaining ~3.8 GB is reserved for Linux kernel overhead, Nginx TLS proxy, and file page cache.

