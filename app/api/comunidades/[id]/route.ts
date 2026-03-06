import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comunidad = await prisma.comunidad.findUnique({
    where: { id: params.id },
    include: {
      operativa: true,
      _count: { select: { checklists: true, documentos: true, alertas: true } },
    },
  });

  if (!comunidad) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(comunidad);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { nombre, nif, direccion, pisos } = body;

  const comunidad = await prisma.comunidad.update({
    where: { id: params.id },
    data: { nombre, nif, direccion, pisos },
  });

  return NextResponse.json(comunidad);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.comunidad.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
