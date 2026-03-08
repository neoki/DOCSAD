# DocFincas

## Overview
DocFincas is a document management system for community property management ("Gestión documental de comunidades de propietarios"). Built with Next.js 14, Prisma, PostgreSQL, NextAuth, and Tailwind CSS. Features a dark sidebar navigation, two-tab dashboard (Documental/Operativo), community detail with checklist/operativa/documents tabs, a 3-step document upload flow with simulated AI classification, a document viewer, OneDrive integration (demo mode), and an AI API configuration panel.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Replit built-in Postgres)
- **Auth**: NextAuth v4 with Credentials provider, bcryptjs for password hashing
- **Styling**: Tailwind CSS with PostCSS, Lato font
- **Layout**: Dark sidebar (#0f172a) with AppShell wrapping authenticated pages

## Project Structure
- `app/` — Next.js App Router pages and API routes
  - `app/dashboard/` — Dashboard with Documental/Operativo tabs (server + client components)
  - `app/comunidades/` — Community list, detail pages, and new community form
  - `app/subir/` — 3-step document upload flow with simulated AI
  - `app/visor/` — Document viewer with zoom controls
  - `app/onedrive/` — OneDrive file browser with demo mode and import flow
  - `app/ajustes/` — AI model configuration and OneDrive setup instructions
  - `app/login/` — Authentication page
  - `app/api/` — REST API routes for comunidades, checklist, operativa, documentos, auth, ajustes, onedrive
- `components/` — Shared React components (Sidebar, AppShell)
- `lib/` — Utility modules (auth, prisma client, doctypes with 27 types in 6 categories)
- `prisma/` — Prisma schema and seed data

## Document Types
27 document types across 6 categories:
- Documentación Jurídica (#4F7CFF) — 5 types
- Órganos de Gobierno (#22C55E) — 5 types
- Contabilidad (#F59E0B) — 4 types
- Seguros (#EC4899) — 4 types
- Contratos y Proveedores (#8B5CF6) — 5 types
- Prevención de Riesgos (#EF4444) — 4 types

## Database Models
- User, Comunidad, Operativa, Checklist, Documento, Alerta, Setting (key-value for AI config)

## Features
- **OneDrive Integration**: Browse OneDrive folders and import files to communities. Currently in demo mode with simulated files. To activate real connection, configure Azure AD credentials (see Ajustes page for setup instructions).
- **AI Configuration**: Configure API keys for 5 AI providers (OpenAI GPT, Anthropic Claude, Google Gemini, Microsoft Copilot, Moonshot Kimi K2). Select active model for document classification. Test connection functionality.

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `NEXTAUTH_SECRET` — Session signing secret (Replit Secret)
- `NEXTAUTH_URL` — App base URL for NextAuth (Replit Secret)
- `NEXT_PUBLIC_APP_NAME` — Display name "DocFincas" (Replit Secret)
- `MICROSOFT_CLIENT_ID` — Azure AD app client ID (optional, for OneDrive)
- `MICROSOFT_CLIENT_SECRET` — Azure AD app client secret (optional, for OneDrive)
- `MICROSOFT_TENANT_ID` — Azure AD tenant ID (optional, for OneDrive)
- `ONEDRIVE_FOLDER_PATH` — OneDrive folder to sync (optional, e.g. /DocFincas)

## Default Credentials
- Email: `admin@asesoriadiaz.com`
- Password: `Admin1234`

## Development
- `npm run dev` — Start dev server on port 5000
- `npm run build` — Production build
- `npm run db:seed` — Seed database with demo data (5 communities)
- `npx prisma db push` — Sync schema to database
- `npx prisma generate` — Regenerate Prisma client
