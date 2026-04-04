import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STANDARD_SUBFOLDERS } from "@/lib/sync-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  if (ids.length < 2 || ids.length > 5) {
    return NextResponse.json({ error: "Select 2-5 communities" }, { status: 400 });
  }

  const comunidades = await prisma.comunidad.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      sharePointFolderName: true,
      _count: { select: { notas: true } },
    },
  });

  const results = await Promise.all(
    comunidades.map(async (c) => {
      const files = await prisma.fileCache.findMany({
        where: { comunidadId: c.id, isFolder: false },
        select: { subfolder: true, sizeBytes: true, sharePointModified: true, name: true },
      });

      const subfolderSet = new Set(files.map((f) => f.subfolder).filter(Boolean));
      const coverage = STANDARD_SUBFOLDERS.map((sf) => ({
        name: sf,
        hasFiles: subfolderSet.has(sf),
        fileCount: files.filter((f) => f.subfolder === sf).length,
      }));

      const totalSize = files.reduce((s, f) => s + f.sizeBytes, 0);
      const coveragePct = Math.round((coverage.filter((c) => c.hasFiles).length / STANDARD_SUBFOLDERS.length) * 100);

      const latestFile = files.sort((a, b) => {
        const da = a.sharePointModified ? new Date(a.sharePointModified).getTime() : 0;
        const db = b.sharePointModified ? new Date(b.sharePointModified).getTime() : 0;
        return db - da;
      })[0];

      const extMap = new Map<string, number>();
      for (const f of files) {
        const ext = f.name.split(".").pop()?.toLowerCase() || "otro";
        extMap.set(ext, (extMap.get(ext) || 0) + 1);
      }

      return {
        id: c.id,
        codigo: c.codigo,
        nombre: c.nombre,
        folderName: c.sharePointFolderName,
        totalFiles: files.length,
        totalSize,
        coveragePct,
        coverage,
        notasCount: c._count.notas,
        lastActivity: latestFile?.sharePointModified || null,
        fileTypes: Array.from(extMap.entries())
          .map(([ext, count]) => ({ ext, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      };
    })
  );

  return NextResponse.json({ communities: results });
}
