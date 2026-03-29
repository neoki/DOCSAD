# DocFincas

## Overview
DocFincas is a document management system for community property management ("Gestión documental de comunidades de propietarios"). Built with Next.js 15, Prisma, PostgreSQL, NextAuth, and Tailwind CSS. Connected to Microsoft SharePoint/OneDrive via Graph API (single source of truth — no file copies on server). 171 real communities imported from Gesfincas with OneDrive folder mapping.

## Architecture
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Replit built-in Postgres)
- **Auth**: NextAuth v4 with Credentials provider, bcryptjs for password hashing
- **Styling**: Tailwind CSS with PostCSS, Lato font
- **Layout**: Dark sidebar (#0f172a) with AppShell wrapping authenticated pages
- **Storage**: SharePoint/OneDrive via Microsoft Graph API (Files.ReadWrite.All, Sites.Read.All)

## Project Structure
- `app/` — Next.js App Router pages and API routes
  - `app/dashboard/` — Dashboard with Documental/Operativo tabs, OneDrive stats
  - `app/comunidades/` — Community list (171 from Gesfincas), detail pages with 3 tabs
  - `app/comunidades/[id]/` — Detail page: ChecklistTab, OperativaTab, DocumentosTab (OneDrive browser)
  - `app/subir/` — 3-step document upload flow with simulated AI
  - `app/visor/` — Document viewer with zoom controls
  - `app/onedrive/` — OneDrive file browser with import flow
  - `app/ajustes/` — AI model configuration and OneDrive setup
  - `app/api/comunidades/[id]/sharepoint/` — SharePoint folder management (create, link, normalize, upload)
  - `app/api/onedrive/` — OAuth flow, file listing, downloads
- `components/` — Shared React components (Sidebar, AppShell)
- `lib/microsoft-graph.ts` — Graph API: OAuth, tokens, sites/drives/files, folder creation, upload, 11-subfolder structure
- `lib/` — Utility modules (auth, prisma client, doctypes)
- `prisma/` — Schema, seed data (171 communities), comunidades-gesfincas.json

## Database Models
- **Comunidad**: codigo (unique Gesfincas code), idPersona, nombre, nif, direccion, cp, sharePointSiteId/DriveId/FolderId/FolderName
- **User, Operativa, Checklist, Documento, Alerta, Setting**

## Community Data
- 171 communities imported from Gesfincas (source of truth)
- Each has a `codigo` (6-digit Gesfincas billing code, e.g. "000002")
- `carpeta_onedrive` mapped to `sharePointFolderName` — 78 communities have folders, 93 don't
- Folder naming convention: `[codigo]. [nombre]` (e.g. "008. C.P. DOCTOR FLEMING, 15")

## SharePoint/OneDrive Integration
- **Standard 11-subfolder structure**: 01_Actas through 11_Otros
- **Scopes**: Files.ReadWrite.All, Sites.Read.All, User.Read, offline_access
- **Token storage**: Settings table (onedrive_access_token, onedrive_refresh_token, onedrive_token_expires_at)
- **API endpoints**:
  - GET `/api/comunidades/[id]/sharepoint` — Status, files, subfolders, search
  - POST `/api/comunidades/[id]/sharepoint` — Create folder, link folder, normalize, unlink
  - POST `/api/comunidades/[id]/sharepoint/upload` — Upload file to folder

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `NEXTAUTH_SECRET` — Session signing secret
- `NEXTAUTH_URL` — App base URL for NextAuth
- `MICROSOFT_CLIENT_ID` — Azure AD app client ID (c04cd310-...)
- `MICROSOFT_CLIENT_SECRET` — Azure AD app client secret
- `MICROSOFT_TENANT_ID` — Azure AD tenant ID (85ebd406-...)

## Default Credentials
- Email: `admin@asesoriadiaz.com`
- Password: `Admin1234`

## Development
- `npm run dev` — Start dev server on port 5000
- `npm run build` — Production build
- `npm run db:seed` — Seed database with 171 Gesfincas communities
- `npx prisma db push` — Sync schema to database
- `npx prisma generate` — Regenerate Prisma client
