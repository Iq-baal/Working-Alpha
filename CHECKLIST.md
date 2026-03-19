# PayMe Protocol - Completion Checklist

## Overview
This checklist guides the final steps for the PocketBase + Web3Auth migration.

---

## ✅ Phase 1: Frontend Migration (COMPLETED)

- [x] Appwrite/Convex references removed
- [x] PocketBase client in `src/lib/pb.ts`
- [x] DB access layer in `src/lib/db.ts`
- [x] Web3Auth provider integrated
- [x] Build passes locally (`npm run build`)

---

## 🔄 Phase 2: PocketBase Setup (IN PROGRESS)

### 2.1 Admin & Access
- [ ] Open PocketBase admin UI (default: `https://api.payme-protocol.cc/_/`)
- [ ] Create admin account
- [ ] Confirm you can log in

### 2.2 Collections & Fields
- [ ] Ensure the following collections exist:
  - users (auth)
  - transactions
  - contacts
  - notifications
  - merchants
  - support_messages
  - system_config
- [ ] Verify required fields and indexes
- [ ] Review collection access rules

### 2.3 Optional Setup Script
- [ ] If needed, run `setup-pocketbase-schema.sh` or `setup-pocketbase-schema-v2.sh`

---

## 📊 Phase 3: Data Migration (IF NEEDED)

- [ ] Export any legacy data
- [ ] Import into PocketBase collections
- [ ] Verify record counts and key relationships

---

## 🧪 Phase 4: Testing (PENDING)

### 4.1 Local Preview
- [ ] `npm run preview`
- [ ] Test on desktop + mobile

### 4.2 Feature Checks
- [ ] Web3Auth login (email)
- [ ] Wallet creation and session restore
- [ ] Send money flow
- [ ] Receive flow / QR
- [ ] Transaction history
- [ ] Notifications
- [ ] Profile updates
- [ ] Admin mode (`?admin=true`) if applicable

---

## 🚀 Phase 5: Deployment (PENDING)

- [ ] `npm run build`
- [ ] `npx wrangler pages deploy dist --project-name payme-protocol --branch production`
- [ ] Verify `payme-protocol.cc` and `www.payme-protocol.cc`
- [ ] Confirm CSP is correct in production

---

## 📝 Phase 6: Post-Deployment (PENDING)

- [ ] Error tracking (Sentry or similar)
- [ ] Uptime monitoring
- [ ] PocketBase backup routine
- [ ] Security review (rules, rate limits, env vars)

---

## Notes

- Keep `backups/` intact.
- Avoid adding new backend dependencies without confirming the need.
