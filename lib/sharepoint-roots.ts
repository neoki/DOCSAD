/**
 * sharepoint-roots.ts
 *
 * Gestiona las referencias a las dos únicas carpetas que la aplicación
 * tiene permitido leer/escribir: "Comunidades" y "Escaner".
 *
 * La primera vez que se llama se buscan en SharePoint y se guardan en la BD.
 * A partir de ahí se usan siempre las referencias guardadas — sin explorar
 * ninguna otra parte del tenant.
 */

import { prisma } from "./prisma";
import { listSharePointSites, listDrives, listFiles } from "./microsoft-graph";

export interface FolderRoot {
  siteId: string;
  driveId: string;
  folderId: string;
  folderName: string;
}

const KEYS = {
  comunidades: {
    siteId: "sp_comunidades_site_id",
    driveId: "sp_comunidades_drive_id",
    folderId: "sp_comunidades_folder_id",
    folderName: "sp_comunidades_folder_name",
  },
  escaner: {
    siteId: "sp_escaner_site_id",
    driveId: "sp_escaner_drive_id",
    folderId: "sp_escaner_folder_id",
    folderName: "sp_escaner_folder_name",
  },
} as const;

async function loadFromDb(keys: (typeof KEYS)[keyof typeof KEYS]): Promise<FolderRoot | null> {
  const records = await prisma.setting.findMany({
    where: { key: { in: Object.values(keys) } },
  });
  const map: Record<string, string> = {};
  for (const r of records) map[r.key] = r.value;

  const siteId = map[keys.siteId];
  const driveId = map[keys.driveId];
  const folderId = map[keys.folderId];
  const folderName = map[keys.folderName] || "";

  if (siteId && driveId && folderId) return { siteId, driveId, folderId, folderName };
  return null;
}

async function saveToDb(
  keys: (typeof KEYS)[keyof typeof KEYS],
  root: FolderRoot,
): Promise<void> {
  const entries: [string, string][] = [
    [keys.siteId, root.siteId],
    [keys.driveId, root.driveId],
    [keys.folderId, root.folderId],
    [keys.folderName, root.folderName],
  ];
  for (const [key, value] of entries) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

/**
 * Explora SharePoint para encontrar una carpeta cuyo nombre contenga el término buscado.
 * Solo se llama UNA VEZ por carpeta (cuando no está guardada en la BD).
 */
async function discoverFolder(nameContains: string): Promise<FolderRoot | null> {
  const sites = await listSharePointSites();
  for (const site of sites) {
    const drives = await listDrives(site.id);
    for (const drive of drives) {
      const rootItems = await listFiles(drive.id, "root");
      const folder = rootItems.find(
        (item) => item.isFolder && item.name.toLowerCase().includes(nameContains.toLowerCase()),
      );
      if (folder) {
        return {
          siteId: site.id,
          driveId: drive.id,
          folderId: folder.id,
          folderName: folder.name,
        };
      }
    }
  }
  return null;
}

/**
 * Devuelve la raíz de la carpeta "Comunidades".
 * La primera llamada descubre y guarda la referencia. Las siguientes la leen de la BD.
 */
export async function getComunidadesRoot(): Promise<FolderRoot | null> {
  const cached = await loadFromDb(KEYS.comunidades);
  if (cached) return cached;

  const found = await discoverFolder("comunidades");
  if (found) {
    await saveToDb(KEYS.comunidades, found);
  }
  return found;
}

/**
 * Devuelve la raíz de la carpeta "Escaner".
 * La primera llamada descubre y guarda la referencia. Las siguientes la leen de la BD.
 */
export async function getEscanerRoot(): Promise<FolderRoot | null> {
  const cached = await loadFromDb(KEYS.escaner);
  if (cached) return cached;

  const found = await discoverFolder("escaner");
  if (found) {
    await saveToDb(KEYS.escaner, found);
  }
  return found;
}

/**
 * Fuerza la redescubrimiento de las dos carpetas (útil si cambia la estructura en SharePoint).
 * Borra las referencias guardadas y las redescubre.
 */
export async function rediscoverRoots(): Promise<{
  comunidades: FolderRoot | null;
  escaner: FolderRoot | null;
}> {
  const allKeys = [
    ...Object.values(KEYS.comunidades),
    ...Object.values(KEYS.escaner),
  ];
  await prisma.setting.deleteMany({ where: { key: { in: allKeys } } });

  const [comunidades, escaner] = await Promise.all([
    getComunidadesRoot(),
    getEscanerRoot(),
  ]);

  return { comunidades, escaner };
}

/**
 * Estado actual de las raíces guardadas (sin hacer descubrimiento).
 */
export async function getRootsStatus(): Promise<{
  comunidades: FolderRoot | null;
  escaner: FolderRoot | null;
}> {
  const [comunidades, escaner] = await Promise.all([
    loadFromDb(KEYS.comunidades),
    loadFromDb(KEYS.escaner),
  ]);
  return { comunidades, escaner };
}
