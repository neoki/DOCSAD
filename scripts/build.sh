#!/bin/sh
set -e

echo "==> Generating Prisma Client..."
npx prisma generate

echo "==> Syncing database schema..."
npx prisma db push --accept-data-loss || (echo "==> Schema conflict detected, resetting database..." && npx prisma db push --force-reset)

echo "==> Seeding communities..."
npx tsx prisma/seed.ts

echo "==> Building Next.js..."
next build
