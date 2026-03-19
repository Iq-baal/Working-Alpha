# Agent instructions (scope: this directory and subdirectories)

## Scope and layout
- **This AGENTS.md applies to:** `Working Alpha/` and below.
- **Project type:** React + Vite frontend (Cloudflare Pages) + Cloudflare Worker API (Hono + D1 + KV).
- **Key directories:**
  - `src/` — frontend application code
  - `src/providers/` — AuthProvider (custom auth, replaces Dynamic)
  - `src/lib/` — db.ts (data layer), api.ts (API client), wallet.ts (client-side Solana wallet), push.ts (Web Push)
  - `src/components/` — UI components
  - `payme-api/` — Cloudflare Worker (Hono), D1 migrations, middleware
  - `payme-api/src/index.ts` — all Worker route handlers
  - `payme-api/migrations/` — D1 SQL migrations
  - `public/` — static assets, sw.js (service worker)
  - `backups/` — local exports/backups (do not delete)

## Commands
- **Install frontend:** `npm install` (in `Working Alpha/`)
- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Install backend:** `npm install` (in `payme-api/`)
- **Type-check backend:** `cd payme-api && npx tsc --noEmit`
- **Deploy Worker:** `cd payme-api && npx wrangler deploy`
- **Apply D1 migration:** `cd payme-api && npx wrangler d1 execute payme-db --file=migrations/<file>.sql --remote`
- **Set Worker secret:** `cd payme-api && npx wrangler secret put <KEY>`
- **Deploy frontend:** `npx wrangler pages deploy dist --project-name payme-protocol --branch main`

## Backend (Cloudflare Worker)
- **Worker name:** `payme-api`
- **API base URL:** `https://api.payme-protocol.cc`
- **Auth:** Session tokens (Bearer) stored in KV namespace `SESSIONS` with 30-day TTL
- **Database:** D1 `payme-db` (SQLite) — users, transactions, support_messages, push_subscriptions, notifications tables
- **Rate limiting:** KV namespace `RATELIMIT` — IP-based sliding window
- **USDC mint:** `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` (Solana devnet)
- **Treasury wallet:** `GWnMCxz3BuHpBvGVH46Bz1kPKZMkUCBPZhuuqBnaCbYM`
- **Sponsor key:** Set via `wrangler secret put SPONSOR_PRIVATE_KEY` (base58 encoded)
- **Platform fee:** 0.005% of transfer amount deducted from sender in USDC → treasury
- **Solana RPC:** `https://api.devnet.solana.com`
- **S3 Storage:** Contabo S3 for avatars/receipts

## Key API Routes
### Auth
- `POST /api/auth/signup` — create account (temp username), returns `needsClaim: true`
- `POST /api/auth/signin` — sign in, returns `usernameClaimed`, `bonusClaimed` flags
- `GET  /api/auth/me` — verify session, returns full user with all flags
- `POST /api/auth/signout`
- `POST /api/auth/validate-invite` — validate invite code (PRIVATE TESTER or referral)
- `POST /api/auth/reset-password/request` — request password reset
- `POST /api/auth/reset-password/verify-question` — verify security answer and reset
- `POST /api/auth/change-password` — change password (requires current password)

### Users
- `GET  /api/users/search?q=` — username prefix search (BEFORE `/:username` route)
- `POST /api/users/claim-username` — claim real username (BEFORE `/:username`)
- `PATCH /api/users/profile` — update profile (discoverable, notificationPrefs, avatarUrl, etc.)
- `DELETE /api/users/account`
- `GET  /api/users/:username` — public profile lookup

### Transactions
- `POST /api/transactions/record` — record a completed transaction
- `POST /api/transactions/initiate`
- `POST /api/transactions/submit` — awards +5 PayPoints to sender
- `GET  /api/transactions/history`

### Referrals & Leaderboard
- `GET  /api/referrals/my` — user's PayPoints, referral code, referred users
- `GET  /api/referrals/leaderboard` — top 50 users by PayPoints

### Notifications
- `GET  /api/notifications` — list user's notifications
- `PATCH /api/notifications/:id/read` — mark as read
- `POST /api/notifications/broadcast` — admin broadcast

### Push Notifications
- `GET  /api/push/vapid-public-key` — get VAPID public key
- `POST /api/push/subscribe` — subscribe to push
- `DELETE /api/push/subscribe` — unsubscribe

### Solana
- `POST /api/solana/claim-bonus` — sends 10,000 USDC from sponsor, one-time per user
- `POST /api/solana` — generic sponsor relay

### Other
- `GET  /api/fx/rates` — live FX rates from open.er-api.com
- `POST /api/upload` — upload files to Contabo S3
- `GET/POST /api/support/messages`
- `GET  /api/admin/users`
- `GET  /api/admin/support`

## D1 Schema (current)
```
users: id, email, username, password_hash, solana_public_key, is_active,
       bonus_claimed, username_claimed, referral_code, referred_by, pay_points,
       discoverable, notification_prefs, security_question, security_answer_hash,
       invite_validated, password_version, avatar_url, created_at, updated_at
transactions: id, sender_id, receiver_id, amount_usdc, status, solana_signature,
              type, currency, fee, category, narration, memo, client_ref,
              display_amount, display_currency, display_symbol, created_at
support_messages: id, user_id, role, content, created_at
push_subscriptions: id, user_id, endpoint, p256dh, auth, created_at
notifications: id, user_id, type, title, content, data, read, created_at
```

## Frontend Auth Flow
1. Signup → wallet generated client-side (TweetNaCl + PBKDF2 + AES-GCM), temp username stored in D1
2. `needsClaim: true` returned → App routes to `step='invite'` (InviteGate component)
3. User enters invite code → `invite_validated=1` → routes to `step='claim'` (UsernameClaim)
4. Username claimed → `username_claimed=1` in D1 → routed to `step='app'` (Dashboard)
5. Signin: if `!inviteValidated` → step='invite'; if `!usernameClaimed` → step='claim'; else step='app'
6. Session restored on load via `GET /api/auth/me` which returns real DB flags
7. Push notification subscription happens automatically after auth

## AppStep type
`'welcome' | 'invite' | 'claim' | 'app'`

## Sponsor Model
- Users never hold SOL; sponsor keypair pays all gas fees
- Sponsor co-signs transactions via `POST /api/solana` (`buildSponsoredTransaction`)
- User signs the transaction client-side with their decrypted keypair
- Transaction broadcast via `POST /api/solana` (`broadcastSponsoredTransaction`)
- Welcome bonus: `POST /api/solana/claim-bonus` — sponsor sends 10,000 USDC directly, no user signature needed
- Platform fee: 0.005% of transfer amount sent to treasury wallet in same transaction

## PayPoints Economy
- +10 PayPoints for each successful referral signup
- +5 PayPoints for each outgoing transfer (sender)
- +2 PayPoints to referrer when their referee makes a transfer
- Leaderboard ranks users by total PayPoints

## VPS Notes
- Sponsor API service: `payme-sponsor` on `127.0.0.1:8787` (legacy, now superseded by Worker `/api/solana`)
- Sponsor API public endpoint: `https://api.payme-protocol.cc/api/solana` (Nginx proxy to VPS)
- Sponsor env: `/etc/payme-sponsor.env`
- NOTE: The Worker's `POST /api/solana` and `POST /api/solana/claim-bonus` now handle sponsoring directly
  using the `SPONSOR_PRIVATE_KEY` Worker secret. The VPS sponsor service is a fallback.

## Cloudflare Pages
- Project: `payme-protocol`
- Pages domain: `payme-protocol-el5.pages.dev`
- Custom domains: `payme-protocol.cc`, `www.payme-protocol.cc`

## Conventions
- Keep UI logic in `src/components/` and data access in `src/lib/db.ts`.
- Keep low-level HTTP calls in `src/lib/api.ts`.
- All new backend routes go in `payme-api/src/index.ts`.
- Register static `/api/users/*` routes (search, claim-username, profile, account) BEFORE `/:username`.
- Update `CONTEXT.md` with progress after meaningful changes.
- Always run `npx tsc --noEmit` in `payme-api/` before deploying the Worker.
- Always run `npm run build` in `Working Alpha/` before deploying the frontend.
- No Convex code — fully migrated to Cloudflare Worker.

## Product Rules
- Signup flow enforces unique username claim, bound to wallet address, before dashboard access.
- Users never touch SOL — all gas is sponsored by the gas payer wallet.
- Welcome bonus is 10,000 USDC, one-time only per user (enforced in D1 + Worker).
- Transfers deduct 0.005% platform fee in USDC to treasury wallet + sponsor covers SOL gas.
- Transfers accept username or wallet address as recipient.
- Invite gate required: "PRIVATE TESTER" or valid referral code (3-use limit per code).

## Do not
- Do not delete `backups/` or historical files without explicit request.
- Do not add new backend dependencies without confirming the need.
- Do not use `Buffer` in Worker code (not available in the Cloudflare Workers runtime); use `Uint8Array`, `atob`, `btoa` instead.
- Do not register dynamic route `/api/users/:username` before static `/api/users/search` or `/api/users/claim-username`.
- Do not add Convex dependencies — project has fully migrated to Cloudflare Worker.
