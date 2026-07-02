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

`railway.toml` does **not** strip or override environment variables. The app reads `process.env.DATABASE_URL` at **runtime** on the Node server — not from `.env` files committed to git.

### Step-by-step: PostgreSQL + `DATABASE_URL` on the app service

Signup returns `DATABASE_NOT_CONFIGURED` when `process.env.DATABASE_URL` is empty at runtime. This is almost always a **Railway variable placement** issue, not an app bug.

1. **Add PostgreSQL** to the same Railway project (e.g. service name `Postgres`).
2. Open the **`qmeet` app service** (not the Postgres service) → **Variables**.
3. Add `DATABASE_URL` using **one** of these methods:

   **Option A — Reference (recommended):**

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```

   Replace `Postgres` with your PostgreSQL service’s exact name in Railway.

   **Option B — Copy internal URL manually:**

   From the Postgres service → **Connect** → copy the **internal** URL (host ends with `postgres.railway.internal`), e.g.:

   ```
   postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
   ```

   Paste it as `DATABASE_URL` on the **`qmeet` service**.

   > Do **not** put `DATABASE_URL` only on the Postgres service. The Next.js app runs on `qmeet` and only sees variables on **that** service (plus shared project variables).

4. Add the rest of the required variables on **`qmeet`** (see list below).
5. **Redeploy `qmeet`** after changing variables (Deploy → Redeploy, or push a commit).
6. Open a **new** Railway Console on the **`qmeet`** service (after redeploy finishes).
7. Verify runtime injection:

   ```bash
   printenv DATABASE_URL
   ```

   You should see a non-empty `postgresql://...` string. If empty, the variable is still not on `qmeet` — recheck step 2–5.

8. Run migrations from the **`qmeet`** console:

   ```bash
   npx prisma migrate deploy
   ```

9. Verify env health over HTTP (booleans only, no secrets):

   ```bash
   curl https://qmeet.up.railway.app/api/health/env
   ```

   Expect `"databaseConfigured": true` when `DATABASE_URL` is set correctly.

### Troubleshooting `DATABASE_NOT_CONFIGURED`

| Symptom | Likely cause |
|--------|----------------|
| `printenv DATABASE_URL` empty in `qmeet` console | `DATABASE_URL` not set on **app** service, or redeploy not run |
| Variable visible in UI but empty in shell | Wrong service selected in Console; open shell on **`qmeet`** |
| Reference `${{...}}` not resolving | Postgres service name mismatch; use exact name from Railway |
| Works locally, fails on Railway | Local `.env.local` is not deployed; set vars in Railway UI |
| `databaseConfigured: false` in `/api/health/env` | Same as above — runtime `process.env.DATABASE_URL` is unset |

Startup logs also print safe booleans once per process:

```
[env:startup] { appEnv, nodeEnv, databaseConfigured, livekitConfigured, ... }
```

Check **Deploy Logs** for `[env:startup]` after each deploy.

### Deployment checklist

1. Create a Railway project and link this repository.
2. Add **PostgreSQL**; wire `DATABASE_URL` to **`qmeet`** (reference or copy).
3. Set all required environment variables on **`qmeet`**.
4. **Redeploy `qmeet`**.
5. Confirm `printenv DATABASE_URL` in **`qmeet`** console.
6. Run `npx prisma migrate deploy` in **`qmeet`** console.
7. Hit `GET /api/health/env` — all booleans should be `true` for full production readiness.
8. Verify:
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

### Required Railway environment variables (on `qmeet` service)

```env
APP_ENV=production
NODE_ENV=production

DATABASE_URL=<Railway Postgres internal URL or ${{Postgres.DATABASE_URL}}>

AUTH_ACCESS_TOKEN_SECRET=<strong secret>
AUTH_REFRESH_TOKEN_SECRET=<strong secret>
INVITE_LINK_SECRET=<strong secret>

LIVEKIT_URL=<wss://...>
LIVEKIT_API_KEY=<key>
LIVEKIT_API_SECRET=<secret>

MEDIA_PROVIDER=livekit
ENABLE_MOCK_MEDIA=false
ENABLE_DEMO_USERS=false

NEXT_PUBLIC_APP_URL=https://qmeet.up.railway.app
```

Notes:

- Variable name must be exactly **`DATABASE_URL`** (Prisma and signup both use this name).
- Use the **internal** Postgres URL for app runtime (`*.railway.internal`), not a public proxy URL, unless Railway docs for your setup say otherwise.
- `NEXT_PUBLIC_APP_URL` must match your public Railway (or custom) domain — used for invite links.
- `LIVEKIT_API_SECRET` is server-only; never add it as a `NEXT_PUBLIC_` variable.
- `NEXT_PUBLIC_MEDIA_PROVIDER` is optional; the server uses `MEDIA_PROVIDER`.
- Copy `.env.example` locally; **never commit** `.env.local` or real secrets.
- Auth uses custom JWT cookies (`AUTH_*_TOKEN_SECRET`), not NextAuth.
- After **any** variable change on Railway, **redeploy** the `qmeet` service before testing.

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
