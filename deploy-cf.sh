#!/bin/bash
# deploy to cloudflare pages

echo "Building..."
npm run build

echo "Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=payme-protocol --commit-dirty=true

echo "Done!"
