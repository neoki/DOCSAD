import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSyncStats, getGlobalDocInsights } from "@/lib/sync-engine";
import DashboardClient from "./DashboardClient";

async function getDashboardData() {
  const [comunidades, syncStats, docInsights] = await Promise.all([
    prisma.comunidad.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        direccion: true,
        sharePointFolderId: true,
        sharePointFolderName: true,
        sharePointMatchMethod: true,
        _count: { select: { fileCache: { where: { isFolder: false } } } },
      },
      orderBy: { codigo: "asc" },
    }),
    getSyncStats(),
    getGlobalDocInsights(),
  ]);

  const recentLogs = await prisma.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      operation: true,
      status: true,
      fileName: true,
      details: true,
      error: true,
      createdAt: true,
    },
  });

  return {
    comunidades: comunidades.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      direccion: c.direccion,
      linked: !!c.sharePointFolderId,
      folderName: c.sharePointFolderName,
      matchMethod: c.sharePointMatchMethod,
      fileCount: c._count.fileCache,
    })),
    syncStats,
    docInsights: {
      ...docInsights,
      recentActivity: docInsights.recentActivity.map((a) => ({
        ...a,
        modified: a.modified,
      })),
    },
    recentLogs: recentLogs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const data = await getDashboardData();

  return (
    <DashboardClient
      comunidades={data.comunidades}
      syncStats={data.syncStats}
      docInsights={data.docInsights}
      recentLogs={data.recentLogs}
    />
  );
}
