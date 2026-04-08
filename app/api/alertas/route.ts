import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const alerts: {
      id: string;
      comunidadId: string;
      codigo: string;
      nombre: string;
      tipo: string;
      fecha: string;
      diasRestantes: number;
      urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
    }[] = [];

    // ── Alertas de operativa (ITE, reformas) ─────────────────────────────────
    const operativas = await prisma.operativa.findMany({
      where: {
        OR: [
          { fechaProximaITE: { not: null } },
          { fechaReformaFontaneria: { not: null } },
          { fechaReformaSaneamiento: { not: null } },
          { fechaReformaElectricidad: { not: null } },
        ],
      },
      include: {
        comunidad: { select: { id: true, codigo: true, nombre: true } },
      },
    });

    for (const op of operativas) {
      const fechas: { tipo: string; fecha: Date | null }[] = [
        { tipo: "ITE (Inspección Técnica)", fecha: op.fechaProximaITE },
        { tipo: "Reforma fontanería", fecha: op.fechaReformaFontaneria },
        { tipo: "Reforma saneamiento", fecha: op.fechaReformaSaneamiento },
        { tipo: "Reforma electricidad", fecha: op.fechaReformaElectricidad },
      ];

      for (const { tipo, fecha } of fechas) {
        if (!fecha) continue;
        const diasRestantes = Math.ceil((fecha.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diasRestantes > 365) continue;

        let urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
        if (diasRestantes < 0) urgencia = "CRITICA";
        else if (diasRestantes <= 30) urgencia = "ALTA";
        else if (diasRestantes <= 90) urgencia = "MEDIA";
        else urgencia = "BAJA";

        alerts.push({
          id: `${op.id}-${tipo}`,
          comunidadId: op.comunidad.id,
          codigo: op.comunidad.codigo,
          nombre: op.comunidad.nombre,
          tipo,
          fecha: fecha.toISOString(),
          diasRestantes,
          urgencia,
        });
      }
    }

    // ── Vencimientos de documentos ────────────────────────────────────────────
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() + 1);

    const expiries = await prisma.documentExpiry.findMany({
      where: { expiresAt: { lte: cutoff } },
      include: { comunidad: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { expiresAt: "asc" },
    });

    for (const exp of expiries) {
      const diasRestantes = Math.ceil((exp.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
      if (diasRestantes < 0) urgencia = "CRITICA";
      else if (diasRestantes <= 30) urgencia = "ALTA";
      else if (diasRestantes <= 90) urgencia = "MEDIA";
      else urgencia = "BAJA";

      alerts.push({
        id: `expiry-${exp.id}`,
        comunidadId: exp.comunidad.id,
        codigo: exp.comunidad.codigo,
        nombre: exp.comunidad.nombre,
        tipo: `Vencimiento: ${exp.label}`,
        fecha: exp.expiresAt.toISOString(),
        diasRestantes,
        urgencia,
      });
    }

    alerts.sort((a, b) => a.diasRestantes - b.diasRestantes);

    return NextResponse.json({ alerts });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
