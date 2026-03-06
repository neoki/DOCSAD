import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generarAlertas } from "@/lib/alerts";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comunidades = await prisma.comunidad.findMany({
    include: { operativa: true },
  });

  const alertasGeneradas = generarAlertas(comunidades);

  // Also fetch persisted (dismissed) alerts
  const alertasDescartadas = await prisma.alerta.findMany({
    where: { descartada: true },
  });

  const descartadasKeys = new Set(
    alertasDescartadas.map((a) => `${a.comunidadId}:${a.tipo}:${a.titulo}`)
  );

  const alertas = alertasGeneradas
    .filter((a) => !descartadasKeys.has(`${a.comunidadId}:${a.tipo}:${a.titulo}`))
    .map((a, i) => ({
      id: `gen-${i}`,
      ...a,
      descartada: false,
      createdAt: new Date().toISOString(),
    }));

  return NextResponse.json(alertas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { comunidadId, tipo, titulo, descartada } = body;

  if (descartada) {
    // Mark as dismissed by upserting
    const existing = await prisma.alerta.findFirst({
      where: { comunidadId, tipo, titulo },
    });

    if (existing) {
      await prisma.alerta.update({
        where: { id: existing.id },
        data: { descartada: true },
      });
    } else {
      await prisma.alerta.create({
        data: {
          comunidadId,
          tipo,
          urgencia: body.urgencia,
          titulo,
          descripcion: body.descripcion ?? "",
          descartada: true,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
