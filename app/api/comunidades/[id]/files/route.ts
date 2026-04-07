import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const subfolder = searchParams.get("subfolder");
  const search = searchParams.get("search")?.toLowerCase() || "";

  const comunidad = await prisma.comunidad.findUnique({
    where: { id },
    select: { id: true, sharePointFolderId: true, sharePointFolderName: true },
  });

  if (!comunidad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!comunidad.sharePointFolderId) {
    return NextResponse.json({ linked: false, subfolders: [], files: [] });
  }

  const [allItems, subfolderGroups] = await Promise.all([
    prisma.fileCache.findMany({
      where: {
        comunidadId: id,
        isFolder: false,
        ...(subfolder === "__root__"
          ? { subfolder: null }
          : subfolder
          ? { subfolder }
          : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      select: {
        sharePointItemId: true,
        driveId: true,
        name: true,
        subfolder: true,
        sizeBytes: true,
        mimeType: true,
        sharePointModified: true,
        webUrl: true,
      },
      orderBy: { name: "asc" },
      take: 2000,
    }),
    prisma.fileCache.groupBy({
      by: ["subfolder"],
      where: { comunidadId: id, isFolder: false },
      _count: { _all: true },
      orderBy: { subfolder: "asc" },
    }),
  ]);

  const subfolders = subfolderGroups.map((g) => ({
    name: g.subfolder ?? null,
    count: g._count._all,
  }));

  const files = allItems.map((f) => ({
    id: f.sharePointItemId,
    driveId: f.driveId,
    name: f.name,
    subfolder: f.subfolder,
    sizeBytes: f.sizeBytes,
    mimeType: f.mimeType,
    lastModified: f.sharePointModified?.toISOString() ?? null,
    webUrl: f.webUrl,
  }));

  return NextResponse.json({
    linked: true,
    folderName: comunidad.sharePointFolderName,
    subfolders,
    files,
    total: files.length,
  });
}
