# Security Best Practices Report

## Executive Summary
The current production stack had multiple high-risk exposures stemming from public PocketBase rules, unauthenticated write paths, and network services listening publicly without a firewall. I applied incremental hardening: PocketBase rules now require auth and ownership where possible, file upload types were restricted, PocketBase auth bridging was added, the sponsor API was bound to localhost, UFW was enabled, and Nginx rate limiting was added. Push notifications are now handled server-side with authenticated requests, and the frontend admin secret was removed. Remaining risk: PocketBase object storage settings still need to be aligned with Contabo object storage to avoid VPS disk growth.

## Critical Findings
1. **[C-1] Public PocketBase rules allowed unauthenticated read/write of user and financial data.**
   Impact: Any unauthenticated client could read or mutate user profiles, transactions, contacts, notifications, and system configuration. 
   Remediation: Updated live PocketBase rules to require auth and ownership for `users`, `transactions`, `contacts`, `notifications`, `support_messages`, `merchants`, `system_config`, `push_subscriptions`, and `receipts`.

## High Findings
1. **[H-1] Sponsor API listening on public interface with no firewall.**
   Impact: Public access to the Solana sponsor API increases abuse and DoS risk.
   Remediation: Bound sponsor API to `127.0.0.1`, enabled UFW with only `22/80/443`, and added Nginx rate limiting.

2. **[H-2] Push endpoints accepted arbitrary `userId` without authentication.**
   Impact: Any caller could create or delete push subscriptions for other users, enabling spam or denial of notifications. 
   Remediation: Added PocketBase auth token validation on all `/api/push/*` handlers; subscribe/prefs/unsubscribe now require the caller token to match `userId`. Push sends now enforce caller ownership (or admin) and notifications are created server-side before sending.
   Status: Resolved.

## Medium Findings
1. **[M-1] Hardcoded admin secret in frontend code.**
   Impact: The admin elevation key is discoverable in the client bundle, enabling privilege escalation. 
   Remediation: Removed the client-side admin secret and the admin elevation flow from the frontend bundle.
   Status: Resolved.

2. **[M-2] File upload types were overly permissive.**
   Impact: SVG or arbitrary file uploads increase XSS and storage abuse risk. 
   Remediation: Restricted avatar uploads to raster images and receipts to `png/jpg/pdf` via PocketBase schema updates.

## Low Findings
1. **[L-1] Object storage configuration not detected in PocketBase settings.**
   Impact: Large files may consume VPS disk instead of the intended object store. 
   Remediation: Enabled PocketBase S3 storage and pointed it at the Contabo bucket, then restarted PocketBase.
   Status: Verified. Files are stored under `<collectionId>/<recordId>/<filename>` in the Contabo bucket.

## Notes on Ownership Gaps
- `receipts` ownership was added via a `userId` field and rules now enforce per-user access. Existing legacy receipts without `userId` will be inaccessible until backfilled.
