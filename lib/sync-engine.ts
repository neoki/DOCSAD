import { prisma } from "./prisma";
import {
  listSharePointSites,
  listDrives,
  listFiles,
  listAllFilesRecursive,
} from "./microsoft-graph";

type SyncResult = {
  added: number;
  updated: number;
  removed: number;
  errors: number;
  communities: number;
  totalFiles: number;
};

async function logOp(
  operation: string,
  status: string,
  opts?: {
    comunidadId?: string;
    fileName?: string;
    filePath?: string;
    sourceItemId?: string;
    destItemId?: string;
    details?: string;
    error?: string;
  },
) {
  await prisma.syncLog.create({
    data: {
      operation,
      status,
      comunidadId: opts?.comunidadId,
      fileName: opts?.fileName,
      filePath: opts?.filePath,
      sourceItemId: opts?.sourceItemId,
      destItemId: opts?.destItemId,
      details: opts?.details,
      error: opts?.error,
    },
  });
}

async function setSyncState(key: string, value: string) {
  await prisma.syncState.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getSyncState(key: string): Promise<string | null> {
  const record = await prisma.syncState.findUnique({ where: { key } });
  return record?.value ?? null;
}

export async function findComunidadesFolder(): Promise<{
  siteId: string;
  driveId: string;
  folderId: string;
} | null> {
  const sites = await listSharePointSites();
  for (const site of sites) {
    const drives = await listDrives(site.id);
    for (const drive of drives) {
      const rootItems = await listFiles(drive.id, "root");
      const folder = rootItems.find(
        (item) => item.isFolder && item.name.toLowerCase().includes("comunidades"),
      );
      if (folder) {
        return { siteId: site.id, driveId: drive.id, folderId: folder.id };
      }
    }
  }
  return null;
}

export async function syncCommunityFolders(): Promise<{
  linked: number;
  alreadyLinked: number;
  noMatch: number;
}> {
  const root = await findComunidadesFolder();
  if (!root) throw new Error("Carpeta Comunidades no encontrada en SharePoint");

  const folders = await listFiles(root.driveId, root.folderId);
  const communityFolders = folders.filter((f) => f.isFolder);

  const allComunidades = await prisma.comunidad.findMany({
    select: { id: true, codigo: true, sharePointFolderId: true },
  });

  let linked = 0;
  let alreadyLinked = 0;
  let noMatch = 0;

  for (const folder of communityFolders) {
    const codeMatch = folder.name.match(/^0*(\d+)\.\s*/);
    if (!codeMatch) {
      noMatch++;
      continue;
    }

    const paddedCode = codeMatch[1].padStart(6, "0");
    const comunidad = allComunidades.find((c) => c.codigo === paddedCode);
    if (!comunidad) {
      noMatch++;
      continue;
    }

    if (comunidad.sharePointFolderId === folder.id) {
      alreadyLinked++;
      continue;
    }

    await prisma.comunidad.update({
      where: { id: comunidad.id },
      data: {
        sharePointSiteId: root.siteId,
        sharePointDriveId: root.driveId,
        sharePointFolderId: folder.id,
        sharePointFolderName: folder.name,
        sharePointMatchMethod: "CODIGO",
        sharePointMatchScore: 100,
      },
    });
    linked++;
  }

  await logOp("sync_folders", "success", {
    details: `Linked ${linked}, already ${alreadyLinked}, no match ${noMatch}`,
  });

  return { linked, alreadyLinked, noMatch };
}

export async function fullSync(onProgress?: (msg: string) => void): Promise<SyncResult> {
  const startTime = Date.now();
  await setSyncState("sync_status", "running");
  await setSyncState("sync_started_at", new Date().toISOString());

  const result: SyncResult = {
    added: 0,
    updated: 0,
    removed: 0,
    errors: 0,
    communities: 0,
    totalFiles: 0,
  };

  try {
    onProgress?.("Vinculando carpetas de comunidades...");
    await syncCommunityFolders();

    const comunidades = await prisma.comunidad.findMany({
      where: { sharePointFolderId: { not: null }, sharePointDriveId: { not: null } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        sharePointDriveId: true,
        sharePointFolderId: true,
      },
    });

    result.communities = comunidades.length;
    onProgress?.(`Sincronizando ${comunidades.length} comunidades...`);

    for (const com of comunidades) {
      try {
        const driveId = com.sharePointDriveId!;
        const folderId = com.sharePointFolderId!;

        const spFiles = await listAllFilesRecursive(driveId, folderId, 10000);

        const existingCache = await prisma.fileCache.findMany({
          where: { comunidadId: com.id },
          select: { id: true, sharePointItemId: true, sharePointHash: true, name: true },
        });
        const existingMap = new Map(existingCache.map((e) => [e.sharePointItemId, e]));

        const seenItemIds = new Set<string>();

        for (const file of spFiles) {
          seenItemIds.add(file.id);
          const existing = existingMap.get(file.id);

          const sizeHash = `${file.size}`;
          const subfolder = extractSubfolder(file.path);

          if (existing) {
            if (existing.sharePointHash !== sizeHash || existing.name !== file.name) {
              await prisma.fileCache.update({
                where: { id: existing.id },
                data: {
                  name: file.name,
                  path: file.path,
                  sizeBytes: file.size,
                  isFolder: file.isFolder,
                  subfolder,
                  sharePointHash: sizeHash,
                  lastSyncedAt: new Date(),
                },
              });
              result.updated++;
            }
          } else {
            await prisma.fileCache.create({
              data: {
                comunidadId: com.id,
                sharePointItemId: file.id,
                driveId,
                name: file.name,
                path: file.path,
                subfolder,
                sizeBytes: file.size,
                isFolder: file.isFolder,
                sharePointHash: sizeHash,
                lastSyncedAt: new Date(),
              },
            });
            result.added++;
          }
        }

        const toRemove = existingCache.filter((e) => !seenItemIds.has(e.sharePointItemId));
        if (toRemove.length > 0) {
          await prisma.fileCache.deleteMany({
            where: { id: { in: toRemove.map((r) => r.id) } },
          });
          result.removed += toRemove.length;

          for (const r of toRemove) {
            await logOp("file_removed", "info", {
              comunidadId: com.id,
              fileName: r.name,
              sourceItemId: r.sharePointItemId,
              details: "Archivo eliminado de SharePoint, eliminado de caché",
            });
          }
        }

        result.totalFiles += spFiles.filter((f) => !f.isFolder).length;
      } catch (err) {
        result.errors++;
        await logOp("sync_community_error", "error", {
          comunidadId: com.id,
          error: String(err),
        });
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    await setSyncState("sync_status", "completed");
    await setSyncState("sync_completed_at", new Date().toISOString());
    await setSyncState("sync_duration_seconds", String(elapsed));
    await setSyncState("sync_total_files", String(result.totalFiles));
    await setSyncState("sync_communities", String(result.communities));

    await logOp("full_sync", "success", {
      details: `Added ${result.added}, updated ${result.updated}, removed ${result.removed}, errors ${result.errors}. ${result.communities} communities, ${result.totalFiles} files. ${elapsed}s`,
    });

    return result;
  } catch (err) {
    await setSyncState("sync_status", "error");
    await setSyncState("sync_error", String(err));
    await logOp("full_sync", "error", { error: String(err) });
    throw err;
  }
}

function extractSubfolder(path: string): string | null {
  const parts = path.split("/");
  if (parts.length >= 2) {
    return parts[0];
  }
  return null;
}

export async function getSyncStats() {
  const totalFiles = await prisma.fileCache.count({ where: { isFolder: false } });
  const totalFolders = await prisma.fileCache.count({ where: { isFolder: true } });
  const totalSize = await prisma.fileCache.aggregate({ _sum: { sizeBytes: true }, where: { isFolder: false } });
  const lastSync = await getSyncState("sync_completed_at");
  const syncStatus = await getSyncState("sync_status");

  const distinctComms = await prisma.fileCache.findMany({
    where: { comunidadId: { not: null } },
    distinct: ["comunidadId"],
    select: { comunidadId: true },
  });
  const communitiesWithFiles = distinctComms.length;

  const totalComunidades = await prisma.comunidad.count();
  const linkedComunidades = await prisma.comunidad.count({
    where: { sharePointFolderId: { not: null } },
  });

  const subfolderStats = await prisma.fileCache.groupBy({
    by: ["subfolder"],
    where: { isFolder: false, subfolder: { not: null } },
    _count: true,
    _sum: { sizeBytes: true },
  });

  return {
    totalFiles,
    totalFolders,
    totalSizeBytes: totalSize._sum.sizeBytes || 0,
    totalComunidades,
    linkedComunidades,
    communitiesWithFiles,
    lastSync,
    syncStatus,
    subfolderStats: subfolderStats.map((s) => ({
      subfolder: s.subfolder,
      fileCount: s._count,
      sizeBytes: s._sum.sizeBytes || 0,
    })),
  };
}

export async function getRecentSyncLogs(limit = 50) {
  return prisma.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
