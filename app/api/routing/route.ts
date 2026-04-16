import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listAllFilesRecursive,
  moveFile,
  getOrCreateSubfolder,
} from "@/lib/microsoft-graph";
import { classifyFile } from "@/lib/scanner-classifier";
import { getEscanerRoot } from "@/lib/sharepoint-roots";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const comunidadId = searchParams.get("comunidadId");
  const status = searchParams.get("status") || "pending";

  const where: Record<string, unknown> = { status };
  if (comunidadId) where.comunidadId = comunidadId;

  const candidates = await prisma.routingCandidate.findMany({
    where,
    include: {
      comunidad: { select: { id: true, codigo: true, nombre: true } },
    },
    orderBy: [{ confidence: "asc" }, { createdAt: "desc" }],
  });

  const grouped: Record<string, {
    communityCode: string | null;
    comunidadId: string | null;
    comunidadNombre: string | null;
    candidates: typeof candidates;
  }> = {};

  for (const c of candidates) {
    const key = c.communityCode || "sin-codigo";
    if (!grouped[key]) {
      grouped[key] = {
        communityCode: c.communityCode,
        comunidadId: c.comunidadId,
        comunidadNombre: c.comunidad?.nombre || null,
        candidates: [],
      };
    }
    grouped[key].candidates.push(c);
  }

  return NextResponse.json({
    candidates,
    grouped: Object.values(grouped),
    total: candidates.length,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action } = body;

  if (action === "process") {
    const scanner = await getEscanerRoot();
    if (!scanner) {
      return NextResponse.json({ error: "Carpeta Escáner no encontrada" }, { status: 404 });
    }

    const allFiles = await listAllFilesRecursive(scanner.driveId, scanner.folderId, 5000);
    const onlyFiles = allFiles.filter((f) => !f.isFolder);

    if (onlyFiles.length === 0) {
      return NextResponse.json({ created: 0, total: 0, skipped: 0 });
    }

    const existingRows = await prisma.routingCandidate.findMany({
      where: { sharePointItemId: { in: onlyFiles.map((f) => f.id) } },
      select: { sharePointItemId: true },
    });
    const existingSet = new Set(existingRows.map((e) => e.sharePointItemId));
    const newFiles = onlyFiles.filter((f) => !existingSet.has(f.id));

    if (newFiles.length === 0) {
      return NextResponse.json({ created: 0, total: onlyFiles.length, skipped: onlyFiles.length });
    }

    const allComunidades = await prisma.comunidad.findMany({
      where: { sharePointFolderId: { not: null } },
      select: { id: true, codigo: true },
    });
    const codeToId = new Map(allComunidades.map((c) => [c.codigo, c.id]));

    let created = 0;
    for (const file of newFiles) {
      const result = classifyFile(file.name);
      const comunidadId = result.communityCode ? (codeToId.get(result.communityCode) ?? null) : null;
      try {
        await prisma.routingCandidate.upsert({
          where: { sharePointItemId: file.id },
          create: {
            sharePointItemId: file.id,
            fileName: file.name,
            filePath: file.path || null,
            communityCode: result.communityCode,
            comunidadId,
            subfolder: result.subfolder,
            confidence: result.confidence,
            reason: result.reason,
            status: "pending",
            driveId: scanner.driveId,
          },
          update: {},
        });
        created++;
      } catch {
        // skip duplicates silently
      }
    }

    return NextResponse.json({
      created,
      total: onlyFiles.length,
      skipped: onlyFiles.length - newFiles.length,
    });
  }

  if (action === "confirm") {
    const { ids } = body as { ids: string[] };
    if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

    const candidates = await prisma.routingCandidate.findMany({
      where: { id: { in: ids }, status: "pending" },
      include: {
        comunidad: {
          select: { sharePointFolderId: true, sharePointDriveId: true },
        },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ error: "No hay candidatos pendientes" }, { status: 404 });
    }

    const scanner = await getEscanerRoot();
    if (!scanner) {
      console.error("[routing] getEscanerRoot() returned null — carpeta Escáner no configurada");
      return NextResponse.json({ error: "Carpeta Escáner no encontrada" }, { status: 404 });
    }
    console.log(`[routing] Confirmando ${candidates.length} candidatos, scanner driveId=${scanner.driveId}`);

    const subfolderCache = new Map<string, string>();
    const results: { id: string; fileName: string; success: boolean; error?: string }[] = [];

    for (const c of candidates) {
      if (!c.comunidad?.sharePointFolderId) {
        await prisma.routingCandidate.update({
          where: { id: c.id },
          data: {
            status: "rejected",
            confirmedAt: new Date(),
            confirmedBy: session.user?.email || "unknown",
          },
        });
        results.push({
          id: c.id,
          fileName: c.fileName,
          success: false,
          error: "Comunidad sin carpeta SharePoint vinculada",
        });
        continue;
      }

      try {
        const destDriveId = c.comunidad.sharePointDriveId || scanner.driveId;
        const cacheKey = `${c.comunidad.sharePointFolderId}:${c.subfolder}`;
        let targetFolderId = subfolderCache.get(cacheKey);

        if (!targetFolderId) {
          targetFolderId = await getOrCreateSubfolder(
            destDriveId,
            c.comunidad.sharePointFolderId,
            c.subfolder,
          );
          subfolderCache.set(cacheKey, targetFolderId);
        }

        const sourceDriveId = c.driveId || scanner.driveId;
        try {
          await moveFile(sourceDriveId, c.sharePointItemId, targetFolderId, destDriveId);
        } catch (moveErr) {
          const errStr = String(moveErr);
          // 409 nameAlreadyExists → file is already at destination, treat as success
          if (!errStr.includes("nameAlreadyExists")) {
            throw moveErr;
          }
          console.log(`[routing] "${c.fileName}" ya existe en destino, marcando como confirmado`);
        }

        await prisma.routingCandidate.update({
          where: { id: c.id },
          data: {
            status: "confirmed",
            confirmedAt: new Date(),
            confirmedBy: session.user?.email || "unknown",
          },
        });

        results.push({ id: c.id, fileName: c.fileName, success: true });
      } catch (err) {
        console.error(`[routing] Error archivando "${c.fileName}":`, String(err));
        results.push({ id: c.id, fileName: c.fileName, success: false, error: String(err) });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: { total: candidates.length, succeeded, failed },
    });
  }

  if (action === "reject") {
    const { ids } = body as { ids: string[] };
    if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });

    await prisma.routingCandidate.updateMany({
      where: { id: { in: ids }, status: "pending" },
      data: {
        status: "rejected",
        confirmedAt: new Date(),
        confirmedBy: session.user?.email || "unknown",
      },
    });

    return NextResponse.json({ rejected: ids.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
