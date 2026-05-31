# QuizForge — Software Design & Technical Documentation

**Version:** 1.0.0
**Generated:** 2026-05-31

---

## Table of Contents

- [Cover Page](#cover-page)
- [1. Executive Summary](#1-executive-summary)
- [2. Project Overview](#2-project-overview)
- [3. System Architecture](#3-system-architecture)
  - [High-level architecture](#high-level-architecture)
  - [Component architecture](#component-architecture)
  - [Request-response lifecycle](#request-response-lifecycle)
- [4. Technology Stack](#4-technology-stack)
- [5. Project Structure](#5-project-structure)
- [6. Functional Requirements](#6-functional-requirements)
- [7. Non-Functional Requirements](#7-non-functional-requirements)
- [8. User Roles & Permissions](#8-user-roles--permissions)
- [9. Database Documentation](#9-database-documentation)
- [10. Authentication & Security](#10-authentication--security)
- [11. API Documentation](#11-api-documentation)
- [12. Core Business Logic & Workflows](#12-core-business-logic--workflows)
- [13. Frontend Documentation](#13-frontend-documentation)
- [14. Backend Documentation](#14-backend-documentation)
- [15. Environment Variables](#15-environment-variables)
- [16. Installation Guide](#16-installation-guide)
- [17. Deployment Guide](#17-deployment-guide)
- [18. Testing Documentation](#18-testing-documentation)
- [19. Error Handling Strategy](#19-error-handling-strategy)
- [20. Performance Optimization](#20-performance-optimization)
- [21. Security Assessment](#21-security-assessment)
- [22. Future Enhancements](#22-future-enhancements)
- [23. Conclusion](#23-conclusion)
- [24. Appendix](#24-appendix)

---

## Cover Page

- **Project Name:** QuizForge
- **Version:** 1.0.0
- **Author:** Project repository owner (see repository)
- **Institution:** [Add your institution here]
- **Submission Date:** 2026-05-31
- **Technology Stack (summary):** Next.js, React, TypeScript, Prisma, PostgreSQL, OpenRouter, Resend, Docker

---

## 1. Executive Summary

QuizForge is an adaptive, collaborative quiz platform that enables educators, learners, and teams to generate, take, and analyze quizzes with AI-assisted content generation and secure collaboration features. The platform supports:

- Rapid quiz creation (manual and AI-generated)
- Per-question feedback and persisted attempts
- Team workspaces, invitations, and challenge-based competitions
- Learning analytics, streaks, and leaderboards

Business value: reduces quiz creation time, centralizes team learning data, and enables data-driven learning interventions.

---

## 2. Project Overview

### Problem statement
Manual quiz authoring and ad-hoc collaboration hinder scalable and consistent assessment workflows. Instructors and team leads need an integrated platform for fast quiz creation, collaborative review, and measurable learner outcomes.

### Proposed solution
Provide a web-based platform with AI-assisted generation and evaluation, role-based team workspaces, and detailed analytics to improve learning outcomes and simplify administration.

### Project objectives

- Implement a secure user lifecycle (registration, verification, session management)
- Provide AI-assisted quiz generation and resilient fallback models
- Enable workspace collaboration: invites, roles, and team challenges
- Persist attempts, generate reports and leaderboards
- Ship a production-ready container build and deployment pathway

### Scope
Server and client application with Postgres DB, API routes, email integration, and local/CI deployment scripts.

---

## 3. System Architecture

### High-level architecture

The system follows a three-tier architecture: browser-based client (Next.js React app), Next.js server (app-router API endpoints and server-side rendering), and PostgreSQL (Prisma ORM). External services include an AI provider (via OpenRouter) and a transactional email provider (Resend).

```mermaid
flowchart LR
  Browser[Browser (React + Next)] -->|HTTPS| NextServer[Next.js server (app router, API routes)]
  NextServer -->|Prisma queries| Postgres[PostgreSQL]
  NextServer -->|Email API| Resend[Resend]
  NextServer -->|AI requests| OpenRouter[OpenRouter]
```

### Component architecture

- Frontend: `app/` routes (Next app router), UI components, and small client utilities in `client/`.
- Backend: API route handlers under `app/api/`, domain services under `lib/` (db, email, ai, auth, teams), and security helpers under `lib/security/`.
- Database: Prisma-managed Postgres (`prisma/schema.prisma`) defining all models and indexes.

### Request-response lifecycle (example: registration)

1. Client posts to `POST /api/auth/register` with form data.
2. Server validates input, rate-limits, and creates a `User` record with a hashed password.
3. Server creates a `VerificationToken` and attempts to send an email via `lib/email.ts`.
4. On success, server returns 201; in development the verification link is returned in the response.
5. When user clicks the verification link, server validates token, marks `emailVerifiedAt` and auto-accepts any pending workspace invitations.

Sequence diagram:

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant S as Server
  participant DB as Postgres
  participant Res as Resend

  U->>F: Submit registration
  F->>S: POST /api/auth/register
  S->>DB: Create User + VerificationToken
  S->>Res: Send verification email
  Res-->>S: 200 OK
  S-->>F: 201 Created
  U->>S: Click verification link (browser GET)
  S->>DB: Mark user verified, auto-accept invitations
  S-->>U: Redirect to login
```

---

## 4. Technology Stack

This project uses a pragmatic set of technologies selected for developer productivity, robustness, and ease of deployment.

- Frontend: Next.js (app router), React, TypeScript — for SSR/CSR blend, incremental adoption, and type safety.
- Backend: Node.js, Next.js API routes — unified codebase with route handlers colocated with pages.
- Database: PostgreSQL with Prisma — schema-first modeling and type-safe client.
- Auth/security: `jose` (JWT utilities), `bcryptjs` (password hashing), Zod (validation).
- AI: OpenRouter integration with configurable primary/fallback models.
- Email: Resend provider with idempotency and dev fallback (`lib/email.ts`).
- DevOps: Docker, Docker Compose, standalone Next build to produce production images.

Rationale: strong typing and schema-driven patterns minimize regressions; Prisma provides production-ready migrations and typed DB access; Next.js simplifies SSR and API surface area.

---

## 5. Project Structure

Top-level directories with their responsibilities and key files:

- `app/` — Next app router routes and server components. Key API endpoints for auth, teams, quizzes live here.
- `components/` — Reusable UI components and full-page experiences (e.g., `quiz-experience`, `team-experience`).
- `lib/` — Domain services and helpers: `db.ts` (Prisma client), `email.ts` (Resend wrapper), `config/env.ts` (Zod env validation), `teams/invitations.ts` (core invite logic), `auth/` utilities.
- `prisma/` — `schema.prisma`, migrations and seed scripts for initial data.
- `public/` — Static assets and icons.
- `scripts/` — Helper scripts (e.g., `test-db-connection.mjs`).
- `Dockerfile`, `docker-compose.yml`, `next.config.mjs`, and top-level project manifests.

Interaction notes: Frontend pages call `authenticatedFetch` (client helper) to access the APIs implemented under `app/api/`, which use `lib/*` services for domain logic and `db` for persistence.

---

## 6. Functional Requirements

Below is a comprehensive list of implemented features, their inputs/outputs and business rules.

1. User registration
   - Inputs: `name`, `email`, `password` (validated by `registerSchema` in `lib/auth/schemas`).
   - Outputs: 201 Created, verification link (in dev) or email delivered via Resend.
   - Business rules: duplicate email -> 409; rate limits apply; server logs registration events.

2. Email verification
   - Inputs: token query parameter; server verifies token hash and expiry.
   - Outputs: redirect to `/login?verified=true` or `/login?error=invalid-verification`.
   - Business rules: tokens are single-use and removed after verification.

3. Team workspaces and invitations
   - Create workspace: `POST /api/teams` requires name & optional description.
   - Invite flow: `POST /api/teams/:id/invitations` — if recipient exists, they're immediately added and a notification email is sent; otherwise a pending invitation is created with an expiring token.
   - Auto-accept: after email verification, `autoAcceptPendingInvitations` maps invites to the newly verified user.

4. Quiz CRUD and AI generation
   - Manual quiz creation and AI-assisted generation via `lib/ai/openrouter.ts`.
   - Generated quizzes have questions and options validated before persistence.

5. Quiz attempt processing
   - Inputs: answers, quizId, duration, timezone, optional teamChallengeId.
   - Outputs: persisted `QuizAttempt`, per-question `AttemptAnswer`s, a review payload returned to the client with feedback and scoring.

6. Analytics & Leaderboards
   - Aggregated from `QuizAttempt` and `UserProgress` tables for leaderboard and progress metrics.

---

## 7. Non-Functional Requirements

- Performance: indexed queries (see `prisma/schema.prisma`) for read-heavy endpoints like leaderboards and recent activity.
- Scalability: containerized service supports orchestration; database layer can be scaled separately (read replicas recommended for high-read workloads).
- Reliability: transactional DB operations for invite acceptance and critical multi-step flows.
- Availability: stateless Next server image enables horizontal scaling; persistent Postgres for durable state.
- Security: production CSP, HSTS, and header security policy; JWT and token length enforcement in `lib/config/env.ts`.
- Maintainability: TypeScript, Zod validations and modular `lib/` services.

---

## 8. User Roles & Permissions

The codebase defines both system-level roles and workspace-specific roles.

- System role (`User.role` enum): `USER`, `ADMIN`.
- Workspace roles (`TeamRole` enum): `OWNER`, `ADMIN`, `MEMBER`.

Permission summary:
- `OWNER`: full workspace control including member management and deletion.
- `ADMIN`: manage collaborators, publish challenges, and moderate workspace content.
- `MEMBER`: participate in challenges and access quizzes as granted.

Authorization is enforced at the API/service layer (see `lib/teams/invitations.ts` and `requireWorkspaceManager`).

---

## 9. Database Documentation

Primary models and purpose (see `prisma/schema.prisma` for full definitions):

- `User`: accounts, credentials, metadata, `emailVerifiedAt` flag.
- `Session`: refresh tokens and session metadata.
- `VerificationToken`: hashed tokens for email verification and resets.
- `Quiz`, `Question`, `Option`: quiz content and structure.
- `QuizAttempt`, `AttemptAnswer`: persisted attempts and answers with scoring.
- `Team`, `TeamMember`, `TeamInvitation`, `TeamChallenge`: workspace collaboration models.

ER diagram (simplified):

```mermaid
erDiagram
  USER ||--o{ SESSION : has
  USER ||--o{ VERIFICATIONTOKEN : has
  USER ||--o{ QUIZ : author
  QUIZ ||--o{ QUESTION : contains
  QUESTION ||--o{ OPTION : contains
  QUIZ ||--o{ QUIZATTEMPT : has
  QUIZATTEMPT ||--o{ ATTEMPTANSWER : has
  TEAM ||--o{ TEAMMEMBER : has
  TEAM ||--o{ TEAMINVITATION : has
  TEAM ||--o{ TEAMCHALLENGE : has
```

Indexes, constraints and unique keys are defined in `prisma/schema.prisma` to support query performance and data integrity.

---

## 10. Authentication & Security

Detailed flows:

- Registration: `POST /api/auth/register` -> validate -> hash password -> create user -> create verification token -> attempt to send email -> return 201 with appropriate message.
- Verification: `GET /api/auth/verify-email?token` -> validate token hash & expiry -> set `emailVerifiedAt` -> delete tokens -> `autoAcceptPendingInvitations`.
- Session Management: `Session` records store `refreshTokenHash` and `expiresAt`, enabling server-side revocation.

Security controls:
- Passwords hashed with `bcryptjs`.
- Tokens are generated and stored as hashes (opaque tokens never stored in plain text).
- Environment variables validated by Zod to ensure production requirements: `DATABASE_URL`, `JWT_SECRET` and `RESEND_API_KEY` must be present in production.
- Rate limiting and trusted-origin checks exist on sensitive endpoints.

---

## 11. API Documentation

Below are representative endpoints. For a full spec consider generating OpenAPI from route annotations or a manual spec.

1. `POST /api/auth/register`
   - Body: `{ name: string, email: string, password: string }`
   - Responses: `201` with `{ message, verificationUrl? }` (dev only)
   - Errors: `409` if email exists, validation errors, rate-limit errors.

2. `GET /api/auth/verify-email?token=...`
   - Description: Validate token and mark user verified; redirect to login with query params.

3. `POST /api/teams/:teamId/invitations`
   - Body: `{ email: string, role: 'MEMBER'|'ADMIN', quizId?: string }`
   - Responses: `{ result: { delivery: 'added'|'invited', email, expiresAt? }}`

4. `POST /api/attempts`
   - Body: `{ quizId, teamChallengeId?, durationSeconds, timezone, answers: [{ questionId, optionId }] }`
   - Responses: `{ score, total, review: [...], feedback?: {...} }`

5. `GET /api/teams` and `GET /api/teams/:teamId`
   - Returns lists and detailed dashboard objects (members, invitations, quizzes, challenges, statistics)

Errors and response shapes follow a consistent `ApiError` pattern implemented in `lib/http`.

---

## 12. Core Business Logic & Workflows

Detailed step-by-step workflows are crucial for handover and maintenance; key flows are described below.

### User onboarding and invitation reconciliation
1. Owner creates a workspace and issues an invite to `alice@example.com`.
2. The server creates `TeamInvitation` with a hashed token and sends a registration link to `alice@example.com`.
3. Alice registers (creates `User`) and clicks the verification link, which triggers `autoAcceptPendingInvitations`.
4. The server matches pending invitations by email, upserts `TeamMember` entries, and marks invitations as `ACCEPTED`.

### Quiz generation and validation
1. Client requests quiz generation for a topic.
2. Server forwards request to OpenRouter with configured model and timeout.
3. Server validates model output for question count and option structure, then persists the `Quiz`, `Question`s and `Option`s.

### Attempt processing and feedback
1. Client submits answers to `POST /api/attempts`.
2. Server fetches canonical correct answers and computes score.
3. Optionally, server requests enhanced feedback from AI evaluation model and stores any returned explanations.
4. `QuizAttempt` and `AttemptAnswer` rows are created as a transaction and `UserProgress` is updated.

---

## 13. Frontend Documentation

Pages & components:

- `app/quiz/[quizId]/page.tsx` — quiz page that mounts `QuizExperience`.
- `components/quiz/quiz-experience.tsx` — client component handling question rendering, answer state, progress bar, submit flow and result review. (See file for detailed behavior.)
- `components/teams/team-experience.tsx` — workspace dashboard and management UI.

State management and data fetching:

- Local state using React hooks per component.
- Server calls via `authenticatedFetch` which attaches session credentials.
- No global state manager is used; opportunities to centralize shared state include session, notifications, and feature flags.

Accessibility:

- Use of semantic elements (`form`, `fieldset`, `legend`) in `QuizExperience` and `aria-live` for result announcements.
- Recommendation: add more explicit keyboard focus management and skip links for large quizzes.

---

## 14. Backend Documentation

Code organization:

- Routes under `app/api/*` behave as controller-level handlers. They validate input, orchestrate domain services, perform DB changes, and return `NextResponse` objects.
- `lib/` contains service-like functions that encapsulate domain logic and are safe to unit-test.

Key services:

- `lib/db.ts`: Prisma client singleton for stable DB connections in dev and production.
- `lib/email.ts`: Resend wrapper with idempotency key generation for safe retries and development fallback logging.
- `lib/teams/invitations.ts`: Invitation lifecycle, immediate add vs pending invite logic, and auto-accept reconciliation.

Validation and errors:

- Input schemas use Zod and `jsonError` to map exceptions to HTTP responses.
- Critical flows use transactions to ensure atomicity (e.g., invitation acceptance).

---

## 15. Environment Variables

The environment variables required by the application are validated in `lib/config/env.ts`. Below is a non-secret summary for documentation purposes.

| Variable | Purpose | Required in production | Example |
|---|---|---:|---|
| `NODE_ENV` | Node environment | No (defaults to development) | production |
| `DATABASE_URL` | Postgres connection string | Yes | postgresql://user:pass@host:5432/dbname?sslmode=require |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes | (32+ char secret) |
| `APP_URL` | Public app URL used in emails | Yes | https://app.example.com |
| `RESEND_API_KEY` | Resend API key for email delivery | Yes (prod) | sk_... |
| `EMAIL_FROM` | Verified sender for outbound email | Yes (prod) | QuizForge <no-reply@yourdomain.com> |
| `OPENROUTER_API_KEY` | API key for OpenRouter | No (optional) | orca_... |
| `OPENROUTER_MODEL` | Primary AI model id | No | openai/gpt-oss-120b:free |

**Security note:** Never commit secrets. Use a secrets manager in production and ensure CI/CD and build infrastructures inject secrets securely.

---

## 16. Installation Guide

Prerequisites:

- Node.js (18+ recommended). The project Dockerfile uses Node 24.
- Docker & Docker Compose (for local Postgres during development).

Local setup:

```bash
git clone <repo-url>
cd quiz-app
npm install
cp .env.example .env
# set DATABASE_URL, JWT_SECRET, and APP_URL in .env
docker compose up -d postgres
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Notes:

- Use `scripts/test-db-connection.mjs` to verify Prisma connectivity locally.
- For seed admin user, follow the README instructions and set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before running the seed step.

---

## 17. Deployment Guide

Production build steps (container-based):

```bash
npm run build
docker build -t quizforge:latest .
docker run -e NODE_ENV=production -e DATABASE_URL="..." -e JWT_SECRET="..." -e RESEND_API_KEY="..." -e EMAIL_FROM="..." -p 3000:3000 quizforge:latest
```

Deployment considerations:

- Ensure the production `DATABASE_URL` includes SSL params compatible with your DB provider.
- Verify `EMAIL_FROM` domain in Resend and confirm `RESEND_API_KEY` is present.
- Use a secret manager for `JWT_SECRET`, DB credentials and provider keys.
- Monitor logs and set up alerting for DB connectivity and email failures.

---

## 18. Testing Documentation

Test approach:

- Manual testing: registration, login, verification, invite flows, quiz generation and attempts.
- Unit tests: target `lib/` services and business logic (Jest or Vitest recommended).
- Integration tests: spin up Docker Compose Postgres and run API tests against a staging DB.

Example manual tests:

1. Register new user and confirm dev verification link when `RESEND_API_KEY` is not set.
2. Invite a registered user and ensure they are added immediately.
3. Invite an unregistered email, register using the invitation link, verify email, and confirm auto-accept.

---

## 19. Error Handling Strategy

- Input validation via Zod and consistent `ApiError` usage across routes.
- Email provider errors bubble in production; in development a fallback logs the link.
- DB integrity errors cause 5xx errors and should be logged for operator investigation.
- Frontend surfaces errors as toast notifications and contextual messages.

---

## 20. Performance Optimization

- Use DB indices (see schema) for read-heavy endpoints.
- Prefer column `select` to reduce payload size.
- Add server-side caching (Redis or CDN) for leaderboard and public catalog endpoints.
- Leverage Next.js image and asset optimizations where applicable.

---

## 21. Security Assessment

Existing protections:

- CSP and security headers in `next.config.mjs`.
- Hashed tokens and hashed refresh tokens in DB.
- Env validation and production checks for `EMAIL_FROM`.

Recommendations:

- Use a secrets manager for production envs; rotate credentials periodically.
- Enable monitoring and alerting for failed email deliveries and DB connection anomalies.
- Implement bruteforce / login attempt protections for auth endpoints.

---

## 22. Future Enhancements

- Admin console for user & workspace management.
- Delivery telemetry for invites (webhooks or provider callbacks).
- Attachments and multimedia question support.
- Exportable reports and LMS (LTI) integration.

---

## 23. Conclusion

QuizForge provides a maintainable, secure, and extensible codebase for AI-enabled quizzing and collaborative learning. The repository contains clear service boundaries and production-oriented deployment artifacts. For handover: ensure runtime envs (DB, email, AI keys) are provided and verified, and run the included seed to provision initial admin accounts.

---

## 24. Appendix

- Key files and locations:
  - `app/api/auth/register/route.ts`
  - `app/api/auth/verify-email/route.ts`
  - `components/quiz/quiz-experience.tsx`
  - `components/teams/team-experience.tsx`
  - `lib/email.ts`, `lib/db.ts`, `lib/config/env.ts`, `lib/teams/invitations.ts`
  - `prisma/schema.prisma`

- API summary and DB summary are included in earlier sections.
- Glossary: Quiz, Attempt, Team, Invitation, Challenge, Collaborator.

---

*This documentation was generated from the repository code on 2026-05-31. To further refine: split into per-section files, generate an OpenAPI spec, and produce a printable PDF for submission.*
