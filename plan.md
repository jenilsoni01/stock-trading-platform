# PROJECT: Stock Trading & Paper Trading Platform — Production-Style Distributed Microservices

## 1. YOUR ROLE

Act as a senior backend engineer, distributed-systems architect, DevOps engineer, security engineer, and technical mentor.

Build a complete, runnable, well-documented **Stock Trading & Paper Trading Platform** for a university Microservice Architecture and Programming innovative assignment.

This is a simulated trading platform. It must never handle real money, connect to a brokerage account, or place real stock-market orders.

Do not merely generate a project plan, architecture diagrams, pseudocode, or incomplete code. Implement the actual project incrementally, verify it with tests, and document every setup and operational procedure.

Prioritize correctness, service boundaries, strong backend design, distributed-systems concepts, observability, security, and reproducible deployment over unnecessary frontend complexity.

## 2. TEAM MEMBERS AND OWNERSHIP

This project will be developed initially on one Windows computer and subsequently distributed across five team members' computers.

Team members:

1. Kevl Dholakiya — 23BCE066 — Python — macOS
2. Harsh Thakkar — 23BCE091 — C++ — Windows
3. Jeel Dhamsaniya — 23BCE116 — Go — macOS
4. Jenil Soni — 23BCE119 — Java — Windows
5. Krish Chothani — 23BCE151 — Node.js — Windows

Use these languages as the initial service ownership assignments. You may recommend changing a language only when a specific technical limitation makes it necessary. Do not change languages silently.

Initial ownership:

- Kevl: Portfolio Service — Python/FastAPI.
- Harsh: Order Service — C++/Drogon.
- Jeel: Market Data Service — Go.
- Jenil: Identity and Wallet Service — Java/Spring Boot.
- Krish: Notification Service — Node.js/Express.

Jenil will initially coordinate integration and run the complete project on one Windows PC. All other members must eventually be able to run and test their assigned services independently.

A team member may need to run multiple containers or supporting services. Do not require all five developers to install every programming language and database locally.

## 3. PROJECT OBJECTIVE

Build a realistic paper-trading application where users can:

- Register and authenticate.
- Receive a virtual starting balance.
- Browse listed stocks and their simulated prices.
- View price history.
- Place market BUY and SELL orders.
- Reserve virtual cash for BUY orders.
- Reserve available shares for SELL orders.
- Execute orders against a deterministic simulated market.
- Cancel eligible pending orders.
- View balances, holdings, average purchase prices, realized P&L, and unrealized P&L.
- View order history and trade history.
- Receive order-status notifications.
- View market activity and system-health information.

Use INR as the display currency. All monetary calculations must use integer paise or an equivalent fixed-precision decimal representation. Never use binary floating-point arithmetic for wallet balances, trade values, fees, or other financial amounts.

Implement a simulated matching/execution mechanism with documented pricing and fill rules. The MVP may support market orders only; limit orders are an optional later milestone.

Do not claim to implement a real exchange, institutional-grade HFT engine, or production financial infrastructure.

## 4. NON-NEGOTIABLE ARCHITECTURAL RULES

1. Each business microservice must be independently buildable, runnable, testable, and deployable.
2. Each business microservice must own its own database and schema.
3. A service must never directly query, modify, or share another service's database.
4. All cross-service synchronous communication must use documented REST or gRPC APIs.
5. Asynchronous business events must use Kafka.
6. Implement a real Transactional Outbox pattern, not a fake implementation that writes to the database and then publishes directly without recovery.
7. Implement idempotent event consumers and durable event processing.
8. Implement a Saga or an equivalently explicit orchestrated workflow for multi-service order processing.
9. Apply ACID guarantees to local financial transactions and eventual consistency to derived views.
10. Implement CQRS where appropriate, with a genuine independently maintained read model.
11. Implement service discovery, an API Gateway, circuit breaking, monitoring, and centralized logging.
12. Use Docker for every database, broker, cache, and supporting infrastructure component.
13. Use Kubernetes manifests for deployable business services and infrastructure integration. Use a local Kubernetes distribution such as kind or Docker Desktop Kubernetes where practical.
14. Use a Python virtual environment for all local Python development. Never install project Python packages globally.
15. Never hardcode developer-specific IP addresses in source code.
16. Do not commit credentials, private keys, access tokens, passwords, or real secrets to Git.
17. Never fake a passing test, a successful deployment, or completed functionality.
18. Do not put all business logic in the API Gateway.
19. Do not introduce distributed database transactions or pretend Kafka and a relational database share one ACID transaction.
20. Document every trade-off, failure mode, consistency guarantee, and recovery procedure.

## 5. RECOMMENDED TECHNOLOGY STACK

### Business services

**Identity and Wallet Service**
- Language: Java.
- Framework: Spring Boot.
- Security: Spring Security and JWT.
- Database: PostgreSQL.
- Migrations: Flyway.
- Responsibilities: users, roles, authentication, wallet ledger, balance reservations, and wallet transaction history.

**Market Data Service**
- Language: Go.
- Framework: Gin or Chi.
- Database: MongoDB.
- Responsibilities: stock metadata, simulated price generation, price history, current quotes, and market-data events.

**Order Service**
- Language: C++.
- Framework: Drogon.
- Database: MySQL.
- Responsibilities: order lifecycle, order validation, execution workflow, order records, trades, outbox records, and saga state where appropriate.

**Portfolio Service**
- Language: Python.
- Framework: FastAPI.
- Database: Redis.
- Responsibilities: materialized portfolio read model, holdings, portfolio summaries, and P&L projections.
- Python development must use `.venv`.

**Notification Service**
- Language: Node.js using JavaScript ES modules.
- Framework: Express.
- Database: Firestore emulator or another clearly documented Firestore-compatible local development setup, running in Docker where supported.
- Responsibilities: in-app notifications, notification preferences, notification history, and asynchronous event consumption.
- If local Firestore emulation cannot be reliably containerized, document a fully local alternative and preserve database ownership. Do not silently depend on a paid cloud service.

### Infrastructure

Use:

- Spring Cloud Gateway or an equivalent actively maintained gateway.
- Eureka for service discovery where compatible with the deployment model.
- Apache Kafka in Docker.
- PostgreSQL in Docker.
- MongoDB in Docker.
- MySQL in Docker.
- Redis in Docker.
- Firestore Emulator in Docker if supported by the selected image and runtime.
- Prometheus for metrics.
- Grafana for dashboards.
- OpenTelemetry for tracing where practical.
- Loki or OpenSearch for centralized logs.
- Docker Compose for local integration.
- Kubernetes manifests or Helm charts for multi-service deployment.
- Git for version control.

Use pinned, compatible versions. Do not blindly select incompatible latest versions. Document Java, Go, C++, Node.js, Python, Docker, Kubernetes, and other prerequisites.

Prefer well-supported libraries. Do not introduce a framework merely because it is fashionable.

## 6. CORRECT SERVICE BOUNDARIES

Create exactly five business microservices:

### A. Identity and Wallet Service — Java

Owns:
- Users.
- Roles.
- Password hashes.
- Authentication-related data.
- Wallet accounts.
- Wallet ledger.
- Cash reservations.
- Idempotency records for financial commands.

Suggested APIs:

POST `/api/v1/auth/register`

POST `/api/v1/auth/login`

GET `/api/v1/users/me`

GET `/api/v1/wallet`

GET `/api/v1/wallet/transactions`

POST `/internal/v1/wallet/reservations`

POST `/internal/v1/wallet/reservations/{id}/capture`

POST `/internal/v1/wallet/reservations/{id}/release`

Provide internal APIs for reserving cash, capturing a completed BUY, releasing unused reserved cash, and crediting SELL proceeds.

Wallet operations must use database transactions, appropriate row locking or optimistic concurrency control, unique idempotency keys, and a ledger that records every balance-changing operation.

Never allow a wallet to be overspent by concurrent orders.

Represent available cash, reserved cash, and ledger movements consistently. Define and enforce invariants.

Never trust a user ID supplied by the client when the authenticated identity is available in the JWT.

### B. Market Data Service — Go

Owns:
- Stock metadata.
- Simulated quotes.
- Price history.
- Market simulation configuration.

Suggested APIs:

GET `/api/v1/stocks`

GET `/api/v1/stocks/{symbol}`

GET `/api/v1/stocks/{symbol}/quote`

GET `/api/v1/stocks/{symbol}/history`

gRPC endpoint for internal price lookup.

Use a configurable deterministic price simulator for development and testing. Make test scenarios reproducible with fixed prices and a controllable simulation clock.

Do not generate uncontrolled background traffic or unbounded database growth.

Expose a health endpoint, readiness endpoint, and metrics.

Market prices used for order execution must have timestamps and a clearly defined stale-price policy.

### C. Order Service — C++/Drogon

Owns:
- Orders.
- Trade records.
- Order state transitions.
- Execution workflow.
- Saga state where appropriate.
- Transactional outbox records.
- Idempotency records for order submissions.

Suggested APIs:

POST `/api/v1/orders`

GET `/api/v1/orders`

GET `/api/v1/orders/{id}`

POST `/api/v1/orders/{id}/cancel`

GET `/api/v1/trades`

Implement strict validation and explicit order-state transitions.

A reasonable initial lifecycle is:

CREATED → VALIDATING → ACCEPTED → EXECUTING → EXECUTED

Failure paths:

CREATED → REJECTED

VALIDATING → REJECTED

ACCEPTED → CANCELLED

EXECUTING → COMPENSATING → FAILED

Choose states appropriate to the implemented workflow and document the allowed transitions.

Use database constraints to prevent duplicate order IDs and duplicate client idempotency keys.

Cancellation must be race-safe. Once execution is irrevocably committed, cancellation must not pretend to reverse it.

An execution must not produce duplicate trades if a Kafka message is delivered multiple times or a worker restarts.

Implement an actual matching/execution rule. For the MVP, a market order may execute against a deterministic quote after validation, subject to the documented reservation and failure rules.

Do not use an in-memory map as the authoritative order store.

### D. Portfolio Service — Python/FastAPI

Owns:
- Portfolio materialized view.
- Holdings projection.
- Average cost.
- Realized P&L and unrealized P&L projections.
- Projection checkpoints and event-processing state where suitable.

Consume completed-trade events from Kafka.

Use Redis for persistent materialized state and projection checkpoints. Configure persistence appropriately for local development.

Suggested APIs:

GET `/api/v1/portfolio`

GET `/api/v1/portfolio/holdings`

GET `/api/v1/portfolio/performance`

GET `/api/v1/portfolio/positions/{symbol}`

Expose the projection's last processed event offset or equivalent freshness indicator.

P&L must be calculated consistently and documented, including the average-cost methodology and SELL behavior.

A projection must be recoverable by replaying retained events or rebuilding from an authoritative trade-history source. Do not treat an ephemeral cache as the only permanent record of completed trades.

Create `.venv`, `requirements.txt` or a pinned equivalent, and clear activation commands for PowerShell, macOS/Linux shells, and CI.

### E. Notification Service — Node.js/Express

Owns:
- In-app notifications.
- Notification preferences.
- Notification delivery status.
- Notification history.

Consume relevant Kafka events, including order accepted, order rejected, order executed, order cancelled, and other meaningful status events.

Suggested APIs:

GET `/api/v1/notifications`

PATCH `/api/v1/notifications/preferences`

POST `/internal/v1/notifications/test` in development only.

Notification delivery must be idempotent.

Persist the notification before acknowledging the corresponding Kafka message.

A failure to send a notification must not reverse a completed trade.

Use JavaScript ES modules, not CommonJS.

## 7. CRITICAL FINANCIAL WORKFLOW

Design and implement the complete BUY and SELL workflows before building secondary features.

### BUY workflow

1. Client submits an order with an idempotency key.
2. API Gateway validates the JWT and forwards the request.
3. Order Service validates the request and records an order/workflow state.
4. Order Service obtains a current quote through gRPC.
5. Wallet Service atomically reserves the required cash using an idempotent internal API.
6. Order Service executes the simulated trade using the documented pricing rules.
7. Wallet Service captures the required cash and releases any excess reservation if the execution price differs from the reservation estimate.
8. The authoritative trade/order outcome is committed durably.
9. Business events are emitted through the Transactional Outbox.
10. Portfolio Service consumes the completed-trade event and updates its materialized view.
11. Notification Service consumes the event and persists a notification.
12. The frontend can poll or query order status until the workflow reaches a terminal state.

For a deterministic market simulator, the reserved amount may equal the execution amount. Still implement the interfaces and invariant needed for price differences.

### SELL workflow

1. Validate the requested quantity against available holdings.
2. Reserve the shares or establish an equivalent durable position reservation.
3. Execute the trade.
4. Record the authoritative completed trade.
5. Credit the seller's virtual cash using an idempotent wallet operation.
6. Release unused reservations when appropriate.
7. Publish durable events through the outbox.
8. Update portfolio projections and notifications asynchronously.

The Portfolio Service is a derived view, not an unquestioned authority for tradeable quantities. Define how the authoritative share-availability check and reservation work without introducing an unsafe check-then-act race.

Implement a durable position reservation or another explicit, concurrency-safe protocol. Do not allow concurrent SELL orders to oversell a position.

### Failure handling

Document and implement compensation for failures occurring after cash or share reservation.

Examples:

- Market lookup fails.
- Wallet reservation fails.
- Order service restarts.
- Kafka is unavailable.
- A consumer processes the same event twice.
- A notification database is unavailable.
- An execution outcome is uncertain.
- A saga coordinator restarts.
- A cancellation races with execution.

Never release a reservation merely because a network request timed out if the remote operation might have succeeded. Use idempotent operation IDs, status lookup, retries, and reconciliation.

Use a durable saga/workflow state machine. Explain which service owns each state transition and which records are authoritative.

The system must be able to reconcile unresolved workflows after a restart.

## 8. ACID, BASE, SAGA, CQRS, OUTBOX, AND CDC

Implement these patterns genuinely and document where each applies.

### ACID

Use local ACID transactions for:
- Wallet ledger changes.
- Cash reservation and capture.
- Position reservation where stored authoritatively.
- Order and trade persistence.
- Outbox event insertion.

Enforce business invariants with database constraints and transactional logic.

### BASE / eventual consistency

Accept bounded eventual consistency for:
- Portfolio read models.
- Notifications.
- Dashboard summaries.
- Trade analytics.

Expose projection freshness so users and evaluators can see when a view is behind.

### Saga

Implement a durable orchestrated or explicitly documented choreography-based Saga for the multi-service order lifecycle.

Use compensating actions for failed reservations and unfinished workflows.

Do not call a sequence of unrelated HTTP requests a Saga without durable workflow state, idempotency, and recovery behavior.

### Transactional Outbox

In the service that owns the business state and event, persist the state change and outbox event in the same database transaction.

The publisher must be restartable and retry safely.

Avoid the dual-write bug.

### CDC

Use Debezium with Kafka Connect to capture changes from the MySQL outbox table and publish them to Kafka if this can be implemented reliably with pinned compatible versions.

Configure the connector and its schemas in version-controlled files.

Use a dedicated outbox table and configure the connector to publish intended domain events rather than every arbitrary database change.

Document the difference between:
- Business state changes.
- Outbox records.
- CDC records.
- Kafka messages.

If the full CDC deployment is too large for the first milestone, first implement the transactional outbox with a reliable polling relay. Then add Debezium as a separate milestone. Never label a polling relay as CDC.

### CQRS

Use the Order Service's authoritative relational records for writes and queries that require canonical order status.

Use Kafka to update the Portfolio Service's Redis read model.

Implement at least one query that reads the materialized projection rather than recomputing everything from the write database.

Document replay, rebuild, event versioning, and projection idempotency.

## 9. SYNCHRONOUS COMMUNICATION

Use both REST and gRPC for meaningful use cases.

REST:
- Frontend to Gateway.
- Gateway to business APIs.
- Order workflow to internal wallet commands where appropriate.

gRPC:
- Order Service to Market Data Service for quote lookup.

Define a `.proto` file and generate compatible client/server code.

Implement:
- Explicit deadlines.
- Timeouts.
- Error mapping.
- Request validation.
- Retry policies only where safe.
- Correlation IDs or trace context.

Do not blindly retry a non-idempotent financial command.

## 10. ASYNCHRONOUS COMMUNICATION

Use Kafka for business events.

Create documented topics such as:

- `orders.created`
- `orders.accepted`
- `orders.rejected`
- `orders.executed`
- `orders.cancelled`
- `trades.executed`
- `wallet.reservation.failed`
- `wallet.reservation.completed`
- `positions.reserved`
- `positions.released`
- `portfolio.updated`
- `notifications.requested`

Adjust topic ownership and event names to avoid redundant or contradictory events.

Define an event envelope containing:
- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `aggregateId`
- `correlationId`
- `causationId`
- `payload`

Use a consistent timestamp format and documented serialization.

Select partition keys deliberately. For order/trade events, consider an order or aggregate ID to preserve ordering where needed.

Implement:
- Consumer groups.
- Consumer idempotency.
- Retry and backoff.
- Dead-letter handling.
- Poison-message handling.
- Consumer lag metrics.
- Event schema compatibility rules.
- Offset and acknowledgment behavior.

Do not promise global Kafka ordering.

Document at-least-once delivery and explain how effectively-once business outcomes are achieved using durable deduplication and idempotent operations.

## 11. API GATEWAY AND SERVICE DISCOVERY

Configure the API Gateway with routes for the five services.

Gateway responsibilities:
- Request routing.
- JWT verification.
- Rate limiting.
- Request size limits.
- CORS.
- Correlation IDs.
- Access logging.
- Safe error responses.
- Health and readiness endpoints.

Never expose internal database ports or privileged internal APIs publicly.

Implement Eureka discovery where appropriate.

For Kubernetes, prefer Kubernetes Services and cluster DNS for internal service addressing, or explicitly document how Eureka and Kubernetes DNS coexist.

Do not introduce two discovery systems without a clear reason.

No internal URL should depend on a developer's hardcoded IP.

## 12. CIRCUIT BREAKER AND RESILIENCE

Implement circuit breaking for suitable synchronous dependencies.

Use a Java gateway-side circuit breaker where compatible and a C++-compatible or explicit library-based policy for the Order-to-Market gRPC call.

Document the selected implementation per language.

Support:
- Connection timeout.
- Request deadline.
- Circuit breaker.
- Limited retries for safe operations.
- Bounded concurrency.
- Graceful shutdown.
- Health and readiness checks.

Provide a reproducible failure-injection test that temporarily makes Market Service unavailable and proves that Order Service fails gracefully without an uncontrolled retry storm.

Do not implement a fake circuit breaker that only changes a variable.

## 13. SECURITY

Implement:
- Password hashing using an appropriate password-hashing algorithm.
- JWT access tokens with expiration.
- Role-based access control.
- Authorization for user-owned orders and portfolios.
- Internal endpoint protection.
- Input validation.
- Parameterized database queries.
- Safe error responses.
- Request-size limits.
- Rate limiting.
- Secret management.
- HTTPS/TLS configuration for production-style deployment.
- Kubernetes Secrets for deployment credentials.
- Network isolation where practical.

Do not put JWT signing secrets, database passwords, or Kafka credentials in source code.

Provide `.env.example` with placeholders only.

Never log passwords, access tokens, or sensitive financial details unnecessarily.

For local development, document any intentionally relaxed TLS or authentication settings and keep them disabled in production-style manifests.

## 14. DATABASE ISOLATION AND DOCKER

Each service must have its own database and credentials.

Use Docker Compose for local infrastructure.

Prefer separate database instances or independently secured logical databases with separate credentials and permissions. Clearly document the chosen isolation level.

Required database mapping:

| Service | Database |
|---|---|
| Identity and Wallet | PostgreSQL |
| Market Data | MongoDB |
| Order | MySQL |
| Portfolio | Redis |
| Notification | Firestore Emulator or documented local substitute |

All databases and brokers must be containerized. Developers must not need to install PostgreSQL, MongoDB, MySQL, Redis, or Kafka directly on their host machines.

Configure:
- Persistent Docker volumes.
- Health checks.
- Restart policies.
- Non-default credentials.
- Database initialization.
- Schema migrations.
- Service-specific credentials.
- Backup and restore instructions.

Never use a shared application database for all services.

If one Docker Compose file becomes too large, separate it into:
- `compose.infra.yml`
- `compose.services.yml`
- `compose.observability.yml`

Provide a single documented command to launch the complete local stack.

## 15. OBSERVABILITY

Implement metrics, structured logs, and tracing.

Prometheus metrics should include:
- HTTP request count and latency.
- HTTP errors.
- Business order outcomes.
- Order workflow duration.
- Wallet reservation failures.
- Kafka consumer lag.
- Outbox backlog.
- Projection processing delay.
- Database connection health.
- Circuit breaker state.

Use Grafana dashboards with actual metrics from the application.

Implement structured JSON logs with:
- Service name.
- Timestamp.
- Log level.
- Correlation ID.
- Trace ID where available.
- Order ID where relevant.
- Event ID where relevant.

Use Loki or OpenSearch/ELK for centralized logging.

Add OpenTelemetry tracing across HTTP and gRPC. Propagate trace context across Kafka where practical.

Do not log secrets.

Document at least one procedure for tracing an order across the entire system.

## 16. KUBERNETES

Create Kubernetes deployment resources for each business service and the required infrastructure integration.

Include:
- Deployments.
- Services.
- ConfigMaps.
- Secrets templates or references.
- Liveness probes.
- Readiness probes.
- Resource requests and limits.
- Persistent storage where necessary.
- Replica configuration.
- Ingress or Gateway exposure.
- Network policies where practical.

Use a local Kubernetes cluster for reproducible demonstrations.

Do not assume that Docker Compose and Kubernetes share the same DNS names. Provide separate environment configurations for each deployment mode.

Document which infrastructure components are run inside Kubernetes and which are intentionally external during the MVP. Ensure every documented deployment mode actually works.

Provide a development deployment using minimal resources and a separate scale-out demonstration with multiple replicas.

Avoid storing plaintext secrets in committed Kubernetes manifests.

## 17. MULTI-COMPUTER NETWORKING REQUIREMENTS

This project must work in two modes.

### MODE A: COMPLETE PROJECT ON JENIL'S WINDOWS PC

All five business services run locally or in containers on one Windows PC.

Databases, Kafka, gateway, service discovery, monitoring, and logging run in Docker.

Provide:
- A single start command or a documented sequence.
- Local environment files.
- Health-check commands.
- Database migration commands.
- Test-user creation.
- Seed stock data.
- Test order commands.
- Complete shutdown instructions.

Internal services should communicate through Docker service DNS names when containerized.

If a service runs directly on the host, document the appropriate host URL.

Do not mix container-only hostnames with host-process URLs without explaining the difference.

### MODE B: FIVE TEAM MEMBERS ON DIFFERENT COMPUTERS

Design the system so each team member can run their assigned service on their own computer, while shared infrastructure and the other services remain accessible.

Provide two supported deployment choices.

**Option 1 — Recommended: Central shared infrastructure**

- One designated computer runs Docker infrastructure.
- It hosts Kafka, databases, API Gateway, discovery, monitoring, and any centrally hosted services.
- Each team member runs their assigned service locally on their own computer.
- Services connect to the central infrastructure using the central computer's reachable private LAN IP.
- Every developer uses their own `.env.local` file.

**Option 2 — All services centrally containerized**

- Each developer pushes changes to Git.
- The integration computer builds and runs all services using Docker Compose or Kubernetes.
- Team members test through the Gateway from their own browsers.

Explain when each option is preferable.

### CRITICAL IP CONFIGURATION RULES

Never invent the central computer's IP address.

Tell the user to discover it on Windows with:

`ipconfig`

Use the active Wi-Fi or Ethernet adapter's IPv4 address.

On macOS, document:

`ipconfig getifaddr en0`

and explain that the interface may differ.

Create `.env.example` and `.env.local.example` with clearly named configuration variables, for example:

`PUBLIC_BASE_URL`

`GATEWAY_BASE_URL`

`IDENTITY_SERVICE_URL`

`MARKET_SERVICE_URL`

`ORDER_SERVICE_URL`

`PORTFOLIO_SERVICE_URL`

`NOTIFICATION_SERVICE_URL`

`POSTGRES_HOST`

`MONGODB_HOST`

`MYSQL_HOST`

`REDIS_HOST`

`KAFKA_BOOTSTRAP_SERVERS`

`EUREKA_URL`

`OTEL_EXPORTER_OTLP_ENDPOINT`

`JWT_ISSUER`

Use the correct variables for each service rather than requiring every service to consume every variable.

Document exactly:
- Which file to edit.
- Which machine's IP to enter.
- Which port must be reachable.
- Which hostname to use inside Docker.
- Which hostname to use between machines.
- Which hostname to use from a browser.
- Which URLs are only for internal communication.
- Which URLs are publicly accessible within the LAN.

A service running inside a container must not use `localhost` to reach another container.

A service running on a developer's host must not assume that a Docker-only hostname resolves on the host.

For the central infrastructure host:
- Configure database and broker listeners correctly.
- Bind only to the necessary interfaces.
- Restrict database and broker ports to the trusted development LAN.
- Configure Windows Firewall and macOS firewall rules.
- Keep privileged database and broker interfaces private.
- Never expose databases directly to the public internet.

Kafka requires special care: configure advertised listeners so that Docker containers use an internal listener and host-based services on other computers use a reachable LAN listener. Do not configure only `localhost:9092` and claim multi-computer connectivity works.

For service discovery, document whether developers use Eureka, static internal development URLs, or Kubernetes DNS in each mode. Keep the production-style architecture clear and avoid silently falling back to unrelated addresses.

Explain that all computers must be on a mutually reachable network. If they are on different networks, explain that a private VPN such as Tailscale or WireGuard may be required. Do not advise opening all ports to the public internet.

## 18. FRONTEND

Build a small, usable React frontend only after the core backend works.

Pages:
- Register/Login.
- Market overview.
- Stock detail and price history.
- Place BUY/SELL order.
- Orders and trade history.
- Wallet.
- Portfolio and P&L.
- Notifications.
- Service/system health for development.

Use the API Gateway as the frontend's normal backend entry point.

Never connect the browser directly to internal databases, Kafka, or privileged internal service endpoints.

Display asynchronous order status updates using polling or another appropriately scoped approach. Do not add WebSockets unless they materially improve the implementation.

The frontend must show when a portfolio projection is behind the latest trade.

## 19. PROJECT STRUCTURE

Create a clear repository structure resembling:

`stock-trading-platform/`

- `apps/`
  - `identity-wallet-service/`
  - `market-data-service/`
  - `order-service/`
  - `portfolio-service/`
  - `notification-service/`
  - `web-client/`
- `contracts/`
  - `grpc/`
  - `events/`
  - `openapi/`
- `gateway/`
- `discovery/`
- `infra/`
  - `docker/`
  - `kafka/`
  - `debezium/`
  - `databases/`
  - `observability/`
- `deploy/`
  - `compose/`
  - `kubernetes/`
- `scripts/`
- `tests/`
  - `unit/`
  - `integration/`
  - `contract/`
  - `e2e/`
  - `failure/`
- `docs/`
- `.env.example`
- `.gitignore`
- `README.md`
- `Makefile` or equivalent cross-platform task scripts.

Adjust the layout if necessary, but maintain clear ownership and keep each service independently buildable.

Each service must include:
- Source code.
- Dependency/build configuration.
- Dockerfile.
- Health and readiness endpoints.
- Environment configuration documentation.
- Unit tests.
- Integration tests where relevant.
- API documentation.
- Database migrations or initialization.
- Logging and metrics.
- Clear local run instructions.

## 20. API AND EVENT CONTRACTS

Write API contracts and event schemas before implementing cross-service integrations.

Use OpenAPI for REST and Protocol Buffers for gRPC.

Version event contracts.

Create realistic example payloads for:
- OrderCreated.
- OrderAccepted.
- OrderRejected.
- TradeExecuted.
- OrderCancelled.
- WalletReservationFailed.
- PositionReserved.
- PositionReleased.
- PortfolioUpdated.

Define:
- Required fields.
- Monetary representation.
- Timestamp format.
- Event version.
- Correlation ID.
- Idempotency semantics.
- Error response format.
- Retryable versus non-retryable failures.

Make the contracts part of the repository so all five members can work independently.

## 21. TESTING REQUIREMENTS

Create automated tests for all important business invariants.

### Unit tests

Test:
- Wallet balance calculations.
- Cash reservations.
- Share reservations.
- Order-state transitions.
- Trade execution arithmetic.
- Average cost and P&L.
- Event serialization.
- Idempotency behavior.

### Integration tests

Use actual disposable containerized infrastructure where needed.

Test:
- Each service against its own database.
- gRPC quote lookup.
- Kafka event publishing and consuming.
- Outbox relay or Debezium.
- Redis projections.
- Gateway routing.
- Authentication and authorization.

### End-to-end tests

At minimum:

1. Register and log in.
2. Verify initial wallet balance.
3. View seeded stocks.
4. Submit a BUY order.
5. Verify its eventual terminal state.
6. Verify wallet reservation and capture.
7. Verify trade history.
8. Verify portfolio holdings.
9. Verify notification persistence.
10. Submit a SELL order.
11. Verify position reduction and wallet credit.
12. Verify order history and P&L.

### Failure and concurrency tests

Test:
- Two concurrent BUY orders attempting to overspend.
- Two concurrent SELL orders attempting to oversell.
- Duplicate order requests.
- Duplicate Kafka messages.
- Kafka temporarily unavailable.
- Market Service unavailable.
- Wallet reservation timeout with an uncertain outcome.
- Service restart during a workflow.
- Notification database failure.
- Projection rebuild and replay.
- Outbox recovery after restart.
- Cancellation racing with execution.

Tests must verify financial invariants, not merely HTTP status codes.

Never mark a test as passed if it was not executed.

## 22. REQUIRED DOCUMENTATION

Generate a comprehensive `README.md` and detailed documents:

- `docs/architecture.md`
- `docs/service-ownership.md`
- `docs/api-contracts.md`
- `docs/event-contracts.md`
- `docs/data-ownership.md`
- `docs/order-workflow.md`
- `docs/saga-and-compensation.md`
- `docs/acid-vs-base.md`
- `docs/cqrs-and-outbox.md`
- `docs/cdc-setup.md`
- `docs/security.md`
- `docs/observability.md`
- `docs/kubernetes.md`
- `docs/local-windows-setup.md`
- `docs/macos-setup.md`
- `docs/single-pc-testing.md`
- `docs/multi-pc-setup.md`
- `docs/troubleshooting.md`
- `docs/demo-script.md`
- `docs/viva-questions.md`

Explain each pattern in terms of:
- What problem it solves.
- Which service implements it.
- Where its source code/configuration is.
- How to execute a demonstration.
- How to verify that it works.
- What failure scenario it handles.
- What trade-offs it introduces.

## 23. REQUIRED WINDOWS SINGLE-PC RUNBOOK

The final README must give exact commands for Jenil's Windows PC.

Assume PowerShell as the default shell.

Include:
1. Required software and versions.
2. Folder setup and repository setup.
3. Environment file creation.
4. Docker startup.
5. Database health checks.
6. Kafka and topic readiness checks.
7. Database migrations.
8. Seed data.
9. Python `.venv` setup and activation.
10. Build and start each service.
11. Gateway startup.
12. Frontend startup.
13. Health checks for every service.
14. Register/login example.
15. BUY order example.
16. SELL order example.
17. Portfolio verification.
18. Kafka event verification.
19. Outbox/CDC verification.
20. Grafana and centralized logging access.
21. Failure-injection demonstrations.
22. Automated test commands.
23. Complete shutdown.
24. Data reset and clean startup.

Commands must match the actual files and scripts generated by the project. Do not invent commands for nonexistent scripts.

Provide PowerShell equivalents where Unix shell syntax differs.

## 24. REQUIRED MULTI-PC RUNBOOK

Write a second independent guide for all five members.

It must include:
- Who hosts the shared infrastructure.
- How to determine that host's LAN IP.
- Exact environment variables for each developer.
- Which variables contain the central IP.
- Which variables remain Docker service names.
- Required port and firewall configuration.
- Kafka advertised-listener configuration.
- Service discovery configuration.
- Gateway routing configuration.
- Database and broker connection tests.
- How each member runs their assigned service.
- How to test a service independently.
- How to integrate branches.
- How to run the end-to-end flow.
- How to diagnose unreachable hosts and ports.
- What to do when the host IP changes.
- How to switch back to single-PC mode.

Create separate `.env.example` templates for local Compose, host-run development, and multi-PC development if necessary.

Do not commit actual `.env.local` files.

Never assume that `localhost` on one computer means the same host on another computer.

## 25. IMPLEMENTATION STRATEGY

Work incrementally. Do not generate the entire application in one enormous unverified step.

### Phase 1 — Architecture and contracts

Create:
- Architecture diagrams.
- Service ownership.
- Repository skeleton.
- API contracts.
- Event schemas.
- Data ownership rules.
- Docker Compose infrastructure.
- Environment templates.

Validate the architecture before proceeding.

### Phase 2 — Minimal vertical slice

Implement:
- Identity and wallet.
- Market quotes.
- Order creation.
- One complete BUY workflow.
- Kafka event delivery.
- Portfolio projection.
- Notification persistence.

Run an actual end-to-end test.

### Phase 3 — Financial correctness

Implement:
- Durable cash reservations.
- Position reservations.
- Idempotency.
- Order state machine.
- Durable Saga.
- Transactional Outbox.
- Compensation and reconciliation.
- Concurrent order tests.

### Phase 4 — Distributed-systems patterns

Implement:
- gRPC.
- Circuit breaker.
- CQRS.
- Debezium CDC.
- Consumer retries and dead-letter handling.
- Service discovery.
- Gateway security.

### Phase 5 — Observability and deployment

Implement:
- Prometheus.
- Grafana.
- Centralized logs.
- Tracing.
- Docker images.
- Kubernetes resources.
- Health and readiness checks.

### Phase 6 — Frontend and integration

Complete the React frontend, run the complete test suite, and verify the system from the Gateway.

### Phase 7 — Multi-PC handover

Validate the documented setup for:
- One Windows computer running everything.
- Five developers running separate services.
- Shared central infrastructure.
- A centrally containerized deployment.

Generate a team handover checklist and a demo script.

Do not skip a phase's critical tests just to move faster.

## 26. GIT AND TEAM COLLABORATION

Prepare a root `.gitignore`.

Exclude:
- `.env.local` and other real environment files.
- Passwords, private keys, tokens, and secrets.
- Python `.venv`.
- Build outputs.
- Node `node_modules`.
- IDE-specific files where appropriate.
- Temporary database files.
- Generated binaries.
- Logs.

Commit `.env.example`, API contracts, event schemas, Docker configuration, migrations, and deployment manifests.

Create a clear branching strategy:
- `main` for stable integration.
- One branch per service or feature.
- Pull requests for integration.

Document each member's ownership and integration responsibilities.

Make it possible to distribute this repository to the five members without sharing local credentials.

## 27. ACCEPTANCE CRITERIA

The project is not complete until all of the following have been implemented and verified:

- Five independently runnable business services.
- Five different implementation languages.
- Five different database products with isolated ownership.
- Working API Gateway.
- Working service discovery.
- REST communication.
- Working gRPC quote lookup.
- Kafka-based asynchronous events.
- ACID wallet and order transactions.
- Durable cash and position reservations.
- Saga workflow with compensation and restart recovery.
- Transactional Outbox.
- CDC/Debezium or a clearly identified intermediate outbox-relay milestone.
- Genuine CQRS portfolio projection.
- Idempotent event consumers.
- Circuit breaker and failure demonstration.
- JWT and RBAC.
- Dockerized infrastructure.
- Kubernetes deployment resources.
- Prometheus and Grafana metrics.
- Centralized logging.
- Automated unit, integration, concurrency, and end-to-end tests.
- Fully documented Windows single-PC setup.
- Fully documented macOS and multi-PC setup.
- Reproducible BUY and SELL demonstrations.
- No known unhandled financial invariant violations in the required test suite.

## 28. YOUR FIRST ACTION

Start by inspecting the empty repository and checking the installed tools.

Create `docs/architecture.md`, `docs/service-ownership.md`, and a root `README.md` containing the initial implementation plan.

Then create the repository structure, configuration templates, API contracts, and Docker infrastructure.

Before making major implementation choices, explain any unavoidable trade-offs and list the prerequisites.

After every phase:
1. Summarize the files created or changed.
2. Show the exact commands executed.
3. Report which tests actually passed and failed.
4. Identify unresolved issues.
5. Continue to the next phase without waiting for approval for ordinary implementation decisions.

If a command requires user permission, privileged access, or an unavailable dependency, explain exactly what is required and provide the next safe command.

Do not delete existing user files or overwrite existing project data without explicit permission.

**Final objective:** deliver a fully working, tested, documented, reproducible distributed paper-trading platform that all five team members can understand, run, develop, and demonstrate.