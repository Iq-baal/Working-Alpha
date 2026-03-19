#!/bin/bash
set -euo pipefail

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "CLOUDFLARE_API_TOKEN is not set. Export it before running." >&2
  exit 1
fi

wrangler pages deploy dist --project-name payme-protocol --branch production --commit-dirty=true < /dev/null
