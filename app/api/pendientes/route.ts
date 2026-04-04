import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STANDARD_SUBFOLDERS } from "@/lib/sync-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filterSubfolder = req.nextUrl.searchParams.get("subfolder") || "";

  try {
    const [comunidades, allSubfolders, fileCounts] = await Promise.all([
      prisma.comunidad.findMany({
        where: { sharePointFolderId: { not: null } },
        select: { id: true, codigo: true, nombre: true, direccion: true },
        orderBy: { codigo: "asc" },
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
    ]);

    const foldersByCom = new Map<string, Set<string>>();
    for (const f of allSubfolders) {
      if (!f.comunidadId || !f.subfolder) continue;
      if (!foldersByCom.has(f.comunidadId)) foldersByCom.set(f.comunidadId, new Set());
      foldersByCom.get(f.comunidadId)!.add(f.subfolder);
    }

    const fileCountMap = new Map(fileCounts.map((c) => [c.comunidadId, c._count]));

    const items = comunidades
      .map((com) => {
        const existing = foldersByCom.get(com.id) || new Set();
        const missing = STANDARD_SUBFOLDERS.filter((sf) => !existing.has(sf));
        return {
          ...com,
          missing,
          present: STANDARD_SUBFOLDERS.filter((sf) => existing.has(sf)),
          fileCount: fileCountMap.get(com.id) || 0,
          coverage: Math.round(((STANDARD_SUBFOLDERS.length - missing.length) / STANDARD_SUBFOLDERS.length) * 100),
        };
      })
      .filter((item) => {
        if (filterSubfolder) return item.missing.includes(filterSubfolder);
        return item.missing.length > 0;
      })
      .sort((a, b) => a.coverage - b.coverage);

    return NextResponse.json({
      items,
      totalCommunities: comunidades.length,
      withIssues: items.length,
      standardSubfolders: STANDARD_SUBFOLDERS,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
