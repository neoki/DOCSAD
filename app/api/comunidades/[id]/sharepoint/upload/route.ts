import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFileToFolder } from "@/lib/microsoft-graph";

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

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo excede el tamaño máximo (50 MB)" }, { status: 400 });
    }

    const targetFolderId = folderId || comunidad.sharePointFolderId;

    const buffer = await file.arrayBuffer();
    const result = await uploadFileToFolder(
      comunidad.sharePointDriveId,
      targetFolderId,
      file.name,
      buffer,
    );

    return NextResponse.json({ success: true, file: result });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
