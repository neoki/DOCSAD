import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comunidadId = req.nextUrl.searchParams.get("comunidadId");
  const upcoming = req.nextUrl.searchParams.get("upcoming");

  try {
    if (upcoming) {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() + 1);
      const expiries = await prisma.documentExpiry.findMany({
        where: { expiresAt: { lte: cutoff } },
        include: { comunidad: { select: { id: true, codigo: true, nombre: true } } },
        orderBy: { expiresAt: "asc" },
      });
      return NextResponse.json({ expiries });
    }

    if (!comunidadId) {
      return NextResponse.json({ error: "comunidadId required" }, { status: 400 });
    }

    const expiries = await prisma.documentExpiry.findMany({
      where: { comunidadId },
      orderBy: { expiresAt: "asc" },
    });
    return NextResponse.json({ expiries });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { sharePointItemId, comunidadId, fileName, label, expiresAt } = body;

    if (!sharePointItemId || !comunidadId || !fileName || !label || !expiresAt) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    const newExpiresAt = new Date(expiresAt);

    const existing = await prisma.documentExpiry.findUnique({ where: { sharePointItemId } });
    const expiresAtChanged =
      !existing || existing.expiresAt.getTime() !== newExpiresAt.getTime();

    const expiry = await prisma.documentExpiry.upsert({
      where: { sharePointItemId },
      create: {
        sharePointItemId,
        comunidadId,
        fileName,
        label,
        expiresAt: newExpiresAt,
      },
      update: {
        fileName,
        label,
        expiresAt: newExpiresAt,
        ...(expiresAtChanged ? { notificado: false } : {}),
      },
    });

    return NextResponse.json({ expiry });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sharePointItemId = req.nextUrl.searchParams.get("itemId");
  if (!sharePointItemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  try {
    await prisma.documentExpiry.delete({ where: { sharePointItemId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
