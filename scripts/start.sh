#!/bin/sh

# Use PORT from environment (Replit autoscale injects this), fallback to 5000
export PORT=${PORT:-5000}

# Detect production URL for NEXTAUTH_URL
# Priority: REPLIT_DEPLOYMENT_URL > REPLIT_DOMAINS > existing NEXTAUTH_URL
if [ -n "$REPLIT_DEPLOYMENT_URL" ]; then
  export NEXTAUTH_URL="$REPLIT_DEPLOYMENT_URL"
  echo "==> NEXTAUTH_URL set from REPLIT_DEPLOYMENT_URL: $NEXTAUTH_URL"
elif [ -n "$REPLIT_DOMAINS" ]; then
  # REPLIT_DOMAINS may contain comma-separated domains; take the first one
  FIRST_DOMAIN=$(echo "$REPLIT_DOMAINS" | cut -d',' -f1)
  export NEXTAUTH_URL="https://$FIRST_DOMAIN"
  echo "==> NEXTAUTH_URL set from REPLIT_DOMAINS: $NEXTAUTH_URL"
fi

echo "==> Starting Next.js on port $PORT..."
exec node_modules/.bin/next start -p $PORT -H 0.0.0.0
