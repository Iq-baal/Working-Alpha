# PayMe Protocol - Migration Context
## Last Updated: 2026-03-18 (Convex Cleanup Complete)

## Current Stack (Working Alpha)
- Working folder: `/home/opttimus/Desktop/Working Alpha`
- **Frontend:** React + Vite → Cloudflare Pages (`payme-protocol.cc`)
- **Backend:** Cloudflare Worker (Hono) + D1 (SQLite) + KV (sessions/ratelimit)
- **Auth:** Custom AuthProvider (replaces Dynamic WaaS) — email/password, session tokens in KV
- **Solana:** Devnet, client-side wallet generation (TweetNaCl + PBKDF2 + AES-GCM), sponsored transactions
- **USDC Mint:** `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- **Treasury Wallet:** `GWnMCxz3BuHpBvGVH46Bz1kPKZMkUCBPZhuuqBnaCbYM`
- **Sponsor API (VPS):** `https://api.payme-protocol.cc/api/solana` (Nginx proxy to `127.0.0.1:8787`)

## Infrastructure
- **Worker API:** `https://api.payme-protocol.cc` (Cloudflare Worker `payme-api`)
- **D1 Database:** `payme-db` (ID: `761d5d16-95c0-4571-b3fa-51b9e0404cea`)
- **KV — SESSIONS:** `47d2d7ac6f64440caef52f6f70d76c63` (30-day TTL Bearer tokens)
- **KV — RATELIMIT:** `f18b1211017b4bd3b29b6affeec4d7a1`
- **Pages project:** `payme-protocol` → `payme-protocol-el5.pages.dev`
- **Custom domains:** `payme-protocol.cc`, `www.payme-protocol.cc`

## Latest Changes (2026-03-18) — Full Feature Sprint Phase 1, 2 & Bug Fixes

### Bug Fixes (2026-03-18) — PART 2: Complete Convex Removal
**Issue:** Convex errors on push registration ("Unauthenticated") and useMemo crashes
**Root Cause:** 
1. Deprecated Convex files still in codebase causing cached service worker issues
2. `convex` package still in dependencies
3. Missing defensive null checks in useMemo hooks iterating over async data

**Fixes Applied:**
- `src/main.tsx` — Removed `ConvexClientProvider` wrapper (app no longer initializes Convex client)
- `src/lib/push.ts` — Rewrote to use Worker API (`db.subscribePush`, `db.getVapidPublicKey`) instead of Convex mutations
- `src/providers/AuthProvider.tsx` — Replaced inline push subscription code with `registerPush()` from push.ts
- **DELETED:** `src/providers/CustomConvexClientProvider.tsx` — Removed entirely
- **DELETED:** `src/lib/convexClient.ts` — Removed entirely
- **REMOVED:** `convex` package from `package.json` dependencies
- `public/sw.js` — Added cache busting (v2) to force clear old Convex code from users' browsers
- `src/components/send/SendModal.tsx` — Added defensive `(array || [])` fallbacks in useMemo hooks
- `src/hooks/useDataHooks.ts` — Added defensive null check for `liveTxs` in useMemo
- `src/components/request/RequestMoneyModal.tsx` — Fixed duplicate return statement

**Verification:**
- ✅ Build completes with no Convex references in dist/
- ✅ No `convex` imports remain in src/
- ✅ Service worker v2 forces cache clear for returning users

---

### Phase 2: UI Polish & Integration (2026-03-18)

**Frontend - WalletTab.tsx:**
- Added FX rate refresh mechanism: Polls `/api/fx/rates` every 15 minutes on component mount
- Live currency rates automatically update CURRENCIES array with current market data
- Balance color animation: Green flash (`rgba(34, 197, 94, 0.08)`) on balance increase, red flash (`rgba(239, 68, 68, 0.08)`) on decrease
- Text shadow glow effect on balance amount during change (1.5s duration)
- Uses Framer Motion for smooth transitions

**Frontend - SettingsTab.tsx:**
- Added Contabo S3 avatar upload integration
- Camera button overlay on avatar with upload spinner
- File validation: image type check + 5MB size limit
- Uploads via `db.uploadFile(file, 'avatar')` → updates profile with S3 URL
- Imported `Camera` icon from lucide-react
- Added `bumpLiveProfileRefresh` import for profile refresh after upload

**Frontend - index.css:**
- Glassmorphic bottom nav styling enhanced:
  - Changed from full-width to floating pill (16px margins on sides)
  - Added `backdrop-filter: blur(20px) saturate(180%)` for iOS-style glass effect
  - Added floating shadow: `0 8px 32px rgba(0, 0, 0, 0.4)`
  - Added inset highlight: `inset 0 1px 0 rgba(255, 255, 255, 0.1)`
  - Border radius: 20px for rounded pill shape
  - Updated scroll content padding to `calc(80px + var(--safe-bottom))` for floating nav clearance

**Backend - db.ts:**
- Extended `updateProfile()` to accept `avatarUrl` parameter
- Persists S3 avatar URL to D1 `users.avatar_url` column

**Deployment:**
- Frontend deployed to `https://main.payme-protocol-el5.pages.dev`

---

### Phase 1: Backend + Core Frontend (2026-03-18)

### D1 Schema (migrations 006, 007, 008 — APPLIED)
**Migration 006 — Referral & Discoverable:**
- Added `users.referral_code` (TEXT) — user's shareable invite code (uppercase username)
- Added `users.referred_by` (TEXT) — ID of who referred them
- Added `users.pay_points` (INTEGER DEFAULT 0) — leaderboard points
- Added `users.discoverable` (INTEGER DEFAULT 1) — visible in search
- Added `users.notification_prefs` (TEXT) — JSON blob for notification preferences
- Added `users.security_question` (TEXT)
- Added `users.security_answer_hash` (TEXT) — bcrypt hashed answer
- Added `users.invite_validated` (INTEGER DEFAULT 0) — passed invite gate
- Added `users.password_version` (INTEGER DEFAULT 1) — session invalidation on password change
- Added `users.avatar_url` (TEXT) — S3 URL for avatar
- Backfilled existing users: `UPDATE users SET invite_validated = 1`
- Indexes: `idx_users_referral_code`, `idx_users_pay_points`

**Migration 007 — Push Subscriptions:**
- Created `push_subscriptions` table (id, user_id, endpoint, p256dh, auth, created_at)
- Unique constraint on (user_id, endpoint)
- Index: `idx_push_subs_user`

**Migration 008 — Notifications:**
- Created `notifications` table (id, user_id, type, title, content, data, read, created_at)
- Index: `idx_notifications_user`

### Backend Worker (`payme-api/src/index.ts`) — New Routes & Modifications

**New Routes Added:**
- `POST /api/auth/validate-invite` — Invite validation (PRIVATE TESTER or referral codes, 3-use limit, awards +10 PayPoints)
- `GET /api/referrals/my` — User's PayPoints, referral code, list of referred users
- `GET /api/referrals/leaderboard` — Top 50 users by PayPoints with user's own rank
- `GET /api/notifications` — List user's notifications (last 50)
- `PATCH /api/notifications/:id/read` — Mark notification as read
- `POST /api/notifications/broadcast` — Admin broadcast to all users
- `GET /api/push/vapid-public-key` — VAPID public key for Web Push
- `POST /api/push/subscribe` — Subscribe to push notifications
- `DELETE /api/push/subscribe` — Unsubscribe
- `POST /api/auth/reset-password/request` — Request password reset (returns security question if set)
- `POST /api/auth/reset-password/verify-question` — Verify answer and reset password
- `POST /api/auth/change-password` — Change password (requires current password)
- `GET /api/fx/rates` — Fetch live FX rates from open.er-api.com
- `POST /api/upload` — Upload files to Contabo S3 (avatars, receipts)

**Modified Routes:**
- `GET /api/auth/me` — Returns new fields: `inviteValidated`, `discoverable`, `notificationPrefs`, `payPoints`, `referralCode`, `securityQuestion`
- `POST /api/users/claim-username` — Sets `referral_code = username.toUpperCase()` automatically
- `GET /api/users/search` — Filters by `discoverable = 1` (hidden users not searchable)
- `PATCH /api/users/profile` — Accepts `discoverable`, `notificationPrefs`, `securityQuestion`, `securityAnswer`, `avatarUrl`
- `POST /api/transactions/submit` — Awards PayPoints: +5 to sender, +2 to referrer if applicable

**Helper Functions Added:**
- `awardPoints(db, userId, points, reason)` — Updates pay_points and creates notification
- `sendPushToUser(env, userId, title, body)` — Sends Web Push via VAPID

**Worker Secrets Set:**
- `VAPID_PRIVATE_KEY` — Vi9-AMWwUHUXNV91f9DtLAnc9dc3HVCuSGiZaay7hLY
- `VAPID_PUBLIC_KEY` — BNYhGuNtrCzLyLU_-plQOALIZ6BfNDXZNzd87py1PZtb8a1uBDp0x4HKxQb57KpIC9B_ZYCdnJZh3p5jJl-aL1A
- `S3_ENDPOINT` — https://eu2.contabostorage.com/payme
- `S3_ACCESS_KEY` — ec3fb379edfe282b967fe9069bb1c331
- `S3_SECRET_KEY` — df4af020eb7545b13aaec728a856b008
- `S3_BUCKET` — payme

**Worker Deployed:** version `3e98fead-d040-499a-8d30-9085df8a3f30`

### Frontend Changes

**Auth Flow Extended:**
- `AppStep` type: `'welcome' | 'invite' | 'claim' | 'app'`
- Routing logic: checks `!inviteValidated` → routes to `'invite'` step before username claim
- Imported `InviteGate` component
- After invite authorized → routes to `'claim'` (or `'app'` if username already claimed)

**Type Updates:**
- `AuthProvider.User` extended with: `inviteValidated`, `discoverable`, `notificationPrefs`, `payPoints`, `referralCode`, `securityQuestion`
- `api.ts User` type updated with same fields

**API Client Functions:**
- `validateInviteCode({ code, externalUserId })` — Calls real `POST /api/auth/validate-invite` endpoint

**Frontend Deployed:** `https://main.payme-protocol-el5.pages.dev`

## Completed Features ✅
### Phase 2 - UI Polish & Integration:
1. **FX Rate Refresh** — WalletTab polls `/api/fx/rates` every 15 minutes, updates CURRENCIES array with live market data
2. **Balance Color Animation** — Green flash on increase, red flash on decrease using Framer Motion + text shadow glow
3. **Glassmorphic Bottom Nav** — Floating iOS-style pill with backdrop blur, saturation boost, floating shadow, inset highlight
4. **Contabo S3 Avatar Upload** — Camera button on avatar, file validation, upload to S3, profile update with URL

### Phase 1 - Backend + Core Frontend:
1. **Invite Gate** — Users must enter "PRIVATE TESTER" or a valid referral code (uppercase username) to access the app
2. **Referral System Backend** — Per-user referral codes, 3-use limit, +10 PayPoints per signup
3. **PayPoints Economy** — +10 for referral signup, +5 for own outgoing transfers, +2 for referee's transfers
4. **Leaderboard Backend** — GET /api/referrals/leaderboard returns ranked list
5. **Discoverable Toggle Backend** — Users can hide from username search
6. **Notification System Backend** — Persistent notifications table, list/mark-read endpoints
7. **Push Notifications Backend** — VAPID-based Web Push subscriptions
8. **Password Reset Backend** — Security question-based recovery
9. **FX Rates Endpoint** — Live rates from open.er-api.com
10. **Contabo S3 Integration** — File upload endpoint for avatars/receipts

## Pending Implementation ⏳

### Frontend (All Core Features Complete - Remaining Items are Optional Enhancements)
1. **Receipt Upload UI** — Integrate `db.uploadFile()` in transaction history for receipt attachments
2. **Push Notification UI Polish** — Enhanced notification drawer with real-time push updates
3. **Leaderboard Real-time Updates** — Auto-refresh leaderboard when user earns points

### Completed (Previously Pending):
~~1. Password Reset UI~~ ✅ — Implemented in WelcomeScreen and Settings security-question screen
~~2. Settings Persistence~~ ✅ — Discoverable toggle, notification prefs persist to DB
~~3. Referral UI~~ ✅ — Leaderboard screen implemented, referral list shows in settings
~~4. Push Notifications~~ ✅ — Service worker created, subscription integrated in AuthProvider
~~5. FX Rate Refresh~~ ✅ — Polls every 15 min in WalletTab
~~6. Contabo S3 Avatar Upload~~ ✅ — Integrated in SettingsTab with camera button
~~7. Balance Color Animation~~ ✅ — Green/red flash implemented with Framer Motion
~~8. Glassmorphic Bottom Nav~~ ✅ — Floating pill styling applied in index.css

### Testing & Verification
- End-to-end test: signup → invite gate → username claim → dashboard → bonus claim
- Test referral flow: User A refers User B → verify +10 points to A
- Test discoverable toggle: turn off → search from another account → should not find
- Test push notifications: allow permission → send payment → verify browser push appears
- Test password reset: set security question → forgot password → answer → reset

## App Flow (Current)
1. User signs up → wallet generated → temp username stored
2. **NEW:** User routed to **Invite Gate** → enters "PRIVATE TESTER" or referral code
3. If valid → `invite_validated=1` in DB, referrer gets +10 points (if referral code used)
4. User routed to **UsernameClaim** → claims unique username → `referral_code` set automatically
5. User routed to **Dashboard** → sees USDC balance
6. Welcome bonus card visible if `bonusClaimed === false`
7. User claims bonus → sponsor sends 10,000 USDC → `bonus_claimed=1`
8. All transactions: sponsor pays SOL gas, 0.005% fee → treasury, sender earns +5 PayPoints

## Key File Locations
- Worker: `payme-api/src/index.ts`
- D1 migrations: `payme-api/migrations/` (001-008)
- Auth context: `src/providers/AuthProvider.tsx`
- Data layer: `src/lib/db.ts`
- API client: `src/lib/api.ts`
- Navigation: `src/App.tsx` (AppStep type + routing logic)
- Invite gate: `src/components/auth/InviteGate.tsx`
- Username claim: `src/components/auth/UsernameClaim.tsx`
- Bonus claim: `src/components/dashboard/WalletTab.tsx`
- Settings: `src/components/settings/SettingsTab.tsx`
- Wallet crypto: `src/lib/wallet.ts`
- Push notifications: `src/lib/push.ts`
- Service worker: `public/sw.js`
- ~~**DEPRECATED (can delete):** `src/providers/CustomConvexClientProvider.tsx`, `src/lib/convexClient.ts`~~ **DELETED**

## Previous Architecture (superseded)
- Dynamic WaaS auth → replaced by custom AuthProvider
- PocketBase → removed from VPS
- Convex self-hosted → replaced by Cloudflare Worker + D1
- `_worker.js` bridge for Cloudflare Pages → no longer needed (Worker handles all API)

## Recent Changes (2026-03-19)
- Worker CORS now allows `https://payme-protocol-el5.pages.dev` and optional subdomains to prevent API calls from being blocked on Pages domains.
- Verification: local origin allowlist check returned ALLOWED for `https://payme-protocol-el5.pages.dev`.

## Recent Changes (2026-03-19)
- Frontend now loads `src/polyfills.ts` to provide `Buffer` in the browser for Solana Web3 usage.
- Worker bootstraps a Buffer polyfill (nodejs_compat) to prevent `Buffer is not defined` during Solana transaction assembly.
- CORS allowlist now uses `FRONTEND_URL` when set and still allows Pages preview domains.
- Added explicit `ALCHEMY_RPC_URL` check in `/api/solana/claim-bonus` for clearer failures.

## Recent Changes (2026-03-19)
- Claim-bonus now fetches blockhash immediately before signing and retries once on `Blockhash not found`, and sets `lastValidBlockHeight` on the transaction.

## Recent Changes (2026-03-19)
- `/api/solana` health check now verifies RPC reachability, sponsor key, mint existence, sponsor SOL, and sponsor USDC ATA/balance; returns issues/details instead of a fixed OK.

## Recent Changes (2026-03-19)
- Send flow now fetches the latest blockhash after the password prompt, passes `lastValidBlockHeight` into `buildSponsoredTransaction`, and confirms with the fresh blockhash.
- `/api/solana` buildSponsoredTransaction now requires `lastValidBlockHeight` and sets it on the transaction.
- Gift airdrops now fetch a fresh blockhash per recipient right before signing and set `lastValidBlockHeight` on the transaction.
