import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/microsoft-graph";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const comunidadId = formData.get("comunidadId") as string;
    const subfolder = formData.get("subfolder") as string;

    if (!file || !comunidadId || !subfolder) {
      return NextResponse.json({ error: "Faltan campos: file, comunidadId, subfolder" }, { status: 400 });
    }

    const comunidad = await prisma.comunidad.findUnique({
      where: { id: comunidadId },
      select: { sharePointDriveId: true, sharePointFolderId: true, sharePointFolderName: true },
    });

    if (!comunidad?.sharePointDriveId || !comunidad?.sharePointFolderId) {
      return NextResponse.json({ error: "Comunidad no vinculada a SharePoint" }, { status: 400 });
    }

    const token = await getValidAccessToken();
    if (!token) return NextResponse.json({ error: "Sin token de SharePoint" }, { status: 401 });

    const uploadPath = `${comunidad.sharePointFolderName}/${subfolder}/${file.name}`;
    const driveId = comunidad.sharePointDriveId;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(uploadPath).replace(/%2F/g, "/")}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return NextResponse.json({ error: `Error subiendo a SharePoint: ${err}` }, { status: 500 });
    }

    const spFile = await uploadRes.json();

    await prisma.fileCache.upsert({
      where: { sharePointItemId: spFile.id },
      create: {
        sharePointItemId: spFile.id,
        driveId,
        comunidadId,
        name: file.name,
        path: `${subfolder}/${file.name}`,
        subfolder,
        sizeBytes: spFile.size || file.size,
        mimeType: file.type || null,
        isFolder: false,
        sharePointModified: spFile.lastModifiedDateTime ? new Date(spFile.lastModifiedDateTime) : new Date(),
        sharePointHash: `${spFile.size}:${spFile.lastModifiedDateTime || ""}`,
      },
      update: {
        name: file.name,
        sizeBytes: spFile.size || file.size,
        mimeType: file.type || null,
        sharePointModified: spFile.lastModifiedDateTime ? new Date(spFile.lastModifiedDateTime) : new Date(),
        sharePointHash: `${spFile.size}:${spFile.lastModifiedDateTime || ""}`,
        lastSyncedAt: new Date(),
      },
    });

    await prisma.syncLog.create({
      data: {
        operation: "upload",
        status: "success",
        comunidadId,
        fileName: file.name,
        filePath: uploadPath,
        destItemId: spFile.id,
        details: `Subido a ${subfolder}`,
      },
    });

    return NextResponse.json({ ok: true, itemId: spFile.id, name: file.name });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
