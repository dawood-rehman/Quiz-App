# QuizForge

QuizForge is an adaptive, AI-powered quiz platform built with Next.js, PostgreSQL, Prisma, and OpenRouter. It includes a polished learner experience, secure account lifecycle, role-based admin APIs, real activity analytics, daily streaks, collaborative workspaces, team challenges, and server-side AI routing.

## Quick Start

1. Copy `.env.example` to `.env`.
2. Generate a random `JWT_SECRET` with at least 32 characters.
3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Apply the schema and seed categories:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Admin Seed

To create or promote an initial admin while seeding, set these temporarily before `npm run db:seed`:

```bash
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=replace-with-a-strong-password
```

## AI Provider

Set `OPENROUTER_API_KEY` to enable server-side quiz generation and enhanced result feedback. Quiz generation starts with `openai/gpt-oss-120b:free` and automatically falls back to `meta-llama/llama-3.3-70b-instruct`. Result evaluation and improved explanations use `google/gemma-4-31b-it`, with stored quiz explanations as a resilient final fallback. `OPENROUTER_TIMEOUT_MS` controls the bounded generation budget and defaults to `55000`.

Quiz topics are free-form. Learners can request broad subjects or specific people, places, events, and concepts. Generation validates the model output before storing it and returns a clear error instead of leaving the UI waiting indefinitely.

The default model generates current-affairs quizzes from its available knowledge. Add a retrieval or web-search layer before presenting time-sensitive quizzes as live, verified news coverage.

## Learning Progress and Workspaces

Dashboard statistics come from persisted quiz attempts. New learners start at zero; completed quizzes update questions answered, correct and incorrect answers, accuracy, best score, measured quiz time, topic mastery, recent history, streaks, rating, and leaderboard rank.

The Teams page is a workspace collaboration console. Owners and admins invite collaborators by email, manage member roles, remove members, resend pending invitations, publish saved quizzes as challenges, and compare member rankings and recent activity.

Registered email addresses are added immediately. New email addresses receive a secure, expiring registration invitation. After account email verification, pending workspace and quiz access is granted automatically. AI quiz creation can optionally select a workspace, assign existing members as editors, and attach pending email invitations to the newly generated quiz.

Quiz collaboration APIs support `MANAGER`, `EDITOR`, and `VIEWER` permissions for workspace members.

## Transactional Email

Email is sent with [Nodemailer](https://nodemailer.com/) over SMTP. Local development can omit SMTP settings; verification and reset links are logged to the console.

Production example (Gmail with an app password):

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="QuizForge <you@gmail.com>"
```

Use your provider's SMTP host, port, and credentials for other services (Outlook, SendGrid SMTP, Brevo, etc.).

## Verification

```bash
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
```

See [docs/production-readiness.md](docs/production-readiness.md) for the audit, architecture decisions, security model, and deployment runbook.
