# Q Meet

A premium, secure video/voice meeting platform for modern teams, built on [LiveKit](https://livekit.io). General-purpose and professional — suitable for startups, teams, education, and events — with security and data protection treated as first-class requirements.

> Internal project/package name remains `qimam-meet`; the user-facing product brand is **Q Meet** (Arabic: **كيو**).

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, framer-motion, next-intl (Arabic RTL default / English)
- **Media:** LiveKit self-hosted SFU — `livekit-client` + `@livekit/components-react`
- **Backend:** Next.js Route Handlers (see `ARCHITECTURE.md` for why not NestJS at MVP stage)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** argon2id password hashing, short-lived JWT access tokens + rotating refresh tokens (httpOnly cookies)

## Getting started

```bash
npm install
cp .env.example .env    # fill in real values — see comments in the file
npx prisma migrate dev  # after schema approval (Step 2)
npm run dev
```

Open http://localhost:3000 — you will be redirected to the Arabic (default) locale.

## Security Setup

Read `SECURITY.md` before deploying. Non-negotiables:

1. **TLS only.** The app assumes HTTPS and `wss://` for LiveKit. Never expose plaintext HTTP/WS; terminate TLS at your reverse proxy and enable HSTS (already sent by middleware).
2. **Secrets live in `.env` only.** `.env` is gitignored; `.env.example` documents every variable. Never commit real values.
3. **Key rotation practice:**
   - `LIVEKIT_API_KEY/SECRET`: rotate quarterly or on personnel change. LiveKit supports multiple concurrent keys — add the new key, redeploy, then revoke the old one.
   - `AUTH_*_TOKEN_SECRET`: rotating the access secret invalidates sessions within 15 minutes (token TTL). Rotate the refresh secret to force full re-login.
   - `INVITE_LINK_SECRET`: rotation invalidates all outstanding invite links — communicate before rotating.
   - Database credentials: use a dedicated least-privilege role; rotate via your secret manager.
4. **Recordings** are stored in S3/MinIO with server-side encryption (SSE-S3 or SSE-KMS) and served only through an authorization-checked endpoint — never public URLs.

## Documentation

- `ARCHITECTURE.md` — system diagram, meeting-session data flow, security model summary. Updated as the app grows.
- `SECURITY.md` — every security decision and its rationale.

## Project status

Following the staged execution plan:

- [x] **Step 1** — Scaffold
- [x] **Step 2** — Prisma schema (approved with RefreshToken + retention additions)
- [x] **Step 3** — Auth (argon2id, JWT + family-scoped refresh rotation, rate limiting)
- [x] **Step 4** — Join/room UI (mock media) ← awaiting design approval
- [ ] **Step 5** — Live LiveKit wiring (credentials required)
- [ ] **Step 6** — Recording, dashboard, audit log
