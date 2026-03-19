# VPS Setup Complete ✅

**Date**: 2026-03-13 19:12
**Status**: PocketBase backend fully configured and running

## What Was Done

### 1. PocketBase Installation
- Downloaded PocketBase v0.22.21
- Installed to `/usr/local/bin/pocketbase`
- Created working directory at `/opt/pocketbase`
- Set up systemd service for auto-start

### 2. Nginx Configuration
- Configured reverse proxy on port 80/443
- Proxies to PocketBase on localhost:8090
- Added CORS headers for API access
- Enabled WebSocket support

### 3. SSL Certificate
- Installed certbot
- Obtained Let's Encrypt certificate for api.payme-protocol.cc
- Auto-renewal configured
- HTTPS redirect enabled

### 4. Database Schema
Created all required collections:
- **users** (auth collection)
  - username, walletAddress, isAdmin, verified, avatarUrl, bio
  - Unique indexes on username and walletAddress
  
- **transactions**
  - senderId, recipientId, amount, signature, type, status, memo
  - Indexes on senderId and recipientId
  
- **contacts**
  - userId, contactUserId, nickname
  - Index on userId
  
- **notifications**
  - userId, title, message, type, read
  - Index on userId
  
- **merchants**
  - userId, businessName, category, description
  - Index on userId
  
- **support_messages**
  - userId, message, isAdmin
  - Index on userId

### 5. Admin Account
- Email: admin@payme-protocol.cc
- Password: PayMe2024Secure
- Access admin UI at: https://api.payme-protocol.cc/_/

## API Endpoints

- **Base URL**: https://api.payme-protocol.cc/api
- **Health Check**: https://api.payme-protocol.cc/api/health
- **Admin UI**: https://api.payme-protocol.cc/_/
- **Collections**: https://api.payme-protocol.cc/api/collections

## Testing

```bash
# health check
curl https://api.payme-protocol.cc/api/health

# should return:
# {"message":"API is healthy.","code":200,"data":{"canBackup":true}}
```

## Service Management

```bash
# check status
systemctl status pocketbase

# restart
systemctl restart pocketbase

# view logs
journalctl -u pocketbase -f

# stop/start
systemctl stop pocketbase
systemctl start pocketbase
```

## Next Steps

1. ✅ VPS backend is ready
2. 🔄 Frontend needs component migration (19 files)
3. 📋 Follow MIGRATION-GUIDE.md to update components
4. 🧪 Test auth flow once components are updated

## Notes

- PocketBase runs on localhost:8090 (not exposed)
- Nginx proxies external traffic from port 443
- All data stored in `/opt/pocketbase/pb_data/`
- Backups can be done via admin UI or API
- Collections have no access rules yet (add them as needed)

---

**Backend is ready. Now focus on frontend component migration.**
