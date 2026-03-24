import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const documentos = await prisma.documento.findMany({
    where: { comunidadId: id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(documentos);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: comunidadId } = await params;

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { nombre, oneDriveItemId, docTypeId, sizeBytes } = body;

      const documento = await prisma.documento.create({
        data: {
          comunidadId,
          docTypeId: docTypeId || "",
          nombre: nombre || "Sin nombre",
          rutaArchivo: oneDriveItemId ? `onedrive:${oneDriveItemId}` : null,
          sizeBytes: sizeBytes || 0,
        },
      });

      return NextResponse.json(documento, { status: 201 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docTypeId = (formData.get("docTypeId") as string) ?? "";
    const nombre = (formData.get("nombre") as string) ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const uploadDir = `/uploads/${comunidadId}`;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalName = file.name;
    const sanitized = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${timestamp}-${sanitized}`;
    const filePath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const rutaArchivo = `/uploads/${comunidadId}/${filename}`;

    const documento = await prisma.documento.create({
      data: {
        comunidadId,
        docTypeId,
        nombre: nombre || originalName,
        rutaArchivo,
        sizeBytes: file.size,
      },
    });

    return NextResponse.json(documento, { status: 201 });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
