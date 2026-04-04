import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STANDARD_SUBFOLDERS } from "@/lib/sync-engine";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");

  const where = idsParam ? { id: { in: idsParam.split(",") } } : {};

  const comunidades = await prisma.comunidad.findMany({
    where,
    select: {
      id: true,
      codigo: true,
      nombre: true,
      nif: true,
      direccion: true,
      cp: true,
      sharePointFolderName: true,
    },
    orderBy: { codigo: "asc" },
  });

  const allFiles = await prisma.fileCache.findMany({
    where: {
      comunidadId: { in: comunidades.map((c) => c.id) },
      isFolder: false,
    },
    select: { comunidadId: true, subfolder: true, sizeBytes: true, name: true },
  });

  const filesByCom = new Map<string, typeof allFiles>();
  for (const f of allFiles) {
    if (!f.comunidadId) continue;
    if (!filesByCom.has(f.comunidadId)) filesByCom.set(f.comunidadId, []);
    filesByCom.get(f.comunidadId)!.push(f);
  }

  const lines: string[] = [];
  lines.push("INFORME EJECUTIVO - ESTADO DOCUMENTAL");
  lines.push(`Fecha: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`);
  lines.push(`Total comunidades: ${comunidades.length}`);
  lines.push(`Total archivos: ${allFiles.length}`);
  lines.push("");
  lines.push("=".repeat(80));
  lines.push("");

  let totalComplete = 0;
  let totalPartial = 0;
  let totalEmpty = 0;

  for (const com of comunidades) {
    const files = filesByCom.get(com.id) || [];
    const subfolders = new Set(files.map((f) => f.subfolder).filter(Boolean));
    const covered = STANDARD_SUBFOLDERS.filter((sf) => subfolders.has(sf)).length;
    const coveragePct = Math.round((covered / STANDARD_SUBFOLDERS.length) * 100);
    const missing = STANDARD_SUBFOLDERS.filter((sf) => !subfolders.has(sf));
    const totalSize = files.reduce((s, f) => s + f.sizeBytes, 0);

    if (coveragePct === 100) totalComplete++;
    else if (files.length > 0) totalPartial++;
    else totalEmpty++;

    lines.push(`${com.codigo} - ${com.nombre}`);
    lines.push(`  NIF: ${com.nif} | Dirección: ${com.direccion} ${com.cp}`);
    lines.push(`  Carpeta SP: ${com.sharePointFolderName || "Sin vincular"}`);
    lines.push(`  Archivos: ${files.length} | Tamaño: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
    lines.push(`  Cobertura: ${coveragePct}% (${covered}/${STANDARD_SUBFOLDERS.length} subcarpetas)`);
    if (missing.length > 0) {
      lines.push(`  Falta: ${missing.join(", ")}`);
    }
    lines.push("");
  }

  lines.push("=".repeat(80));
  lines.push("RESUMEN");
  lines.push(`  Completas (100%): ${totalComplete}`);
  lines.push(`  Parciales: ${totalPartial}`);
  lines.push(`  Sin documentos: ${totalEmpty}`);

  const content = lines.join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="informe-docfincas-${new Date().toISOString().slice(0, 10)}.txt"`,
    },
  });
}
