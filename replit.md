# DocFincas

## Overview
DocFincas is a document management system for community property management ("Gestión documental de comunidades de propietarios"). Built with Next.js 14, Prisma, PostgreSQL, NextAuth, and Tailwind CSS. Features a dark sidebar navigation, two-tab dashboard (Documental/Operativo), community detail with checklist/operativa/documents tabs, a 3-step document upload flow with simulated AI classification, and a document viewer.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Replit built-in Postgres)
- **Auth**: NextAuth v4 with Credentials provider, bcryptjs for password hashing
- **Styling**: Tailwind CSS with PostCSS, Lato font
- **Layout**: Dark sidebar (#0f172a) with AppShell wrapping authenticated pages

## Project Structure
- `app/` — Next.js App Router pages and API routes
  - `app/dashboard/` — Dashboard with Documental/Operativo tabs (server + client components)
  - `app/comunidades/` — Community list and detail pages
  - `app/subir/` — 3-step document upload flow with simulated AI
  - `app/visor/` — Document viewer with zoom controls
  - `app/login/` — Authentication page
  - `app/api/` — REST API routes for comunidades, checklist, operativa, documentos, auth
- `components/` — Shared React components (Sidebar, AppShell)
- `lib/` — Utility modules (auth, prisma client, doctypes with 24 types in 6 categories)
- `prisma/` — Prisma schema and migrations

## Document Types
24 document types across 6 categories:
- Documentación Jurídica (#4F7CFF) — 5 types
- Órganos de Gobierno (#22C55E) — 5 types
- Contabilidad (#F59E0B) — 4 types
- Seguros (#EC4899) — 4 types
- Contratos y Proveedores (#8B5CF6) — 5 types
- Prevención de Riesgos (#EF4444) — 4 types (Note: spec says 24 total, we have 27)

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `NEXTAUTH_SECRET` — Session signing secret (Replit Secret)
- `NEXTAUTH_URL` — App base URL for NextAuth (Replit Secret)
- `NEXT_PUBLIC_APP_NAME` — Display name "DocFincas" (Replit Secret)

## Default Credentials
- Email: `admin@asesoriadiaz.com`
- Password: `Admin1234`

## Development
- `npm run dev` — Start dev server on port 5000
- `npm run build` — Production build
- `npm run db:seed` — Seed database with demo data (5 communities)
- `npx prisma migrate deploy` — Apply database migrations
- `npx prisma generate` — Regenerate Prisma client
