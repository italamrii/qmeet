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

## Running mock vs LiveKit mode

The meeting media layer has two interchangeable backends behind one interface.

**Mock mode (default, zero setup, permission-free):**

```bash
MEDIA_PROVIDER=mock   # or leave LIVEKIT_* blank
npm run dev
```

No camera/microphone is ever accessed; the room is populated with simulated participants and chat. Great for UI review.

**LiveKit mode (real media):**

```bash
MEDIA_PROVIDER=livekit
LIVEKIT_URL=wss://your-livekit-host          # or wss://<project>.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
INVITE_LINK_SECRET=...   # required for guest invite links
npm run dev
```

If `MEDIA_PROVIDER=livekit` but any `LIVEKIT_*` value is missing, the app **falls back to mock** automatically (never crashes). Camera/mic are only requested after the user clicks **Join** (or the optional **Test camera & mic** button on the join page). Access tokens are minted server-side only at `POST /api/livekit/token`; the API secret never reaches the browser.

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

## Deploying on Railway

### Prerequisites

- [Railway](https://railway.app) account
- LiveKit Cloud or self-hosted LiveKit instance (`wss://` URL + API key/secret)
- Public domain (Railway provides `*.up.railway.app` or your custom domain)

### Railway configuration

This repo includes `railway.toml` with:

- Nixpacks builder
- Start command: `npm run start`
- Restart on failure (max 10 retries)

`npm run build` runs `prisma generate && next build`. **Database migrations are not run automatically** during build — apply them manually (see below).

### Deployment checklist

1. Create a Railway project and link this repository.
2. Add a **PostgreSQL** plugin; copy `DATABASE_URL` into service variables.
3. Set environment variables (see below).
4. Deploy the app.
5. Open a **Railway shell** (or one-off command) and run:
   ```bash
   npx prisma migrate deploy
   ```
6. Verify:
   - [ ] Signup works
   - [ ] Login works
   - [ ] Create room from dashboard
   - [ ] Join by link
   - [ ] Join by room code
   - [ ] Audio / video / screen share between two browsers
   - [ ] Contact form submission

**Optional start command** (runs migrations on every deploy — use only if you accept deploy-time DB access):

```bash
npx prisma migrate deploy && npm run start
```

Tradeoff: failed migrations block startup; safer for small teams that forget manual migrate.

### Required Railway environment variables

```env
APP_ENV=production
NODE_ENV=production

DATABASE_URL=                    # from Railway PostgreSQL

AUTH_ACCESS_TOKEN_SECRET=        # long random string
AUTH_REFRESH_TOKEN_SECRET=       # long random string
INVITE_LINK_SECRET=              # long random string

LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=              # never expose to browser

MEDIA_PROVIDER=livekit
ENABLE_MOCK_MEDIA=false
ENABLE_DEMO_USERS=false

NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

Notes:

- `DATABASE_URL` should come from the Railway PostgreSQL service.
- `NEXT_PUBLIC_APP_URL` must match your public Railway (or custom) domain — used for invite links.
- `LIVEKIT_API_SECRET` is server-only; never add it as a `NEXT_PUBLIC_` variable.
- Copy `.env.example` locally; **never commit** `.env.local` or real secrets.
- Auth uses custom JWT cookies (`AUTH_*_TOKEN_SECRET`), not NextAuth.

### Local PostgreSQL (development)

```bash
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate dev
```

## Project status

Following the staged execution plan:

- [x] **Step 1** — Scaffold
- [x] **Step 2** — Prisma schema (approved with RefreshToken + retention additions)
- [x] **Step 3** — Auth (argon2id, JWT + family-scoped refresh rotation, rate limiting)
- [x] **Step 4** — Join/room UI (mock media)
- [x] **Step 5** — Live LiveKit wiring (provider switch, server-minted tokens, data-channel chat)
- [ ] **Step 6** — Recording (Egress), server-side host moderation, dashboard, audit log view
