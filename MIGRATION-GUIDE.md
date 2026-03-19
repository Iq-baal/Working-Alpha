# Migration Guide: Appwrite → PocketBase + Web3Auth

## Quick Reference

### Import Changes

**OLD (Appwrite):**
```typescript
import { useAuth } from '../auth/AppwriteAuthProvider';
import { useAppwriteQuery } from '../../hooks/useAppwriteQuery';
```

**NEW (PocketBase + Web3Auth):**
```typescript
import { useAuth } from '../auth/Web3AuthProvider';
import { usePBQuery } from '../../hooks/usePBQuery';
```

### Auth Hook Changes

**OLD:**
```typescript
const { user, isLoading } = useAuth();
// user has: userId, email, walletAddress, etc.
```

**NEW:**
```typescript
const { user, wallet, isLoading } = useAuth();
// user has: id, email, username, walletAddress, isAdmin, verified, created, updated
// wallet has: publicKey, privateKey (from embedded wallet)
```

### Query Hook Changes

**OLD:**
```typescript
const profile = useAppwriteQuery(
  user?.userId ? () => db.getProfile({ userId: user.userId }) : null
);
```

**NEW:**
```typescript
const profile = usePBQuery(
  user?.id ? () => db.getProfile(user.id) : null,
  [user?.id]
);
```

### Database Function Changes

Most db functions have been simplified. Check `src/lib/db.ts` for available functions.

**Common patterns:**
- `getProfile(userId)` - get user profile
- `getUserTransactions(userId)` - get user transactions
- `getUserContacts(userId)` - get user contacts
- `getUserNotifications(userId)` - get user notifications
- `createTransaction(data)` - create transaction
- `addContact(userId, contactUserId, nickname?)` - add contact
- `createNotification(data)` - create notification

## Files Requiring Updates

### Priority 1 (Core Auth & Dashboard)
- [x] src/App.tsx
- [ ] src/components/dashboard/Dashboard.tsx
- [ ] src/components/dashboard/WalletTab.tsx

### Priority 2 (User Features)
- [ ] src/components/send/SendModal.tsx
- [ ] src/components/request/RequestMoneyModal.tsx
- [ ] src/components/profile/ProfileModal.tsx
- [ ] src/components/profile/ExportKeyModal.tsx
- [ ] src/components/notifications/NotificationsDrawer.tsx
- [ ] src/components/history/TransactionDetailModal.tsx

### Priority 3 (Settings & Auth Flows)
- [ ] src/components/settings/SettingsTab.tsx
- [ ] src/components/settings/VerificationScreen.tsx
- [ ] src/components/auth/UsernameClaim.tsx
- [ ] src/components/auth/SetupScreen.tsx
- [ ] src/components/auth/WelcomeScreen.tsx
- [ ] src/components/auth/InviteGate.tsx
- [ ] src/components/auth/WalletExport.tsx

### Priority 4 (Admin & Advanced)
- [ ] src/components/admin/AdminDashboard.tsx
- [ ] src/components/support/UserSupportModal.tsx
- [ ] src/components/tabs/MerchantTab.tsx
- [ ] src/components/gift/GiftAirdropModal.tsx

## Common Issues & Solutions

### Issue: `useNav` and `useAppState` not found
These were custom hooks in the old App.tsx. You'll need to either:
1. Recreate them in the new App.tsx
2. Use React Router or similar for navigation
3. Use React Context for app state

### Issue: Missing db functions
Many complex functions from the old db.ts haven't been ported yet. You'll need to either:
1. Implement them in the new `src/lib/db.ts`
2. Simplify the component logic
3. Call PocketBase directly using `pb.collection(...)`

### Issue: Type mismatches
PocketBase returns `RecordModel` types. Cast them as needed:
```typescript
const user = authData.record as any; // quick fix
// or create proper types
```

## Testing Checklist

After migrating each component:
- [ ] Component compiles without errors
- [ ] Auth state works correctly
- [ ] Data fetching works
- [ ] Mutations/updates work
- [ ] UI renders properly
- [ ] No console errors

## Notes

- The old Appwrite code is backed up in `*-backup.ts` files
- PocketBase uses different query syntax than Appwrite
- Web3Auth creates embedded wallets automatically on signup
- Wallet private keys are stored in localStorage (encrypt in production!)
