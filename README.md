# SpotQ Payment Service

The **SpotQ Payment Service** is a high-performance, production-ready backend service designed to manage customer payments, gateway integrations, transaction lifecycles, and transaction status tracking. 

Built using **TypeScript**, **Express 5**, **Clean Architecture**, and modern observability practices, this service ensures resilience, low latency, and comprehensive system insights.

---

## Technology Stack
- **Runtime & Language:** Node.js (v22+), Express 5, TypeScript (v7+)
- **ORM & Database:** Prisma 7 with PostgreSQL (configured via `@prisma/adapter-pg` driver adapter)
- **Caching & Pub/Sub:** Redis (using `redis` & `ioredis` clients)
- **Job Queue:** BullMQ (for asynchronous background transaction processing)
- **Payment Gateway:** Razorpay SDK (with `IPaymentGateway` domain abstraction)
- **Secret Management:** Infisical CLI (for secure environment variable injections)
- **Log Management:** Pino Logger (configured with native `AsyncLocalStorage` request-context tracking)
- **Monitoring & Metrics:** `prom-client` (exposing system, network, and connectivity metrics)
- **Quality & Formatters:** Biome (for lightning-fast linting and code formatting)
- **Testing:** Jest with `@swc/jest` compiler & Grafana k6 (load testing)
- **Package Manager:** `pnpm` (v11+)
- **Bundler:** `tsup` (esbuild-powered ESM bundler)

---

## System Architecture & Path Aliases

The codebase strictly follows **Clean Architecture** patterns:
- **`@domain/*` (`src/domain/`)**: Core business rules, entities, value objects, and domain interfaces (e.g. `IPaymentGateway`). Independent of any third-party framework or database.
- **`@application/*` (`src/application/`)**: Application use cases and business workflows.
- **`@infrastructure/*` (`src/infrastructure/`)**: Concrete adapters for external systems (Prisma Database, Redis, BullMQ, RazorpayGateway adapter, Logger, Prometheus Metrics, and Lifecycle orchestrator).
- **`@presentation/*` (`src/presentation/`)**: HTTP entrypoints, Express routes, and middlewares (error handler, trace logging, metrics collection, 404 handler).
- **`@modules/*` (`src/modules/`)**: Feature domains (such as modular `health` check domain).
- **`@shared/*` (`src/shared/`)**: Shared constants, HTTP status code enums, and message definitions.
- **`@config/*` (`src/config/`)**: Environment validation schemas and configuration objects.

---

## Key Features

### 1. Production-Ready Health Monitoring (`GET /health` & `GET /ready`)
Exposes the status of the service and all underlying dependencies:
```json
{
  "status": "UP",
  "timestamp": "2026-08-09T01:23:31.000Z",
  "checks": {
    "application": "UP",
    "database": "UP",
    "redis": "UP",
    "bullmq": "UP",
    "razorpay": "UP"
  }
}
```
- **Database Connection Check:** Evaluates connection pooling state via Prisma's `SELECT 1`.
- **Redis Connection Check:** Queries latency status via `PING` -> `PONG`.
- **BullMQ Queue Check:** Verifies Redis queue broker connection state.
- **Razorpay SDK Check:** Validates gateway credentials and client readiness.
- **HTTP Status Codes:** Returns `200 OK` when all systems are healthy, and `503 Service Unavailable` if any check returns `DOWN`.

### 2. Structured JSON Logging with Trace Correlation
Every log message is outputted in structured JSON via **Pino** and automatically correlates with the incoming HTTP request context using Node's native **`AsyncLocalStorage`**:
- **Automatic Headers:** Every response returns `x-request-id`, `x-correlation-id`, and `x-trace-id`.
- **Auto-injected Fields:** Every log statement emitted during the request automatically contains `"requestId"`, `"correlationId"`, and `"traceId"`.
- **Formatting:** Log levels are standardized to uppercase (e.g. `INFO`, `ERROR`) and timestamps use ISO strings.
- **Stack Traces:** Errors logged via `logger.error` are automatically serialized to include the error name, message, and structured stack trace.

### 3. Prometheus Observability Metrics (`GET /metrics`)
Exposes runtime metrics compiled in the standard Prometheus exposition format:
- **Process Metrics:** Default Node.js system gauges (CPU usage, resident memory bytes, event loop lag percentiles, active handles/requests).
- **Request Volume (`http_requests_total`):** Counters tracking HTTP status rates, methods, and matched Express routes.
- **Request Latency (`http_request_duration_seconds`):** Histograms measuring response times.
- **Dependency State (`database_up` / `redis_up`):** Gauges measuring active connection status (1 for connected, 0 for disconnected) evaluated dynamically during scraper polls.

### 4. Secure Secrets Management (Infisical CLI)
Environment credentials are kept out of the codebase and Git history:
- In production, secrets are fetched dynamically at boot and injected using the **Infisical CLI**: `infisical run -- <command>`.
- In local development, the configuration seamlessly falls back to reading standard `.env` values when Infisical credentials are not present.

---

## Getting Started

### 1. Prerequisites
- Install **Node.js** (v22+)
- Install **pnpm** (v11+)
- Install **Infisical CLI** (optional for local fallback mode, required for syncing workspace keys)

### 2. Setup Dependencies & Services
```bash
# Clone the repository and install packages
pnpm install
```

### 3. Generate Prisma Client
```bash
pnpm run prisma:generate
```

### 4. Running the Application
- **Local Fallback Mode (Using `.env` values):**
  ```bash
  pnpm run dev
  ```
- **Infisical Mode (Syncing secrets from workspace):**
  ```bash
  pnpm run dev:infisical
  ```

---

## Testing & Validation

### Run Unit Tests
Unit tests use Jest compiled via SWC for speed:
```bash
pnpm test
```

### Run Load Testing (k6)
```bash
k6 run test/load-test.js
```

### Formatting and Linting Checks
Biome handles styling and static checks. To audit the codebase:
```bash
pnpm run lint
```
To automatically apply Biome's formatting fixes:
```bash
pnpm run format
```

---

## Docker Deployment
The service includes a multi-stage `Dockerfile` optimized for minimal production image footprint:

- **Build Stage:** Installs dev dependencies, generates the Prisma client binaries, and compiles TypeScript source code using `tsup`.
- **Production Stage:** Prunes dev dependencies, installs the **Infisical CLI** for secure runtime injections, switches to a non-root `appuser` for security, and configures a Docker healthcheck using `wget` against `/health`.

---

## Branching Strategy

### Permanent Branches
- `main`
- `staging`
- `development`

### Working Branches (must follow ticket key matching convention)
- `feat/<feature>`
- `fix/<issue>`
- `refactor/<module>`
- `docs/<topic>`
- `chore/<task>`
- `hotfix/<issue>`

> **Branch Name Rule:** Working branches must include a JIRA ticket key matching: `^(feat|fix|chore|refactor|hotfix)/SCRUM-[0-9]+(-.+)?$`

---

## Coding Standards
We strictly adhere to the following standards:
- **Clean Architecture & SOLID:** Strict separation between Domain, Application, Infrastructure, and Presentation layers.
- **TypeScript Strict Mode:** High type safety across source and test files.
- **Biome Formatting & Linting:** Formatting and static check compliance.
- **Structured Logging:** Unified Pino JSON logger configuration tracking request contexts (`requestId`, `correlationId`, `traceId`).
- **Prometheus Metrics:** Tracking request count, duration, and connection health states.
- **Conventional Git Commits:** Standardized semantic commit messages.

---

## CI Pipeline
The GitHub Actions pipeline is configured to automatically validate code quality on every push and pull request. The pipeline runs:
1. **Dependency Installation:** Restores cache and installs dependencies using `pnpm`.
2. **Prisma Client Generation:** Pre-generates typescript types from Prisma schema.
3. **Lint & Format Validation:** Audits compliance via Biome.
4. **TypeScript Build Verification:** Compiles TS source checks via `tsc --noEmit && tsup`.
5. **Unit Tests Run:** Executes Jest test suites.
6. **Docker Build:** Verifies container image builds successfully.

### Triggers
- **Pull Requests:** Targeting `development`, `staging`, or `main`.
- **Pushes:** To `development`, `staging`, or `main` branches.

---

## Development Guidelines

### Pre-commit Check
Before pushing your changes or opening a PR, always execute local validation scripts:
```bash
# Run Biome linter check
pnpm lint

# Run Jest unit tests
pnpm test

# Build TypeScript target output
pnpm build
```

### Verification Checks
1. Ensure the application endpoints `/health` and `/ready` return successful statuses (`200 OK`) and include all dependencies states.
2. Verify `/metrics` correctly outputs Prometheus format values.
3. Ensure the local Docker container builds successfully via `docker-compose up -d --build`.
