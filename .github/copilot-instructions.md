# GitHub Copilot Code Review Instructions: spotq-payment-service

These instructions define the standards and review rules that GitHub Copilot should enforce when performing automated reviews on the `spotq-payment-service` repository.

## 1. Project Summary & Stack
- **Context**: A Node.js backend microservice handling payments for the SpotQ application.
- **Tech Stack**: TypeScript, Node.js 22, Express 5, Prisma 7 (PostgreSQL), Biome (Linting/Formatting), Jest (Testing), and BullMQ (Queues).

## 2. Directory Structure
- `src/domain/`: Domain logic and business rules.
- `src/application/`: Service orchestrations, use cases, and commands.
- `src/infrastructure/`: Database repositories, payment gateways (Razorpay), external integrations.
- `src/presentation/`: Express routers, controllers, and middlewares.
- `src/shared/`: Cross-cutting concerns (logging, configuration, errors).

## 3. Critical Review Guidelines

### A. Security & Payment Integrity
- **Secrets**: Flag any hardcoded API keys, tokens, or credential strings (e.g., Razorpay keys).
- **Validation**: Ensure all input payloads in controllers/routers are validated using `zod` schemas.
- **Amounts & Currency**: Payment amounts should be handled as integers (in lowest denomination, e.g. paisa/cents) to avoid floating-point errors.
- **Idempotency**: Verify that payment webhook handling and transaction creations are idempotent.

### B. Database & Prisma Guidelines
- **Connections & Transactions**: Prisma client queries should be verified for proper exception handling. Ensure transaction logic (`$transaction`) is used where multi-row operations are atomic.
- **Performance**: Flag any potential N+1 query patterns or missing database indexes for fields queried frequently.
- **Migration safety**: Ensure schema changes do not execute destructive operations without a backup or validation plan.

### C. Error Handling & Observability
- **Exceptions**: Ensure all async operations are wrapped in `try/catch` or passed to next handlers in Express.
- **Logging**: Use the custom Pino logger with standard structured keys (`serviceName`, `requestId`, `correlationId`, `traceId`). Do not use console.log/console.error.
- **Metrics**: Check that custom endpoints include appropriate telemetry instrumentation where necessary.

### D. Code Quality & Formatting
- **Linter & Formatter**: Biome configuration is active. Flag obvious style deviations.
- **Testing**: Ensure any new features or core logic files come with accompanying unit or integration tests under `test/` or `src/**/*.test.ts`.
