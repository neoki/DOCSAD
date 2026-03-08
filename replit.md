# DocFincas

## Overview
DocFincas is a document management system for community property management ("Gestión documental de comunidades"). Built with Next.js 14, Prisma, PostgreSQL, NextAuth, and Tailwind CSS.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Replit built-in Postgres)
- **Auth**: NextAuth v4 with Prisma adapter, bcryptjs for password hashing
- **Styling**: Tailwind CSS with PostCSS

## Project Structure
- `app/` — Next.js App Router pages and API routes
- `components/` — Shared React components (AuthGuard, Navbar)
- `lib/` — Utility modules (auth, prisma client, alerts, doctypes)
- `prisma/` — Prisma schema and migrations
- `public/` — Static assets

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `NEXTAUTH_SECRET` — Session signing secret
- `NEXTAUTH_URL` — App base URL for NextAuth
- `NEXT_PUBLIC_APP_NAME` — Display name ("DocFincas")

## Development
- `npm run dev` — Start dev server on port 5000
- `npm run build` — Production build
- `npx prisma migrate deploy` — Apply database migrations
- `npx prisma generate` — Regenerate Prisma client
