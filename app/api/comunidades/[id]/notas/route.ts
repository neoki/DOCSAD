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
  try {
    const notas = await prisma.nota.findMany({
      where: { comunidadId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ notas: notas.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { texto } = await req.json();
    if (!texto?.trim()) return NextResponse.json({ error: "Texto requerido" }, { status: 400 });

    const nota = await prisma.nota.create({
      data: {
        comunidadId: id,
        texto: texto.trim(),
        autor: session.user?.email || "admin",
      },
    });
    return NextResponse.json({ nota: { ...nota, createdAt: nota.createdAt.toISOString(), updatedAt: nota.updatedAt.toISOString() } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const { notaId } = await req.json();
    const nota = await prisma.nota.findFirst({ where: { id: notaId, comunidadId: id } });
    if (!nota) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
    await prisma.nota.delete({ where: { id: notaId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
