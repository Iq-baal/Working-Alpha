# Quick Reference Card

## 🚀 Start Here
1. Read `CONTEXT.md` - Current state
2. Read `SESSION-SUMMARY.md` - What was done
3. Read `MIGRATION-GUIDE.md` - How to migrate components

## 📝 Common Tasks

### Update a Component
```bash
# 1. Open the component
# 2. Replace imports:
-import { useAuth } from '../auth/AppwriteAuthProvider';
-import { useAppwriteQuery } from '../../hooks/useAppwriteQuery';
+import { useAuth } from '../auth/Web3AuthProvider';
+import { usePBQuery } from '../../hooks/usePBQuery';

# 3. Update auth usage:
-const { user } = useAuth(); // user.userId
+const { user, wallet } = useAuth(); // user.id

# 4. Update queries:
-const data = useAppwriteQuery(() => db.someFunction(user.userId));
+const data = usePBQuery(() => db.someFunction(user.id), [user?.id]);

# 5. Check if db function exists in src/lib/db.ts
# 6. If not, implement it or simplify component logic
```

### Add a DB Function
```typescript
// src/lib/db.ts
export async function yourFunction(userId: string) {
  try {
    return await pb.collection(C.users).getFullList({
      filter: `userId = "${userId}"`,
    });
  } catch {
    return [];
  }
}
```

### Test Auth
```bash
npm run dev
# Go to http://localhost:5173
# Try signup with email
# Check if wallet is created
# Check localStorage for wallet_pk
```

## 📊 Progress Tracking

### Components Status
- ✅ Done: 1/20 (App.tsx)
- 🔄 In Progress: 0/20
- ⏳ Pending: 19/20

### Priority Order
1. Dashboard.tsx, WalletTab.tsx
2. SendModal.tsx, RequestMoneyModal.tsx
3. ProfileModal.tsx, SettingsTab.tsx
4. Everything else

## 🔧 Useful Commands

```bash
# Check what needs updating
grep -r "AppwriteAuthProvider\|useAppwriteQuery" src/components

# Count remaining files
grep -rl "AppwriteAuthProvider\|useAppwriteQuery" src/components | wc -l

# Try building
npm run build

# Run dev server
npm run dev

# Check for specific db function usage
grep -r "db\.functionName" src/components
```

## 🐛 Common Errors

### "Cannot find module 'AppwriteAuthProvider'"
→ Update import to Web3AuthProvider

### "Cannot find module 'useAppwriteQuery'"
→ Update import to usePBQuery

### "Property 'someFunction' does not exist on db"
→ Implement it in src/lib/db.ts or simplify component

### "Type 'RecordModel' is not assignable to type 'User'"
→ Cast it: `as any` or create proper types

## 📚 Key Files

- `src/components/auth/Web3AuthProvider.tsx` - Auth logic
- `src/lib/db.ts` - Database functions
- `src/lib/pb.ts` - PocketBase client
- `src/hooks/usePBQuery.ts` - Query hook
- `.env` - Environment variables

## 🎯 Today's Goal

Pick ONE component. Migrate it. Test it. Move on.

Don't overthink it. Just get it working.

---

**Remember**: The old code is backed up. You can always reference it.
**Files**: `*-backup.ts`, `*-appwrite-backup.tsx`, `_backup_*` directories
