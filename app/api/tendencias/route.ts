import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const logs = await prisma.syncLog.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
      operation: { in: ["file_add", "file_update", "file_remove", "upload"] },
      status: "success",
    },
    select: { operation: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const monthlyMap = new Map<string, { added: number; updated: number; removed: number; uploaded: number }>();
  for (const log of logs) {
    const key = `${log.createdAt.getFullYear()}-${String(log.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { added: 0, updated: 0, removed: 0, uploaded: 0 });
    const m = monthlyMap.get(key)!;
    if (log.operation === "file_add") m.added++;
    else if (log.operation === "file_update") m.updated++;
    else if (log.operation === "file_remove") m.removed++;
    else if (log.operation === "upload") m.uploaded++;
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  const files = await prisma.fileCache.findMany({
    where: { isFolder: false },
    select: { sizeBytes: true, subfolder: true, comunidadId: true },
  });

  const totalSize = files.reduce((s, f) => s + f.sizeBytes, 0);
  const totalFiles = files.length;
  const communitiesWithFiles = new Set(files.filter((f) => f.comunidadId).map((f) => f.comunidadId)).size;

  const subfolderCounts = new Map<string, number>();
  for (const f of files) {
    const key = f.subfolder || "(raíz)";
    subfolderCounts.set(key, (subfolderCounts.get(key) || 0) + 1);
  }

  const totalComunidades = await prisma.comunidad.count();
  const linkedComunidades = await prisma.comunidad.count({ where: { sharePointFolderId: { not: null } } });

  return NextResponse.json({
    monthly,
    summary: {
      totalFiles,
      totalSize,
      communitiesWithFiles,
      totalComunidades,
      linkedComunidades,
      coveragePct: totalComunidades > 0 ? Math.round((linkedComunidades / totalComunidades) * 100) : 0,
    },
    subfolderDistribution: Array.from(subfolderCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  });
}
