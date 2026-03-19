# PayMe Protocol - Final Setup Guide

## Current Status

✅ **Completed:**
- Frontend migrated from Convex to Appwrite
- Authentication migrated from Dynamic Labs to Appwrite
- HTTPS setup with custom domain (api.payme-protocol.cc)
- Appwrite deployed on VPS (62.171.154.123)
- SSL certificate configured (Cloudflare Origin Certificate)

❌ **Remaining:**
- Create Appwrite admin account
- Set up database collections
- Migrate data from Convex backup
- Test and deploy

## Step 1: Create Appwrite Admin Account

1. Open the Appwrite Console:
   ```
   https://api.payme-protocol.cc/console/
   ```

2. Create your admin account (first signup becomes root admin)
   - Use a secure email and password
   - Save these credentials securely

3. After logging in, create an API key:
   - Go to **Settings** → **API Keys**
   - Click **Add API Key**
   - Name: `Migration Key`
   - Scopes: Select **All** (or at minimum: `databases.read`, `databases.write`, `collections.read`, `collections.write`)
   - Expiration: Set to a future date (e.g., 1 year)
   - Copy the API key (you won't see it again!)

## Step 2: Set Up Database Collections

1. Export your API key:
   ```bash
   export APPWRITE_API_KEY="your_api_key_here"
   ```

2. Run the setup script:
   ```bash
   cd /home/opttimus/Alpha-1
   node setup-appwrite.js
   ```

   This will create:
   - Database: `main`
   - Collections: `users`, `transactions`, `notifications`, `contacts`, `merchants`, `supportMessages`, `systemConfig`
   - All attributes and indexes

## Step 3: Migrate Data from Convex

The Convex backup is located at:
```
/home/opttimus/Alpha-1/backups/convex-prod-2026-03-11.zip
```

### Option A: Manual Migration (Recommended for small datasets)

1. Extract the backup:
   ```bash
   cd /home/opttimus/Alpha-1/backups
   unzip -o convex-prod-2026-03-11.zip -d extracted-latest
   ```

2. Review the extracted data:
   ```bash
   ls -la extracted-latest/
   ```

3. Use the Appwrite Console to manually import critical data:
   - Go to **Databases** → **main** → Select a collection
   - Click **Add Document**
   - Copy data from extracted JSON files

### Option B: Automated Migration (For larger datasets)

1. Update the migration script with your API key:
   ```bash
   nano migration/migrate-data.py
   ```
   
   Update these lines:
   ```python
   API_KEY = "your_api_key_here"
   BASE = "https://api.payme-protocol.cc/v1/databases/main/collections"
   ```

2. Install Python dependencies (if needed):
   ```bash
   python3 -m pip install requests
   ```

3. Run the migration:
   ```bash
   cd /home/opttimus/Alpha-1
   python3 migration/migrate-data.py
   ```

## Step 4: Create Storage Bucket

1. In Appwrite Console, go to **Storage**
2. Click **Add Bucket**
3. Bucket ID: `receipts`
4. Name: `Receipts`
5. Permissions: Configure as needed
6. File Security: Enable
7. Maximum File Size: 10MB
8. Allowed File Extensions: `pdf,png,jpg,jpeg`

## Step 5: Deploy Solana Function

The Solana function handles bonus claims and blockchain operations.

1. Check if the function exists:
   - Go to **Functions** in Appwrite Console
   - Look for function ID: `payme-solana`

2. If not exists, create it:
   - Click **Add Function**
   - Function ID: `payme-solana`
   - Name: `PayMe Solana`
   - Runtime: `node-18.0` or `node-20.0`
   - Entrypoint: `src/index.js`
   - Build Commands: `npm install`

3. Deploy the function code (if you have it in your repo)

## Step 6: Test the Application

1. Build the frontend:
   ```bash
   cd /home/opttimus/Alpha-1
   npm run build
   ```

2. Test locally:
   ```bash
   npm run preview
   ```

3. Test key features:
   - [ ] User registration
   - [ ] User login
   - [ ] Wallet generation
   - [ ] Send money
   - [ ] Receive money
   - [ ] Transaction history
   - [ ] Notifications
   - [ ] Profile settings

## Step 7: Deploy to Production

### Deploy to Cloudflare Pages

```bash
cd /home/opttimus/Alpha-1
npm run build
wrangler pages deploy dist --project-name payme-protocol --branch production
```

### Verify Deployment

1. Check the deployment URL (will be shown in terminal)
2. Test on the live site: `https://payme-protocol.pages.dev`
3. Verify custom domain: `https://payme-protocol.cc`

## Environment Variables Checklist

Make sure these are set in your `.env` file:

```bash
# Appwrite
VITE_APPWRITE_ENDPOINT=https://api.payme-protocol.cc/v1
VITE_APPWRITE_PROJECT=69b1b3160029daf7b418

# Solana
VITE_TREASURY_WALLET=5U4Jmc2N4ah7pv8xTsSRVyX5VxNRt1B4ugM3YS4wnbhS
VITE_SPONSOR_WALLET=2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu
VITE_BONUS_VAULT=2kqMXNofB1nnVtoeXJMKvFuXqqUv45ePWBbFPSMW6Whu
VITE_SOLANA_RPC=https://api.devnet.solana.com
VITE_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
```

## Troubleshooting

### Issue: "User missing scopes" error
**Solution:** Make sure your API key has the correct scopes enabled.

### Issue: "Collection not found" error
**Solution:** Run the setup script again to create collections.

### Issue: SSL certificate errors
**Solution:** The Cloudflare Origin Certificate is already configured. If you see errors, check:
- Traefik configuration on VPS
- Certificate files at `/root/appwrite/ssl/`

### Issue: Authentication not working
**Solution:** 
- Verify `VITE_APPWRITE_ENDPOINT` uses `https://`
- Check Appwrite project ID matches
- Clear browser cache and localStorage

## Important Notes

1. **Convex Backup:** Keep `backups/convex-prod-2026-03-11.zip` safe as a rollback option
2. **API Keys:** Store API keys securely, never commit to git
3. **Database:** The database ID is `main` (not `payme-protocol` as in the JSON)
4. **Indexes:** Some indexes may take time to build, be patient
5. **Testing:** Test thoroughly before switching production traffic

## Support

If you encounter issues:
1. Check Appwrite logs on VPS: `docker logs appwrite-appwrite-1`
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Review the PROGRESS.md and HANDOFF.md files for context

## Next Steps After Completion

1. Set up monitoring and alerts
2. Configure backups for Appwrite database
3. Set up CI/CD pipeline
4. Add rate limiting and security headers
5. Configure proper CORS policies
6. Set up analytics and error tracking
