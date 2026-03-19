#!/bin/bash
# PayMe Protocol - Quick Deploy Script

set -e

echo "🚀 PayMe Protocol - Deployment Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed"
    echo "   Install it with: npm install -g wrangler"
    exit 1
fi

echo ""
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Build successful"
echo ""
echo "🌐 Deploying to Cloudflare Pages..."
echo ""

# Deploy to production
wrangler pages deploy dist --project-name payme-protocol --branch production

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🔗 Your app is live at:"
    echo "   - https://payme-protocol.pages.dev"
    echo "   - https://main.payme-protocol.pages.dev"
    echo "   - https://payme-protocol.cc (if DNS is configured)"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    exit 1
fi
