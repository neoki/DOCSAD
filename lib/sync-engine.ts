import { prisma } from "./prisma";
import {
  listFiles,
  listAllFilesRecursive,
} from "./microsoft-graph";
import { getComunidadesRoot } from "./sharepoint-roots";

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

export async function syncCommunityFolders(): Promise<{
  linked: number;
  alreadyLinked: number;
  noMatch: number;
}> {
  const root = await getComunidadesRoot();
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

async function syncFilesForCommunity(
  comId: string,
  driveId: string,
  folderId: string,
): Promise<{ added: number; updated: number; removed: number }> {
  const spFiles = await listAllFilesRecursive(driveId, folderId, 10000);

  const existingCache = await prisma.fileCache.findMany({
    where: { comunidadId: comId },
    select: { id: true, sharePointItemId: true },
  });
  const seenItemIds = new Set<string>();
  let added = 0;
  let updated = 0;

  for (const file of spFiles) {
    seenItemIds.add(file.id);
    const contentHash = `${file.size}:${file.lastModified || ""}`;
    const subfolder = extractSubfolder(file.path);
    const spModified = file.lastModified ? new Date(file.lastModified) : null;

    const sharedFields = {
      driveId,
      name: file.name,
      path: file.path,
      subfolder,
      sizeBytes: file.size,
      isFolder: file.isFolder,
      mimeType: file.mimeType,
      sharePointModified: spModified,
      sharePointHash: contentHash,
      webUrl: file.webUrl,
      lastSyncedAt: new Date(),
    };

    const result = await prisma.fileCache.upsert({
      where: { sharePointItemId: file.id },
      create: {
        sharePointItemId: file.id,
        comunidad: { connect: { id: comId } },
        ...sharedFields,
      },
      update: {
        comunidadId: comId,
        ...sharedFields,
      },
    });

    const wasNew = existingCache.every((e) => e.sharePointItemId !== file.id);
    if (wasNew) added++;
    else if (result) updated++;
  }

  const toRemove = existingCache.filter((e) => !seenItemIds.has(e.sharePointItemId));
  if (toRemove.length > 0) {
    await prisma.fileCache.deleteMany({
      where: { id: { in: toRemove.map((r) => r.id) } },
    });
  }

  return { added, updated, removed: toRemove.length };
}

export async function fullSync(onProgress?: (msg: string) => void): Promise<SyncResult> {
  // Guard: prevent concurrent runs
  const currentStatus = await getSyncState("sync_status");
  if (currentStatus === "running") {
    const startedAt = await getSyncState("sync_started_at");
    const startedMs = startedAt ? new Date(startedAt).getTime() : 0;
    const ageMinutes = (Date.now() - startedMs) / 60000;
    // Allow override if stuck for more than 30 minutes
    if (ageMinutes < 30) {
      throw new Error("Sync already running");
    }
  }

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
        const stats = await syncFilesForCommunity(com.id, com.sharePointDriveId!, com.sharePointFolderId!);
        result.added += stats.added;
        result.updated += stats.updated;
        result.removed += stats.removed;
        result.totalFiles += stats.added + stats.updated;
      } catch (err) {
        const msg = String(err);
        if (msg === "Sync already running") throw err;
        result.errors++;
        await logOp("sync_community_error", "error", { comunidadId: com.id, error: msg });
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

export async function incrementalSync(onProgress?: (msg: string) => void): Promise<SyncResult> {
  // Guard: prevent concurrent runs
  const currentStatus = await getSyncState("sync_status");
  if (currentStatus === "running") {
    const startedAt = await getSyncState("sync_started_at");
    const startedMs = startedAt ? new Date(startedAt).getTime() : 0;
    const ageMinutes = (Date.now() - startedMs) / 60000;
    if (ageMinutes < 30) {
      throw new Error("Sync already running");
    }
  }

  const lastSync = await getSyncState("sync_completed_at");
  if (!lastSync) {
    return fullSync(onProgress);
  }

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
    onProgress?.(`Sync incremental: ${comunidades.length} comunidades...`);

    for (const com of comunidades) {
      try {
        const stats = await syncFilesForCommunity(com.id, com.sharePointDriveId!, com.sharePointFolderId!);
        result.added += stats.added;
        result.updated += stats.updated;
        result.removed += stats.removed;
        result.totalFiles += stats.added + stats.updated;
      } catch (err) {
        const msg = String(err);
        if (msg === "Sync already running") throw err;
        result.errors++;
        await logOp("incremental_sync_error", "error", { comunidadId: com.id, error: msg });
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    await setSyncState("sync_status", "completed");
    await setSyncState("sync_completed_at", new Date().toISOString());
    await setSyncState("sync_duration_seconds", String(elapsed));
    await setSyncState("sync_total_files", String(result.totalFiles));

    await logOp("incremental_sync", "success", {
      details: `Added ${result.added}, updated ${result.updated}, removed ${result.removed}. ${elapsed}s`,
    });

    return result;
  } catch (err) {
    await setSyncState("sync_status", "error");
    await logOp("incremental_sync", "error", { error: String(err) });
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

export const STANDARD_SUBFOLDERS = [
  "01_Actas",
  "02_Certificados",
  "03_Contratos",
  "04_Facturas",
  "05_Seguros",
  "06_Escrituras",
  "07_Informes",
  "08_Correspondencia",
  "09_Licencias",
  "10_Presupuestos",
  "11_Otros",
];

export async function getCommunityDocInsights(comunidadId: string) {
  const files = await prisma.fileCache.findMany({
    where: { comunidadId, isFolder: false },
    select: {
      name: true,
      subfolder: true,
      sizeBytes: true,
      mimeType: true,
      sharePointModified: true,
      path: true,
    },
    orderBy: { sharePointModified: "desc" },
  });

  const subfolderCounts: Record<string, { count: number; sizeBytes: number }> = {};
  for (const f of files) {
    const key = f.subfolder || "(raíz)";
    if (!subfolderCounts[key]) subfolderCounts[key] = { count: 0, sizeBytes: 0 };
    subfolderCounts[key].count++;
    subfolderCounts[key].sizeBytes += f.sizeBytes;
  }

  const missingSubfolders = STANDARD_SUBFOLDERS.filter((sf) => !subfolderCounts[sf]);

  const mimeGroups: Record<string, number> = {};
  for (const f of files) {
    const ext = f.name.split(".").pop()?.toLowerCase() || "otro";
    mimeGroups[ext] = (mimeGroups[ext] || 0) + 1;
  }

  const recentFiles = files.slice(0, 15);

  const totalSize = files.reduce((s, f) => s + f.sizeBytes, 0);

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oldFiles = files.filter(
    (f) => f.sharePointModified && f.sharePointModified < oneYearAgo,
  ).length;

  return {
    totalFiles: files.length,
    totalSize,
    subfolderCounts,
    missingSubfolders,
    mimeGroups,
    recentFiles: recentFiles.map((f) => ({
      name: f.name,
      subfolder: f.subfolder,
      sizeBytes: f.sizeBytes,
      modified: f.sharePointModified?.toISOString() || null,
    })),
    oldFilesCount: oldFiles,
  };
}

export async function getGlobalDocInsights() {
  const [comunidades, allFolders, fileCounts, recentActivity, staleCommsRaw] = await Promise.all([
    prisma.comunidad.findMany({
      where: { sharePointFolderId: { not: null } },
      select: { id: true, codigo: true, nombre: true },
    }),
    prisma.fileCache.findMany({
      where: { comunidadId: { not: null }, subfolder: { not: null } },
      distinct: ["comunidadId", "subfolder"],
      select: { comunidadId: true, subfolder: true },
    }),
    prisma.fileCache.groupBy({
      by: ["comunidadId"],
      where: { isFolder: false, comunidadId: { not: null } },
      _count: true,
    }),
    prisma.fileCache.findMany({
      where: { isFolder: false, sharePointModified: { not: null } },
      orderBy: { sharePointModified: "desc" },
      take: 20,
      select: {
        name: true,
        subfolder: true,
        sizeBytes: true,
        sharePointModified: true,
        comunidad: { select: { codigo: true, nombre: true } },
      },
    }),
    prisma.fileCache.groupBy({
      by: ["comunidadId"],
      where: { isFolder: false, comunidadId: { not: null } },
      _max: { sharePointModified: true },
    }),
  ]);

  const foldersByCom = new Map<string, Set<string>>();
  for (const f of allFolders) {
    if (!f.comunidadId || !f.subfolder) continue;
    if (!foldersByCom.has(f.comunidadId)) foldersByCom.set(f.comunidadId, new Set());
    foldersByCom.get(f.comunidadId)!.add(f.subfolder);
  }

  const fileCountMap = new Map(fileCounts.map((c) => [c.comunidadId, c._count]));

  const subfolderCoverage: { comunidadId: string; codigo: string; nombre: string; missing: string[]; fileCount: number }[] = [];
  for (const com of comunidades) {
    const existingSubs = foldersByCom.get(com.id) || new Set();
    const missing = STANDARD_SUBFOLDERS.filter((sf) => !existingSubs.has(sf));
    const fileCount = fileCountMap.get(com.id) || 0;
    if (missing.length > 0 || fileCount === 0) {
      subfolderCoverage.push({ comunidadId: com.id, codigo: com.codigo, nombre: com.nombre, missing, fileCount });
    }
  }
  subfolderCoverage.sort((a, b) => b.missing.length - a.missing.length);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const staleCommunities = staleCommsRaw.filter(
    (c) => c._max.sharePointModified && c._max.sharePointModified < threeMonthsAgo,
  );

  return {
    subfolderCoverage: subfolderCoverage.slice(0, 20),
    recentActivity: recentActivity.map((f) => ({
      name: f.name,
      subfolder: f.subfolder,
      sizeBytes: f.sizeBytes,
      modified: f.sharePointModified?.toISOString() || null,
      comunidad: f.comunidad ? `${f.comunidad.codigo} - ${f.comunidad.nombre}` : null,
    })),
    staleCommunityCount: staleCommunities.length,
    totalLinked: comunidades.length,
  };
}
