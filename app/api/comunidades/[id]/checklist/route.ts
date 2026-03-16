import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const checklists = await prisma.checklist.findMany({
    where: { comunidadId: id },
    orderBy: { docTypeId: "asc" },
  });

  return NextResponse.json(checklists);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const updates: Array<{
    docTypeId: string;
    estado?: string;
    fecha?: string | null;
    observaciones?: string;
    justificacion?: string;
  }> = body;

  const results = await Promise.all(
    updates.map((update) =>
      prisma.checklist.upsert({
        where: {
          comunidadId_docTypeId: {
            comunidadId: id,
            docTypeId: update.docTypeId,
          },
        },
        create: {
          comunidadId: id,
          docTypeId: update.docTypeId,
          estado: (update.estado as "COMPLETADO" | "PENDIENTE" | "NO_APLICA") ?? "PENDIENTE",
          fecha: update.fecha ? new Date(update.fecha) : null,
          observaciones: update.observaciones ?? "",
          justificacion: update.justificacion ?? "",
        },
        update: {
          estado: update.estado as "COMPLETADO" | "PENDIENTE" | "NO_APLICA" | undefined,
          fecha: update.fecha !== undefined
            ? update.fecha
              ? new Date(update.fecha)
              : null
            : undefined,
          observaciones: update.observaciones,
          justificacion: update.justificacion,
        },
      })
    )
  );

  return NextResponse.json(results);
}
