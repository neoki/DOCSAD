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
  - `app/dashboard/` — Dashboard with sync stats, alerts panel, trends chart, document insights, subfolder coverage, stale detection, recent activity, executive report download
  - `app/comunidades/` — Community list with advanced filters (SP link status, completitud %, favorites), sortable columns
  - `app/comunidades/[id]/` — Detail page with 6 tabs: Resumen documental, Documentos, Notas, Historial, Checklist, Info. Operativa
  - `app/comunidades/[id]/ResumenDocTab.tsx` — Document analysis with CSV export
  - `app/comunidades/[id]/DocumentosTab.tsx` — SharePoint file browser with breadcrumbs, upload, document preview, create subfolders, color-coded expiry badges per file, expiry modal (set/edit/delete via /api/vencimientos)
  - `app/comunidades/[id]/NotasTab.tsx` — Notes/observations per community (CRUD)
  - `app/comunidades/[id]/HistorialTab.tsx` — Activity timeline from SyncLog
  - `app/comunidades/[id]/ChecklistTab.tsx` — Document checklist with auto-complete from documents button
  - `app/busqueda/` — Global document search across all communities
  - `app/pendientes/` — Missing documentation overview with CSV export
  - `app/comparar/` — Side-by-side community comparison (2-5 communities)
  - `app/usuarios/` — User management (admin only)
  - `app/auditoria/` — Audit log viewer (admin only)
  - `app/escaner/` — Scanner migration tool with "Bandeja de Entrada Inteligente" auto-routing inbox panel
  - `app/ajustes/` — Settings: OneDrive credentials, sync trigger
  - `app/api/sync/` — Sync API: POST triggers full/incremental sync, GET returns stats/logs/status
  - `app/api/alertas/` — Alerts from Operativa dates + document expiry dates with urgency levels
  - `app/api/vencimientos/` — Document expiry CRUD (GET list, POST upsert, DELETE)
  - `app/api/routing/` — Auto-routing API: process (detect new Escáner files), confirm (move to SP community subfolder), reject
  - `app/api/busqueda/` — Global file search API
  - `app/api/pendientes/` — Missing documentation API
  - `app/api/exportar/` — CSV export
  - `app/api/upload/` — Direct upload to SharePoint subfolder
  - `app/api/usuarios/` — User CRUD (admin only) with audit logging
  - `app/api/favoritos/` — Favorites toggle per user per community
  - `app/api/duplicados/` — Duplicate file detection across communities
  - `app/api/tendencias/` — Activity trends (monthly file adds/updates/uploads)
  - `app/api/preview/` — Document preview via Graph API download URL
  - `app/api/comparar/` — Community comparison data API
  - `app/api/informe/` — Executive report (text format) download
  - `app/api/auditoria/` — Audit log viewer API (admin only)
  - `app/api/comunidades/[id]/` — CRUD
  - `app/api/comunidades/[id]/docs-insights/` — Document analysis API
  - `app/api/comunidades/[id]/notas/` — Notes CRUD API
  - `app/api/comunidades/[id]/historial/` — Activity logs per community
  - `app/api/comunidades/[id]/checklist/auto/` — Auto-complete checklist from documents
  - `app/api/comunidades/[id]/sharepoint/` — SharePoint folder management (create, link, normalize subfolders, upload)
  - `app/api/escaner/` — Scanner API
- `components/` — Shared React components (Sidebar with dark mode toggle + alert badge, AppShell)
- `lib/sync-engine.ts` — Sync engine + document insights
- `lib/microsoft-graph.ts` — Graph API: OAuth, tokens, file operations
- `lib/scanner-classifier.ts` — File classification engine
- `lib/audit.ts` — Audit logging utility
- `lib/` — Utility modules (auth, prisma client, doctypes)
- `prisma/` — Schema, seed data (171 communities)

## Database Models
- **Comunidad**: codigo (unique Gesfincas code), nombre, nif, direccion, cp, pisos, sharePoint* fields
- **FileCache**: SharePoint file metadata cache
- **SyncLog**: Audit trail of all sync/upload operations
- **SyncState**: Key-value store for sync state
- **Nota**: Notes per community (texto, autor, timestamps)
- **User**: Email/password auth with Role (ADMIN/USER)
- **Operativa**: Community operational data including date fields for ITE, reforms
- **Favorite**: User-community favorites (userId+comunidadId unique)
- **AuditLog**: User action audit trail (userId, userEmail, action, entity, entityId, details)
- **DocumentExpiry**: Expiry tags on SharePoint files (sharePointItemId, label, expiresAt, notificado)
- **RoutingCandidate**: Auto-routing inbox — files detected in Escáner folder pending community classification (sharePointItemId, communityCode, comunidadId, subfolder, confidence, status: pending/confirmed/rejected)
- **Checklist, Documento, Alerta, Setting**

## Features (25 total)

### Phase 1 (Original)
1. **Alerts & deadlines**: Dashboard panel with upcoming ITE dates, reform deadlines
2. **Global document search**: Search files across all communities
3. **Incremental sync**: Faster re-sync mode
4. **Missing documentation view**: Communities with incomplete subfolders
5. **Direct upload to SharePoint**: Upload via Graph API
6. **Activity timeline**: Per-community history tab
7. **Notes & observations**: CRUD notes per community
8. **CSV export**: Documentation status export
9. **User management**: Admin CRUD with roles
10. **Dark mode**: Toggle in sidebar
11. **In-app notifications**: Alert badge in sidebar

### Phase 2 (New)
12. **Auto-sync on dashboard**: Incremental sync triggers if >2h since last sync
13. **Auto-create subfolders**: Button to normalize/create standard 11 subfolders in SP
14. **Duplicate file detection**: API to find files with same name across subfolders/communities
15. **Auto-checklist from documents**: Mark checklist items COMPLETADO when matching subfolder has files
16. **Dashboard trends chart**: Stacked bar chart showing monthly file adds/updates/uploads (6 months)
17. **Executive report**: Downloadable text report with per-community documentation status
18. **Community comparison**: Side-by-side comparison of 2-5 communities (files, coverage, types)
19. **Document preview**: Preview PDFs/images inline via Graph API download URLs
20. **Favorites / pinned communities**: Star toggle per community, filterable list
21. **Advanced filters**: Community list filterable by SP status, completitud %, favorites
22. **User audit log**: Records who creates/deletes users, viewable in /auditoria

### Phase 3 (New)
23. **Weekly expiry email alerts**: Resend-powered HTML email with 5-column table (Comunidad/Documento/Etiqueta/Vence/Días), Monday+7d interval gate, ADMIN settings in Ajustes
24. **Document expiry tags**: Set expiry dates on any SharePoint file, visible in DocumentosTab with color-coded badges
25. **Auto-Routing / Bandeja de Entrada Inteligente**: Files dropped in Escáner SharePoint folder auto-detected (by community code in filename), staged as RoutingCandidates in DB, shown in a collapsible inbox panel in the Escáner page and as a notification banner in each community page. One-click confirmation moves the file to the correct community subfolder in SharePoint.

## Community Data
- 171 communities imported from Gesfincas (source of truth)
- Each has a `codigo` (6-digit Gesfincas billing code)
- SharePoint folder naming: `[codigo]. [nombre]`

## SharePoint/OneDrive Integration
- **Standard 11-subfolder structure**: 01_Actas through 11_Otros
- **Top-level folders**: "Comunidades" and "Escaner"
- **Scopes**: Files.ReadWrite.All, Sites.Read.All, User.Read, offline_access
- **Token storage**: Settings table

## Sync System
- **Full sync**: Scans all community folders, upserts FileCache, removes stale entries
- **Incremental sync**: Skips folder linking step; falls back to full if never synced
- **Auto-sync**: Dashboard triggers incremental sync if >2h since last
- **Change detection**: Composite hash (size + lastModifiedDateTime)

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
