# 🚀 Cloudflare Tunnel Setup Instructions

## Quick Setup (5 minutes)

1. **SSH into your VPS:**
   ```bash
   ssh root@62.171.154.123
   ```

2. **Run the setup script:**
   ```bash
   wget https://raw.githubusercontent.com/your-repo/Alpha-1/main/vps-setup/tunnel-setup.sh
   chmod +x tunnel-setup.sh
   ./tunnel-setup.sh
   ```

3. **Or run commands manually:**
   ```bash
   # Install cloudflared
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   
   # Login to Cloudflare
   cloudflared tunnel login
   
   # Create tunnel
   cloudflared tunnel create payme-tunnel
   
   # Route domain (choose your preferred name)
   cloudflared tunnel route dns payme-tunnel payme-app.trycloudflare.com
   
   # Run tunnel
   cloudflared tunnel run payme-tunnel
   ```

## After Setup Complete:

1. **Note the domain name** you chose (e.g., `payme-app.trycloudflare.com`)

2. **Update frontend configuration:**
   Edit `src/lib/appwrite.ts` and replace the placeholder with your domain:
   ```javascript
   const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://YOUR-DOMAIN.trycloudflare.com/v1';
   ```

3. **Rebuild and deploy:**
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=payme-protocol
   ```

## Your New Secure Endpoint:
✅ Free SSL certificate included  
✅ No mixed content errors  
✅ Professional domain name  
✅ Automatic renewal  

The tunnel will give you a URL like: `https://payme-app.trycloudflare.com/v1`