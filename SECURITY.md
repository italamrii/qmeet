# QIMAM Meet — Security Decisions

> Living document. Every security-relevant decision is recorded here with rationale.
> Threat context: internal communications platform positioned for government/enterprise
> use — treat all meeting metadata and recordings as sensitive.

## Transport

- **TLS/WSS only, no plaintext fallback.** The app sends `Strict-Transport-Security` (2 years, includeSubDomains) from middleware and `.env.example` mandates `wss://` for `LIVEKIT_URL`. Deployment note: terminate TLS at the reverse proxy (Caddy/nginx/Traefik) for both the app and the LiveKit SFU; do not open port 80 except for ACME challenges + redirect.

## Password hashing — why argon2id over bcrypt

- argon2id is the current OWASP/PHC first recommendation: memory-hard (GPU/ASIC-resistant) and side-channel-hardened (the "id" hybrid), whereas bcrypt is only CPU-hard and truncates passwords at 72 bytes.
- Planned parameters (Step 3): `memoryCost: 19456 KiB (19 MiB), timeCost: 2, parallelism: 1` — OWASP minimum baseline; tune upward if login latency budget allows.

## Application tokens — why short-lived JWT + refresh rotation

- **15-minute access tokens** bound the damage window of a stolen token without needing a server-side revocation list on every request.
- **Refresh tokens rotate on every use** and are stored as `httpOnly; Secure; SameSite=Strict` cookies: JavaScript can never read them (XSS containment) and cross-site requests never carry them (CSRF containment). The refresh cookie is additionally **path-scoped to `/api/auth`** so it is only ever transmitted to auth endpoints.
- Secrets are split (`AUTH_ACCESS_TOKEN_SECRET` ≠ `AUTH_REFRESH_TOKEN_SECRET`) so they can be rotated independently.

### Family-scoped reuse detection — why not user-global revocation

Each refresh token is persisted in the `RefreshToken` table with a `familyId` shared by every successor minted from the same login. On rotation the old row is marked `used`; if a **used token is ever replayed**, that is proof of theft (either the attacker or the legitimate client holds a stale copy), and the **entire family is revoked** — but *only* that family.

- **Why family-scoped:** revoking all of a user's sessions on every anomaly (e.g. a flaky mobile client retrying a rotation) would log the user out of every device constantly — an availability cost that pushes users toward weaker workarounds. Family scoping contains the compromised device lineage while leaving other legitimate sessions intact.
- **Global kill-switch retained:** `User.tokenVersion` is embedded in every access token and checked on verification. Incrementing it (ADMIN action / confirmed account compromise) invalidates **all** sessions within one access-token TTL. So we have both granularities: family for automated reuse detection, version bump for explicit "log out everywhere".
- `deviceInfo` on each row stores a **SHA-256 hash of the user-agent** — never the raw string, never an IP — enough to correlate a family to a device class during incident review without hoarding identifiable data.

### Enumeration & timing resistance (implemented in Step 3)

- Login returns an identical generic 401 for unknown-email and wrong-password; signup returns a generic 409 rather than "email already registered".
- Unknown-email logins still execute one argon2 verification against a dummy hash so both branches cost roughly the same wall time.

## LiveKit tokens — least privilege, short TTL

- Minted **server-side only** (`livekit-server-sdk` in a Route Handler). `LIVEKIT_API_SECRET` is never in the client bundle; nothing under `NEXT_PUBLIC_` relates to LiveKit credentials.
- **Grant matrix by role** (enforced at mint time, not in the UI):
  - `OBSERVER`: `canSubscribe` only — no publish, no data.
  - `PARTICIPANT`: `canSubscribe`, `canPublish`, `canPublishData` (chat).
  - `HOST`: participant grants + `roomAdmin` (mute-all, remove participant) + recording control.
  - `ADMIN`: host grants + room service management.
  A PARTICIPANT can never receive HOST-level token permissions because grants derive from the DB role, not from client input.
- **TTL ≤ 4 hours**, re-minted on reconnect. No long-lived media tokens exist anywhere.

## Room access control

- Room URLs are **not guessable capability URLs**: joining requires an authenticated session or a **signed, time-limited invite link** (HMAC-SHA256 over room ID + expiry using `INVITE_LINK_SECRET`; verified server-side; expired/forged links are rejected before any token is minted).
- Room creation is restricted to `HOST`/`ADMIN` roles, checked server-side.

## Recordings

- Egress writes to S3/MinIO with **server-side encryption enabled at the bucket level** (SSE-S3 minimum; SSE-KMS preferred where a KMS exists — MinIO: enable KMS via KES, or `sse-s3` default encryption on the bucket).
- The DB stores only the **object key**, never a URL. Playback goes through `/api/recordings/:id`, which performs a per-request authorization check and then issues a short-lived presigned URL (or streams). No public/static URLs, no `public-read` ACLs.

## Database

- **Prisma only — no raw SQL string concatenation anywhere.** If raw SQL is ever unavoidable, `$queryRaw` tagged templates (parameterized) are the only permitted form; `$queryRawUnsafe` is banned.
- App connects as a least-privilege role (no superuser, no DDL outside migrations).
- PII inventory (MVP): user `email` + `name` only. Stored plaintext — needed for login and display; protected by disk/volume encryption at the infra layer. Any future PII beyond this (phone, national ID) must be flagged in the schema with a comment and get column-level encryption review first.

## Input validation

- Every Route Handler parses its input with a **Zod schema before any DB or LiveKit SDK call**. Unvalidated input never reaches persistence or media layers. Validation failures return 400 with no internal detail leakage.

## Headers & CORS

- Middleware sets: CSP (frame-ancestors 'none', explicit connect-src for WSS), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS, and a Permissions-Policy limiting camera/mic/display-capture to same-origin.
- Known gap (tracked): CSP currently allows `unsafe-inline`/`unsafe-eval` for Next.js dev ergonomics and `connect-src wss: https:` until the real `LIVEKIT_URL` is known. **Before production:** move to nonce-based CSP and pin `connect-src` to the exact SFU origin.
- CORS: same-origin by default (no `Access-Control-Allow-Origin: *` anywhere). If CityMind later needs API access, its exact origin gets allowlisted explicitly.

## Rate limiting (implemented — Step 3)

- Login/signup/refresh endpoints use a fixed-window limiter (`src/lib/auth/rate-limit.ts`): **5 attempts / 15 minutes**, keyed on **both** client IP and normalized email — rotating IPs doesn't bypass an email lockout, and one hostile IP can't lock out a shared office NAT for all accounts.
- 429 responses carry `Retry-After`; limit checks run inside the Route Handlers (after Zod validation) so keys derive from validated input.
- **Scaling note:** the counter store is in-process (single-instance MVP). Before running multiple app instances, swap `MemoryStore` for Redis (e.g. `rate-limiter-flexible`) — the call surface is a single function.
- Client IP comes from the first `x-forwarded-for` hop; this is only trustworthy because the app is deployed exclusively behind our TLS-terminating reverse proxy (deployment requirement).

## Session cookie policy (implemented — Step 3)

- Both tokens live in `httpOnly` cookies — nothing session-related is ever placed in `localStorage`/`sessionStorage` (XSS cannot exfiltrate sessions).
- `SameSite=Strict` on both cookies is the primary CSRF control for the MVP (same-origin app, no cross-site embedding — reinforced by `frame-ancestors 'none'`).
- Password policy: 12–128 characters, length over composition rules (NIST SP 800-63B). New accounts always start as `PARTICIPANT`; role elevation is an explicit ADMIN action, never self-service.

## Audit logging

- Dedicated append-only `AuditLog` table records: room created, participant joined/left, recording started/stopped, login events. Each entry: event type, timestamp, actor user ID, target (room/meeting ID) — **no message payloads or media metadata**, minimizing sensitive data in logs.

## Secrets hygiene

- `.env` gitignored; `.env.example` documents every variable with purpose comments.
- Rotation practice documented in README §Security Setup (LiveKit dual-key rotation, independent JWT secret rotation, invite-link secret rotation trade-offs).
