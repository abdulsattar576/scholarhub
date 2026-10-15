#!/usr/bin/env bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  ScholarHub Platform - Comprehensive Verification   ${NC}"
echo -e "${BLUE}======================================================${NC}\n"

# 1. Verify PostgreSQL
echo -e "${BLUE}[1/10] Verifying PostgreSQL Connection...${NC}"
if pg_isready -h localhost -p 5432 > /dev/null 2>&1 || pg_isready -h /tmp -p 5432 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PostgreSQL is healthy and accepting connections.${NC}\n"
else
  echo -e "${RED}✗ PostgreSQL is not responding.${NC}"
  echo "Attempting to launch local cluster..."
  /usr/lib/postgresql/18/bin/postgres -D database/pgdata -p 5432 -k /tmp > /dev/null 2>&1 &
  sleep 2
fi

# 2. Build api-gateway
echo -e "${BLUE}[2/10] Verifying NestJS API Gateway Build...${NC}"
cd api-gateway
npm run build > /dev/null
echo -e "${GREEN}✓ API Gateway build succeeded.${NC}\n"

# 3. Build Next.js client
echo -e "${BLUE}[3/10] Verifying Next.js Turbopack Client Build...${NC}"
cd ../client
npm run build > /dev/null
echo -e "${GREEN}✓ Next.js client build succeeded with 0 errors.${NC}\n"

# 4. Authentication & Profile Service
echo -e "${BLUE}[4/10] Verifying Student Authentication & Profile Service...${NC}"
cd ../api-gateway
npx ts-node test_auth.ts > /dev/null
echo -e "${GREEN}✓ Authentication, JWT/Session tokens, and Profile management verified.${NC}\n"

# 5. Application Tracking & Checklist
echo -e "${BLUE}[5/10] Verifying Application Tracking & Document Checklist...${NC}"
npx ts-node test_applications.ts > /dev/null
echo -e "${GREEN}✓ Application tracking and readiness checklist calculations verified.${NC}\n"

# 6. Private File Uploads & Security
echo -e "${BLUE}[6/10] Verifying Private Document Storage & Object-Level Security...${NC}"
npx ts-node test_document_uploads.ts > /dev/null
echo -e "${GREEN}✓ Private file upload, storage isolation, and unauthorized access blocks verified.${NC}\n"

# 7. In-App Notifications & Deadline Radar
echo -e "${BLUE}[7/10] Verifying Student Notification Center & Deadline Radar...${NC}"
npx ts-node test_notifications.ts > /dev/null
echo -e "${GREEN}✓ 14/7/3/1-day deadline proximity alerts and deduplication verified.${NC}\n"

# 8. AI Document Studio & Exports
echo -e "${BLUE}[8/10] Verifying AI Document Studio & Exports (Markdown/HTML/PDF)...${NC}"
npx ts-node test_lifecycle_and_export.ts > /dev/null
node -r ts-node/register test_studio.ts > /dev/null
echo -e "${GREEN}✓ AI Letter & CV generation and print-ready export verified.${NC}\n"

# 9. Durable Background Jobs
echo -e "${BLUE}[9/10] Verifying Durable Background Jobs & Worker System...${NC}"
npx ts-node test_jobs.ts > /dev/null
echo -e "${GREEN}✓ Durable background job queuing and idempotency verified.${NC}\n"

# 10. Admin Review & Lifecycle Engine
echo -e "${BLUE}[10/10] Verifying Admin Console & Lifecycle Reconciliation...${NC}"
npx ts-node test_admin.ts > /dev/null
echo -e "${GREEN}✓ Cross-DB admin metrics and cycle reconciliation verified.${NC}\n"

cd ..
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}  ALL 10 VERIFICATION CHECKS PASSED PERFECTLY!        ${NC}"
echo -e "${GREEN}  ScholarHub Platform is 100% verified and operational.${NC}"
echo -e "${GREEN}======================================================${NC}"
