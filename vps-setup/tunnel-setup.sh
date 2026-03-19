#!/bin/bash
# Cloudflare Tunnel Setup Script for PayMe

echo "🚀 Setting up Cloudflare Tunnel..."

# Install cloudflared
echo "Installing cloudflared..."
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login (opens browser)
echo "Please log in to Cloudflare when prompted..."
cloudflared tunnel login

# Create tunnel
echo "Creating tunnel..."
cloudflared tunnel create payme-tunnel

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep payme-tunnel | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Create config file
echo "Creating configuration..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: payme-app.trycloudflare.com
    service: http://localhost:80
  - service: http_status:404
EOF

# Route the domain
echo "Routing domain..."
cloudflared tunnel route dns payme-tunnel payme-app.trycloudflare.com

echo "✅ Setup complete!"
echo "Run: cloudflared tunnel run payme-tunnel"
echo "Then update your frontend config with: https://payme-app.trycloudflare.com/v1"