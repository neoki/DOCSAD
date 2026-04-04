# DocFincas

## Overview
DocFincas is a document management system for community property management ("Gestión documental de comunidades de propietarios"). Built with Next.js 15, Prisma, PostgreSQL, NextAuth, and Tailwind CSS. Connected to Microsoft SharePoint via Graph API. SharePoint is the primary storage; the local DB caches file metadata for fast browsing, analysis, and audit trail. 171 real communities imported from Gesfincas.

## Architecture
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Replit built-in Postgres)
- **Auth**: NextAuth v4 with Credentials provider, bcryptjs for password hashing
- **Styling**: Tailwind CSS with PostCSS, Lato font, dark mode support (CSS class-based)
- **Layout**: Dark sidebar (#0f172a) with AppShell wrapping authenticated pages
- **Storage**: SharePoint via Microsoft Graph API (Files.ReadWrite.All, Sites.Read.All)
- **Sync**: Bidirectional — SharePoint → App (pull metadata into FileCache), App → SharePoint (uploads/moves go directly to SP)
- **Roles**: ADMIN and USER roles (Role enum). Admin can manage users, USER is read-only.

## Project Structure
- `app/` — Next.js App Router pages and API routes
  - `app/dashboard/` — Dashboard with sync stats, alerts panel, document insights, subfolder coverage, stale detection, recent activity
  - `app/comunidades/` — Community list (171 from Gesfincas), detail pages with edit modal
  - `app/comunidades/[id]/` — Detail page with 6 tabs: Resumen documental, Documentos, Notas, Historial, Checklist, Info. Operativa
  - `app/comunidades/[id]/ResumenDocTab.tsx` — Document analysis: subfolder distribution, file types, missing folders, recent files, old file warnings, CSV export
  - `app/comunidades/[id]/DocumentosTab.tsx` — SharePoint file browser with breadcrumbs, upload, search
  - `app/comunidades/[id]/NotasTab.tsx` — Notes/observations per community (CRUD)
  - `app/comunidades/[id]/HistorialTab.tsx` — Activity timeline from SyncLog
  - `app/busqueda/` — Global document search across all communities with filters (name, subfolder, community, file type)
  - `app/pendientes/` — Missing documentation overview with coverage %, filterable by subfolder, CSV export
  - `app/usuarios/` — User management (admin only): create, delete users, assign roles
  - `app/escaner/` — Scanner migration tool: classify & move ~21K files from Escáner folder to community subfolders
  - `app/ajustes/` — Settings: AI config, OneDrive credentials, sync trigger
  - `app/api/sync/` — Sync API: POST triggers full/incremental sync (body.mode), GET returns stats/logs/status
  - `app/api/alertas/` — Alerts from Operativa dates (ITE, reforms) with urgency levels
  - `app/api/busqueda/` — Global file search API with pagination and filters
  - `app/api/pendientes/` — Missing documentation API per community
  - `app/api/exportar/` — CSV export (tipo=pendientes for global, tipo=comunidad&comunidadId=X for per-community)
  - `app/api/upload/` — Direct upload to SharePoint subfolder with FileCache sync
  - `app/api/usuarios/` — User CRUD (admin only)
  - `app/api/comunidades/[id]/` — CRUD, PUT supports nombre/nif/direccion/cp/pisos
  - `app/api/comunidades/[id]/docs-insights/` — Community-level document analysis API
  - `app/api/comunidades/[id]/notas/` — Notes CRUD API
  - `app/api/comunidades/[id]/historial/` — Activity logs per community
  - `app/api/comunidades/[id]/sharepoint/` — SharePoint folder management (create, link, normalize, upload)
  - `app/api/escaner/` — Scanner API: find folder, scan & classify files, move batches
- `components/` — Shared React components (Sidebar with dark mode toggle + alert badge, AppShell)
- `lib/sync-engine.ts` — Sync engine + document insights (fullSync, incrementalSync, getSyncStats, getCommunityDocInsights, getGlobalDocInsights)
- `lib/microsoft-graph.ts` — Graph API: OAuth, tokens, sites/drives/files, folder creation, upload, move, recursive listing
- `lib/scanner-classifier.ts` — File classification engine: NNN. prefix → community code, keyword → subfolder mapping
- `lib/` — Utility modules (auth, prisma client, doctypes)
- `prisma/` — Schema, seed data (171 communities), comunidades-gesfincas.json

## Database Models
- **Comunidad**: codigo (unique Gesfincas code), nombre, nif, direccion, cp, pisos, sharePoint* fields
- **FileCache**: SharePoint file metadata cache (sharePointItemId, name, path, mimeType, sizeBytes, subfolder, comunidadId, sharePointModified, sharePointHash)
- **SyncLog**: Audit trail of all sync/upload operations
- **SyncState**: Key-value store for sync state
- **Nota**: Notes per community (texto, autor, timestamps)
- **User**: Email/password auth with Role (ADMIN/USER)
- **Operativa**: Community operational data including date fields for ITE, reforms (used for alerts)
- **Checklist, Documento, Alerta, Setting**

## Features
1. **Alerts & deadlines**: Dashboard panel showing upcoming ITE dates, reform deadlines from Operativa. Color-coded urgency (CRITICA/ALTA/MEDIA/BAJA). Notification badge in sidebar.
2. **Global document search**: Search files across all communities by name, subfolder, community, file type. Paginated results.
3. **Incremental sync**: POST /api/sync with body `{"mode":"incremental"}` for faster re-sync. Falls back to full sync if never synced.
4. **Missing documentation view**: Dedicated /pendientes page showing communities with incomplete subfolders. Filterable by specific subfolder. Coverage % bars.
5. **Direct upload to SharePoint**: Upload button in DocumentosTab sends files directly to SharePoint subfolder via Graph API, updates FileCache.
6. **Activity timeline**: Per-community history tab showing SyncLog entries with timeline visualization.
7. **Notes & observations**: CRUD notes per community. Stored in Nota model with author and timestamps.
8. **CSV export**: Export documentation status (global or per-community) as CSV for offline analysis.
9. **User management**: Admin can create/delete users with ADMIN or USER roles. Role-based access.
10. **Dark mode**: Toggle in sidebar, persisted to localStorage. CSS class-based theming.
11. **In-app notifications**: Alert badge in sidebar showing count of critical/high urgency deadlines.

## Community Data
- 171 communities imported from Gesfincas (source of truth)
- Each has a `codigo` (6-digit Gesfincas billing code, e.g. "000002")
- SharePoint folder naming: `[codigo]. [nombre]` (e.g. "008. C.P. DOCTOR FLEMING, 15")
- Code extraction regex: `^0*(\d+)\.\s*`, padded to 6 digits to match `codigo` field

## SharePoint/OneDrive Integration
- **Standard 11-subfolder structure**: 01_Actas through 11_Otros (defined in STANDARD_SUBFOLDERS)
- **Top-level folders**: "Comunidades" (community docs) and "Escaner" (scanned files pending classification)
- **Scopes**: Files.ReadWrite.All, Sites.Read.All, User.Read, offline_access
- **Token storage**: Settings table (onedrive_access_token, onedrive_refresh_token, onedrive_token_expires_at)
- **Paginated listing**: listFiles() follows @odata.nextLink; listAllFilesRecursive() defaults to 200K items, $top=999
- **Metadata captured**: file.mimeType, lastModifiedDateTime, size

## Sync System
- **Full sync**: Scans all community folders in SharePoint, captures mimeType + lastModifiedDateTime, upserts into FileCache, removes stale entries
- **Incremental sync**: Same logic but skips folder linking step; falls back to full if never synced
- **Change detection**: Composite hash (size + lastModifiedDateTime)
- **SyncLog**: Records every file added/updated/removed with timestamps and details
- **API**: POST /api/sync with optional `{"mode":"incremental"}` body

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
- `NEXTAUTH_SECRET` — Session signing secret
- `NEXTAUTH_URL` — App base URL for NextAuth
- `MICROSOFT_CLIENT_ID` — Azure AD app client ID
- `MICROSOFT_CLIENT_SECRET` — Azure AD app client secret
- `MICROSOFT_TENANT_ID` — Azure AD tenant ID

## Default Credentials
- Email: `admin@asesoriadiaz.com`
- Password: `Admin1234`

## Development
- `npm run dev` — Start dev server on port 5000
- `npm run build` — Production build
- `npm run db:seed` — Seed database with 171 Gesfincas communities
- `npx prisma db push` — Sync schema to database (no migration history)
- `npx prisma generate` — Regenerate Prisma client
