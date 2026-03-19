# Ready to Deploy ✅

**Date**: 2026-03-13 19:51
**Status**: Built with username claim flow

## User Flow

1. **Login** → Web3Auth modal (email/social)
2. **Wallet Created** → Embedded Solana wallet via Web3Auth
3. **Username Claim** → User picks unique username (3-20 chars)
4. **Dashboard** → Shows @username and wallet address

## What's Built

- ✅ Web3Auth integration
- ✅ PocketBase backend (https://api.payme-protocol.cc)
- ✅ Username claim screen
- ✅ Auto-generated usernames (user_abc12345)
- ✅ Username validation (lowercase, numbers, underscores)
- ✅ Simple dashboard

## Deployment

Network issues with wrangler. Deploy manually:

### Option 1: Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Pages → Create project
3. Upload `dist/` folder
4. Add environment variables (see below)

### Option 2: Git Deploy
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin YOUR_REPO
git push -u origin main
```
Then connect repo in Cloudflare Pages dashboard.

### Option 3: Retry Wrangler
```bash
npx wrangler pages deploy dist --project-name=payme-protocol --commit-dirty=true
```

## Environment Variables

Add in Cloudflare Pages settings:
```
VITE_POCKETBASE_URL=https://api.payme-protocol.cc
VITE_WEB3AUTH_CLIENT_ID=BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ
VITE_TREASURY_WALLET=5U4Jmc2N4ah7pv8xTsSRVyX5VxNRt1B4ugM3YS4wnbhS
VITE_SPONSOR_WALLET=2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu
VITE_BONUS_VAULT=2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu
VITE_SOLANA_RPC=https://rpc.ankr.com/solana_devnet
VITE_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

## Test Locally

```bash
npm run dev
# Visit http://localhost:5173
```

## Files

- `dist/` - Built files ready to deploy
- `deploy-cf.sh` - Deployment script
- All source in `src/`
- Old components in `_old_components/` for later

## Next Steps After Deploy

1. Test login flow
2. Test username claim
3. Add transaction features from `_old_components/`
4. Integrate gas payer wallet
5. Add send/receive functionality

---

**Everything is built. Just need to upload to Cloudflare.**
