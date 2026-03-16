#!/bin/sh
set -e

echo "==> Generating Prisma Client..."
npx prisma generate

echo "==> Resolving any failed migrations..."
npx prisma migrate resolve --applied 20240101000000_init 2>/dev/null || echo "Migration already applied, continuing..."

echo "==> Running migrations..."
npx prisma migrate deploy

echo "==> Building Next.js..."
next build
