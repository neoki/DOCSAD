#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Running seed (skips if already seeded)..."
npx prisma db seed || echo "Seed skipped (already exists)"

echo "Starting Next.js..."
node server.js
