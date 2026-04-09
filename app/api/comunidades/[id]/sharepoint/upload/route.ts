import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToFolder, isDescendantFolder, getFileDownloadUrl } from "@/lib/microsoft-graph";
import { extractInvoiceData, isInvoiceFolder } from "@/lib/ocr";
import { unstable_after as after } from "next/server";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const comunidad = await prisma.comunidad.findUnique({ where: { id } });
  if (!comunidad) return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
  if (!comunidad.sharePointDriveId || !comunidad.sharePointFolderId) {
    return NextResponse.json({ error: "Esta comunidad no tiene carpeta vinculada" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;
    const folderName = formData.get("folderName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo excede el tamaño máximo (50 MB)" }, { status: 400 });
    }

    let targetFolderId = comunidad.sharePointFolderId;

    if (folderId && folderId !== comunidad.sharePointFolderId) {
      const isValid = await isDescendantFolder(
        comunidad.sharePointDriveId,
        folderId,
        comunidad.sharePointFolderId,
      );
      if (!isValid) {
        return NextResponse.json(
          { error: "La carpeta de destino no pertenece a esta comunidad" },
          { status: 403 },
        );
      }
      targetFolderId = folderId;
    }

    const buffer = await file.arrayBuffer();
    const result = await uploadFileToFolder(
      comunidad.sharePointDriveId,
      targetFolderId,
      file.name,
      buffer,
    ) as { id?: string };

    const uploadedItemId = result?.id;
    const uploadedItem = result as { id?: string; name?: string; size?: number; webUrl?: string; lastModifiedDateTime?: string; file?: { mimeType?: string } } | null;

    let resolvedFolderName: string | null = folderName ?? null;
    if (folderId && folderId !== comunidad.sharePointFolderId) {
      const cachedFolder = await prisma.fileCache.findUnique({
        where: { sharePointItemId: folderId },
        select: { name: true },
      });
      if (cachedFolder?.name) resolvedFolderName = cachedFolder.name;
    }

    const ocrQueued = !!(uploadedItemId && isInvoiceFolder(resolvedFolderName));

    if (uploadedItemId && uploadedItem) {
      await prisma.fileCache.upsert({
        where: { sharePointItemId: uploadedItemId },
        create: {
          sharePointItemId: uploadedItemId,
          driveId: comunidad.sharePointDriveId!,
          name: file.name,
          path: resolvedFolderName ? `${resolvedFolderName}/${file.name}` : file.name,
          subfolder: resolvedFolderName ?? undefined,
          sizeBytes: file.size,
          mimeType: file.type || null,
          isFolder: false,
          webUrl: uploadedItem.webUrl ?? null,
          sharePointModified: new Date(),
          comunidadId: comunidad.id,
        },
        update: {
          name: file.name,
          sizeBytes: file.size,
          sharePointModified: new Date(),
          webUrl: uploadedItem.webUrl ?? null,
        },
      });
    }

    if (ocrQueued && uploadedItemId) {
      after(async () => {
        try {
          const downloadUrl = await getFileDownloadUrl(comunidad.sharePointDriveId!, uploadedItemId);
          await extractInvoiceData(uploadedItemId, comunidad.id, file.name, downloadUrl);
        } catch (err) {
          console.error("[OCR] Background extraction failed:", err);
        }
      });
    }

    return NextResponse.json({ success: true, file: result, ocrQueued });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
