import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STANDARD_SUBFOLDERS } from "@/lib/sync-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tipo = req.nextUrl.searchParams.get("tipo") || "pendientes";

  try {
    if (tipo === "pendientes") {
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

      const header = ["Código", "Nombre", "Dirección", "Archivos", "Cobertura %", ...STANDARD_SUBFOLDERS.map((s) => s)];
      const rows = comunidades.map((com) => {
        const existing = foldersByCom.get(com.id) || new Set();
        const missing = STANDARD_SUBFOLDERS.filter((sf) => !existing.has(sf));
        const coverage = Math.round(((STANDARD_SUBFOLDERS.length - missing.length) / STANDARD_SUBFOLDERS.length) * 100);
        const subfolderStatus = STANDARD_SUBFOLDERS.map((sf) => (existing.has(sf) ? "SI" : "NO"));
        return [com.codigo, com.nombre, com.direccion, String(fileCountMap.get(com.id) || 0), String(coverage), ...subfolderStatus];
      });

      const csv = [header.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="informe_documentacion_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (tipo === "comunidad") {
      const comId = req.nextUrl.searchParams.get("comunidadId");
      if (!comId) return NextResponse.json({ error: "comunidadId requerido" }, { status: 400 });

      const [comunidad, files] = await Promise.all([
        prisma.comunidad.findUnique({ where: { id: comId }, select: { codigo: true, nombre: true } }),
        prisma.fileCache.findMany({
          where: { comunidadId: comId, isFolder: false },
          orderBy: { subfolder: "asc" },
          select: { name: true, subfolder: true, sizeBytes: true, mimeType: true, sharePointModified: true },
        }),
      ]);

      if (!comunidad) return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });

      const header = ["Nombre archivo", "Subcarpeta", "Tamaño (bytes)", "Tipo", "Última modificación"];
      const rows = files.map((f) => [
        f.name,
        f.subfolder || "(raíz)",
        String(f.sizeBytes),
        f.mimeType || "",
        f.sharePointModified?.toISOString().slice(0, 10) || "",
      ]);

      const csv = [header.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="documentos_${comunidad.codigo}_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
