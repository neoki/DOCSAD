import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listFiles,
  createCommunityFolderStructure,
  normalizeSubfolders,
  searchDriveForFolder,
  uploadFileToFolder,
  isOneDriveConnected,
  STANDARD_SUBFOLDERS,
} from "@/lib/microsoft-graph";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  const comunidad = await prisma.comunidad.findUnique({ where: { id } });
  if (!comunidad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const connected = await isOneDriveConnected();
  if (!connected) return NextResponse.json({ error: "SharePoint no conectado" }, { status: 400 });

  try {
    if (action === "files") {
      if (!comunidad.sharePointDriveId || !comunidad.sharePointFolderId) {
        return NextResponse.json({ error: "No folder linked", linked: false });
      }
      const folderId = searchParams.get("folderId") || comunidad.sharePointFolderId;
      const files = await listFiles(comunidad.sharePointDriveId, folderId);
      return NextResponse.json({ files, linked: true });
    }

    if (action === "subfolders") {
      if (!comunidad.sharePointDriveId || !comunidad.sharePointFolderId) {
        return NextResponse.json({ error: "No folder linked", linked: false });
      }
      const allItems = await listFiles(comunidad.sharePointDriveId, comunidad.sharePointFolderId);
      const folders = allItems.filter((f) => f.isFolder);
      const rootFiles = allItems.filter((f) => !f.isFolder);

      const subfolderData = [];
      for (const folder of folders) {
        const children = await listFiles(comunidad.sharePointDriveId, folder.id);
        const fileCount = children.filter((c) => !c.isFolder).length;
        subfolderData.push({
          id: folder.id,
          name: folder.name,
          fileCount,
          isStandard: STANDARD_SUBFOLDERS.includes(folder.name),
        });
      }

      subfolderData.sort((a, b) => a.name.localeCompare(b.name));

      return NextResponse.json({
        subfolders: subfolderData,
        rootFiles,
        linked: true,
        folderName: comunidad.sharePointFolderName,
      });
    }

    if (action === "search") {
      const driveId = searchParams.get("driveId");
      const query = searchParams.get("q");
      if (!driveId || !query) return NextResponse.json({ error: "Missing params" }, { status: 400 });
      const results = await searchDriveForFolder(driveId, query);
      return NextResponse.json({ results });
    }

    return NextResponse.json({
      linked: !!(comunidad.sharePointDriveId && comunidad.sharePointFolderId),
      sharePointSiteId: comunidad.sharePointSiteId,
      sharePointDriveId: comunidad.sharePointDriveId,
      sharePointFolderId: comunidad.sharePointFolderId,
      sharePointFolderName: comunidad.sharePointFolderName,
    });
  } catch (err) {
    console.error("SharePoint GET error:", err);
    return NextResponse.json({ error: "Error de SharePoint" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const action = body.action;

  const comunidad = await prisma.comunidad.findUnique({ where: { id } });
  if (!comunidad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (action === "create-folder") {
      const { driveId, siteId, folderName, parentId } = body;
      if (!driveId || !folderName) return NextResponse.json({ error: "Missing params" }, { status: 400 });

      const result = await createCommunityFolderStructure(driveId, folderName, parentId);

      await prisma.comunidad.update({
        where: { id },
        data: {
          sharePointSiteId: siteId || null,
          sharePointDriveId: driveId,
          sharePointFolderId: result.mainFolder.id,
          sharePointFolderName: folderName,
        },
      });

      return NextResponse.json({ success: true, folderId: result.mainFolder.id, subfolders: result.subfolders });
    }

    if (action === "link-folder") {
      const { driveId, siteId, folderId, folderName } = body;
      if (!driveId || !folderId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

      await prisma.comunidad.update({
        where: { id },
        data: {
          sharePointSiteId: siteId || null,
          sharePointDriveId: driveId,
          sharePointFolderId: folderId,
          sharePointFolderName: folderName || null,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "normalize") {
      if (!comunidad.sharePointDriveId || !comunidad.sharePointFolderId) {
        return NextResponse.json({ error: "No folder linked" }, { status: 400 });
      }
      const created = await normalizeSubfolders(comunidad.sharePointDriveId, comunidad.sharePointFolderId);
      return NextResponse.json({ success: true, created });
    }

    if (action === "unlink") {
      await prisma.comunidad.update({
        where: { id },
        data: {
          sharePointSiteId: null,
          sharePointDriveId: null,
          sharePointFolderId: null,
          sharePointFolderName: null,
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("SharePoint POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
