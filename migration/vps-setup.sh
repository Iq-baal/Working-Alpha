#!/bin/bash
# PayMe Protocol - VPS Setup Script for Appwrite
# Run this on your VPS (62.171.154.123)

set -e

echo "=== PayMe Protocol VPS Setup ==="
echo "Setting up Appwrite on Ubuntu 24.04..."

# Update system
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt install -y docker.io docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to logout and login again for group changes."
fi

# Install Appwrite
echo "[3/8] Installing Appwrite..."
mkdir -p ~/appwrite
cd ~/appwrite

# Download Appwrite installer
curl -fsSL https://appwrite.io/install.sh | bash

# Generate secure keys
echo "[4/8] Generating secure keys..."
OPENSSL_KEY=$(openssl rand -hex 32)
EXECUTOR_SECRET=$(openssl rand -hex 32)

# Create .env file
echo "[5/8] Creating Appwrite configuration..."
cat > .env << EOF
_APP_ENV=production
_APP_WORKER_PER_CORE=6
_APP_OPTIONS_ABUSE=disabled
_APP_OPTIONS_FORCE_HTTPS=disabled
_APP_OPENSSL_KEY_V1=${OPENSSL_KEY}
_APP_EXECUTOR_SECRET=${EXECUTOR_SECRET}
_APP_DOMAIN=62.171.154.123
_APP_DOMAIN_TARGET=62.171.154.123
_APP_CONSOLE_WHITELIST_ROOT=enabled
_APP_CONSOLE_WHITELIST_EMAILS=
_APP_SYSTEM_SECURITY_EMAIL_ADDRESS=
_APP_EMAIL_SMTP_HOST=
_APP_EMAIL_SMTP_PORT=
_APP_EMAIL_SMTP_SECURE=
_APP_EMAIL_SMTP_USERNAME=
_APP_EMAIL_SMTP_PASSWORD=
_APP_STORAGE_LIMIT=30000000
_APP_STORAGE_PREVIEW_LIMIT=20000000
_APP_STORAGE_ANTIVIRUS=disabled
_APP_STORAGE_DEVICE=local
_APP_REDIS_HOST=redis
_APP_REDIS_PORT=6379
_APP_DB_HOST=mariadb
_APP_DB_PORT=3306
_APP_DB_SCHEMA=appwrite
_APP_DB_USER=root
_APP_DB_PASS=password
_APP_DB_ROOT_PASS=rootsecretpassword
_APP_INFLUXDB_HOST=influxdb
_APP_INFLUXDB_PORT=8086
_APP_STATSD_HOST=telegraf
_APP_STATSD_PORT=8125
_APP_MAINTENANCE_INTERVAL=86400
_APP_USAGE_AGGREGATION_INTERVAL=30
_APP_USAGE_TIMESERIES_INTERVAL=30
_APP_USAGE_DATABASE_INTERVAL=900
_APP_LOGGING_PROVIDER=
_APP_LOGGING_CONFIG=
_APP_USAGE_STATS=enabled
_APP_SMS_PROVIDER=
_APP_SMS_FROM=
_APP_STORAGE_S3_ACCESS_KEY=
_APP_STORAGE_S3_SECRET=
_APP_STORAGE_S3_REGION=
_APP_STORAGE_S3_BUCKET=
_APP_STORAGE_S3_ENDPOINT=
_APP_STORAGE_S3_PATH_STYLE=
_APP_FUNCTIONS_SIZE_LIMIT=30000000
_APP_FUNCTIONS_TIMEOUT=900
_APP_FUNCTIONS_BUILD_TIMEOUT=900
_APP_FUNCTIONS_CPUS=1
_APP_FUNCTIONS_MEMORY=512
_APP_FUNCTIONS_MEMORY_SWAP=512
_APP_FUNCTIONS_RUNTIMES=node-18.0
_APP_EXECUTOR_RUNTIME_NETWORK=appwrite_runtimes
_APP_EXECUTOR_SECRET=${EXECUTOR_SECRET}
_APP_EXECUTOR_HOST=http://appwrite-executor/v1
_APP_LOGGING_CONFIG=
_APP_MAINTENANCE_RETENTION_AUDIT=1209600
_APP_MAINTENANCE_RETENTION_ABUSE=86400
_APP_MAINTENANCE_RETENTION_EXECUTION=1209600
_APP_MAINTENANCE_RETENTION_USAGE_HOURLY=8640000
_APP_MAINTENANCE_RETENTION_SCHEDULES=86400
EOF

echo "[6/8] Starting Appwrite..."
sudo docker compose up -d

echo "[7/8] Waiting for Appwrite to initialize (30 seconds)..."
sleep 30

echo "[8/8] Setup complete!"
echo ""
echo "=== Appwrite is now running ==="
echo "Console URL: http://62.171.154.123"
echo ""
echo "Next steps:"
echo "1. Open http://62.171.154.123 in your browser"
echo "2. Create an account (first user becomes admin)"
echo "3. Create a new project called 'payme-protocol'"
echo "4. Note down the Project ID"
echo "5. Go to Overview -> API -> copy the API endpoint and API key"
echo "6. Return here to continue with collection setup"
echo ""
echo "Your generated keys (save these):"
echo "OpenSSL Key: ${OPENSSL_KEY}"
echo "Executor Secret: ${EXECUTOR_SECRET}"
