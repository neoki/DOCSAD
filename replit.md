# DocFincas

## Overview
DocFincas is a document management system for community property management ("Gestión documental de comunidades de propietarios"). Built with Next.js 15, Prisma, PostgreSQL, NextAuth, and Tailwind CSS. Connected to Microsoft SharePoint via Graph API. SharePoint is the primary storage; the local DB caches file metadata for fast browsing and maintains an audit trail. 171 real communities imported from Gesfincas.

## Architecture
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL via Prisma ORM (Replit built-in Postgres)
- **Auth**: NextAuth v4 with Credentials provider, bcryptjs for password hashing
- **Styling**: Tailwind CSS with PostCSS, Lato font
- **Layout**: Dark sidebar (#0f172a) with AppShell wrapping authenticated pages
- **Storage**: SharePoint via Microsoft Graph API (Files.ReadWrite.All, Sites.Read.All)
- **Sync**: Bidirectional — SharePoint → App (pull metadata into FileCache), App → SharePoint (uploads/moves go directly to SP)

## Project Structure
- `app/` — Next.js App Router pages and API routes
  - `app/dashboard/` — Dashboard with real sync stats, file counts, community coverage, sync history
  - `app/comunidades/` — Community list (171 from Gesfincas), detail pages
  - `app/comunidades/[id]/` — Detail page: ChecklistTab, OperativaTab, DocumentosTab (SharePoint browser)
  - `app/escaner/` — Scanner migration tool: classify & move ~21K files from Escáner folder to community subfolders
  - `app/ajustes/` — Settings: AI config, OneDrive credentials, sync trigger
  - `app/api/sync/` — Sync API: POST triggers full sync, GET returns stats/logs/status
  - `app/api/comunidades/[id]/sharepoint/` — SharePoint folder management (create, link, normalize, upload)
  - `app/api/escaner/` — Scanner API: find folder, scan & classify files, move batches with server-side validation
- `components/` — Shared React components (Sidebar, AppShell)
- `lib/sync-engine.ts` — Bidirectional sync engine (fullSync, syncCommunityFolders, getSyncStats, getRecentSyncLogs)
- `lib/microsoft-graph.ts` — Graph API: OAuth, tokens, sites/drives/files, folder creation, upload, move, recursive listing (paginated)
- `lib/scanner-classifier.ts` — File classification engine: NNN. prefix → community code, keyword → subfolder mapping
- `lib/` — Utility modules (auth, prisma client, doctypes)
- `prisma/` — Schema, seed data (171 communities), comunidades-gesfincas.json

## Database Models
- **Comunidad**: codigo (unique Gesfincas code), idPersona, nombre, nif, direccion, cp, sharePointSiteId/DriveId/FolderId/FolderName/MatchMethod/MatchScore
- **FileCache**: Local cache of SharePoint file metadata (sharePointItemId, name, path, mimeType, sizeBytes, subfolder, comunidadId, sharepointModifiedAt, contentHash)
- **SyncLog**: Audit trail of all sync operations (operation, status, fileName, sharePointItemId, comunidadId, details, error)
- **SyncState**: Key-value store for sync state (sync_status, sync_completed_at, sync_started_at, sync_duration_seconds, sync_error)
- **User, Operativa, Checklist, Documento, Alerta, Setting**

## Community Data
- 171 communities imported from Gesfincas (source of truth)
- Each has a `codigo` (6-digit Gesfincas billing code, e.g. "000002")
- SharePoint folder naming: `[codigo]. [nombre]` (e.g. "008. C.P. DOCTOR FLEMING, 15")
- Code extraction regex: `^0*(\d+)\.\s*`, padded to 6 digits to match `codigo` field
- `sharePointMatchMethod`: NOMBRE, CODIGO, or REVISAR (uncertain match requiring manual review)

## SharePoint/OneDrive Integration
- **Standard 11-subfolder structure**: 01_Actas through 11_Otros (defined in STANDARD_SUBFOLDERS)
- **Top-level folders**: "Comunidades" (community docs) and "Escaner" (scanned files pending classification)
- **Scopes**: Files.ReadWrite.All, Sites.Read.All, User.Read, offline_access
- **Token storage**: Settings table (onedrive_access_token, onedrive_refresh_token, onedrive_token_expires_at)
- **Paginated listing**: listFiles() follows @odata.nextLink; listAllFilesRecursive() defaults to 200K items, $top=999

## Sync System
- **Full sync**: Scans all community folders in SharePoint, upserts file metadata into FileCache, removes stale entries
- **SyncLog**: Records every file added/updated/removed with timestamps and details
- **API**: POST /api/sync triggers sync; GET /api/sync?action=stats|logs|status returns data
- **Dashboard**: Shows real-time sync stats, subcarpeta distribution, top communities by file count, sync history

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
