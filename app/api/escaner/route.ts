import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listFiles,
  listAllFilesRecursive,
  listDrives,
  listSharePointSites,
  moveFile,
  getOrCreateSubfolder,
  STANDARD_SUBFOLDERS,
} from "@/lib/microsoft-graph";
import { classifyFile } from "@/lib/scanner-classifier";

let cachedScannerFolder: { driveId: string; folderId: string } | null = null;
let cachedScannedFileIds: Set<string> | null = null;

async function findScannerFolder(): Promise<{ driveId: string; folderId: string } | null> {
  if (cachedScannerFolder) return cachedScannerFolder;

  const sites = await listSharePointSites();
  for (const site of sites) {
    const drives = await listDrives(site.id);
    for (const drive of drives) {
      const rootItems = await listFiles(drive.id, "root");
      const scannerFolder = rootItems.find(
        (item) => item.isFolder && item.name.toLowerCase().includes("escaner"),
      );
      if (scannerFolder) {
        cachedScannerFolder = { driveId: drive.id, folderId: scannerFolder.id };
        return cachedScannerFolder;
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "scan";

  if (action === "find-folder") {
    const folder = await findScannerFolder();
    if (!folder) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, ...folder });
  }

  if (action === "scan") {
    const scanner = await findScannerFolder();
    if (!scanner) {
      return NextResponse.json({ error: "Carpeta Escáner no encontrada" }, { status: 404 });
    }

    const maxItems = Math.min(Math.max(parseInt(searchParams.get("maxItems") || "5000") || 5000, 100), 25000);
    const page = Math.max(parseInt(searchParams.get("page") || "1") || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "100") || 100, 10), 10000);
    const filterConfidence = searchParams.get("confidence");

    const allFiles = await listAllFilesRecursive(scanner.driveId, scanner.folderId, maxItems);
    const onlyFiles = allFiles.filter((f) => !f.isFolder);

    cachedScannedFileIds = new Set(onlyFiles.map((f) => f.id));

    const classified = onlyFiles.map((f) => {
      const result = classifyFile(f.name);
      return {
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        ...result,
      };
    });

    let filtered = classified;
    if (filterConfidence) {
      filtered = classified.filter((c) => c.confidence === filterConfidence);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    const stats = {
      total: classified.length,
      high: classified.filter((c) => c.confidence === "high").length,
      medium: classified.filter((c) => c.confidence === "medium").length,
      low: classified.filter((c) => c.confidence === "low").length,
      none: classified.filter((c) => c.confidence === "none").length,
      uniqueCommunities: new Set(
        classified.filter((c) => c.communityCode).map((c) => c.communityCode),
      ).size,
    };

    return NextResponse.json({
      files: paginated,
      stats,
      total,
      page,
      pageSize,
      scannerDriveId: scanner.driveId,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "move-batch") {
    const { files } = body as {
      files: {
        fileId: string;
        fileName: string;
        communityCode: string;
        subfolder: string;
      }[];
    };

    if (!files?.length) {
      return NextResponse.json({ error: "files required" }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json({ error: "Máximo 50 archivos por lote" }, { status: 400 });
    }

    const scanner = await findScannerFolder();
    if (!scanner) {
      return NextResponse.json({ error: "Carpeta Escáner no encontrada" }, { status: 404 });
    }

    for (const file of files) {
      if (!STANDARD_SUBFOLDERS.includes(file.subfolder)) {
        return NextResponse.json(
          { error: `Subcarpeta inválida: ${file.subfolder}` },
          { status: 400 },
        );
      }
      if (!/^\d{6}$/.test(file.communityCode)) {
        return NextResponse.json(
          { error: `Código de comunidad inválido: ${file.communityCode}` },
          { status: 400 },
        );
      }
    }

    if (cachedScannedFileIds) {
      const unknownFiles = files.filter((f) => !cachedScannedFileIds!.has(f.fileId));
      if (unknownFiles.length > 0) {
        return NextResponse.json(
          { error: `Archivos no reconocidos del escáner: ${unknownFiles.map((f) => f.fileName).join(", ")}` },
          { status: 400 },
        );
      }
    }

    const uniqueCodes = [...new Set(files.map((f) => f.communityCode))];
    const comunidades = await prisma.comunidad.findMany({
      where: {
        codigo: { in: uniqueCodes },
        sharePointFolderId: { not: null },
      },
      select: { codigo: true, sharePointFolderId: true, sharePointDriveId: true },
    });

    const comunidadMap = new Map(
      comunidades.map((c) => [c.codigo, {
        folderId: c.sharePointFolderId!,
        driveId: c.sharePointDriveId || scanner.driveId,
      }]),
    );

    const subfolderCache = new Map<string, string>();

    const results: {
      fileId: string;
      fileName: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const file of files) {
      try {
        const community = comunidadMap.get(file.communityCode);
        if (!community) {
          results.push({
            fileId: file.fileId,
            fileName: file.fileName,
            success: false,
            error: `Comunidad ${file.communityCode} no tiene carpeta vinculada en SharePoint`,
          });
          continue;
        }

        const destDriveId = community.driveId;
        const cacheKey = `${community.folderId}:${file.subfolder}`;
        let targetFolderId = subfolderCache.get(cacheKey);

        if (!targetFolderId) {
          targetFolderId = await getOrCreateSubfolder(
            destDriveId,
            community.folderId,
            file.subfolder,
          );
          subfolderCache.set(cacheKey, targetFolderId);
        }

        await moveFile(scanner.driveId, file.fileId, targetFolderId);

        if (cachedScannedFileIds) {
          cachedScannedFileIds.delete(file.fileId);
        }

        results.push({
          fileId: file.fileId,
          fileName: file.fileName,
          success: true,
        });
      } catch (err) {
        results.push({
          fileId: file.fileId,
          fileName: file.fileName,
          success: false,
          error: String(err),
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: { total: files.length, succeeded, failed },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
