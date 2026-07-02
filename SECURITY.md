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

## LiveKit tokens — least privilege, short TTL (implemented — Step 5)

- Minted **server-side only** at `POST /api/livekit/token` (`livekit-server-sdk` in `lib/media/livekit-server.ts`). `LIVEKIT_API_SECRET` is never in the client bundle; nothing under `NEXT_PUBLIC_` relates to LiveKit credentials. The client receives only `{ token, livekitUrl, identity, participantName, role }`.
- **Role is resolved server-side, never trusted from the client:** an authenticated session maps its account role → media role; a guest's role comes from a verified invite grant. The Zod-validated request body's role (if any) is ignored.
- **Grant matrix by role** (`grantForRole`, enforced at mint time):
  - `PARTICIPANT` / `GUEST`: `roomJoin`, `canSubscribe`, `canPublish`, `canPublishData` (chat) — **no admin**.
  - `HOST` / `CO_HOST`: the above **+ `roomAdmin`** (server-side mute/remove authority) **+ `canUpdateOwnMetadata`**.
  A PARTICIPANT/GUEST can never receive `roomAdmin` because grants derive from the server-resolved role. (A subscribe-only OBSERVER media role is deferred to Step 6.)
- **TTL ≤ 4 hours** (`LIVEKIT_TOKEN_TTL_SECONDS`), re-minted on a fresh join. No long-lived media tokens exist.
- **Identity is non-guessable and server-chosen:** `user_<cuid>` for members, `guest_<uuid>` for guests.
- **Rate limited:** 10 token requests / 15 min per IP.

## Room invites & guest grants (implemented — Step 5)

- Invite links are **stateless HMAC-SHA256 tokens** (`lib/media/invite.ts`) over `{ roomId, role, exp }`, signed with `INVITE_LINK_SECRET`, verified server-side with constant-time comparison, expiry enforcement, and room-match. Forged/expired/mismatched → generic rejection.
- The **raw invite token never travels into the room URL**. On a guest join, the join page POSTs it once to `POST /api/livekit/guest`, which verifies it and sets a short-lived **httpOnly, Secure, SameSite=Strict guest-grant cookie** (`lib/media/guest-session.ts`) carrying `{ roomId, role, name, gid }`. The token endpoint reads that cookie — the invite is never re-exposed to client JS.
- Invite links default to `GUEST` (never HOST). Step 6 adds a `Room.invitesRevoked` / per-link revocation check.

## Host moderation & recording in LiveKit mode (deferred to Step 6)

Force-mute, remove-participant, end-for-all, and recording require **server-side authority** (LiveKit `RoomServiceClient` / Egress with the API secret). In Step 5 the LiveKit client applies these as **host-local optimistic UI only** (clearly marked `TODO(step 6)`); they do not yet affect other participants or start real recording. This keeps the UI functional and honest without granting the browser privileged control.

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
- `connect-src` is now pinned (Step 5) to `'self'` **plus the exact configured `LIVEKIT_URL` origin** (both `wss://host` and `https://host`) — no `wss:`/`https:` wildcards. In mock mode (no `LIVEKIT_URL`) it is `'self'` only. Additional TURN hosts, if a deployment uses them, are added to the same directive in `middleware.ts`.
- Known gap (tracked): CSP still allows `unsafe-inline`/`unsafe-eval` for Next.js dev ergonomics + framer-motion inline styles. **Before production:** move to a nonce-based CSP.
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
