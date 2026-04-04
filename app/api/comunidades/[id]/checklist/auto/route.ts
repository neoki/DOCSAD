import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOC_TYPES } from "@/lib/doctypes";

const SUBFOLDER_TO_DOCTYPE: Record<string, string[]> = {
  "01_Actas": ["acta_ordinaria", "acta_extraordinaria", "libro_actas"],
  "02_Seguros": ["poliza_multirriesgo", "poliza_rc", "expedientes_siniestros", "resoluciones_siniestros"],
  "03_Contratos": ["contrato_ascensor", "contrato_limpieza", "contrato_jardineria", "contrato_luz", "contrato_agua"],
  "04_Contabilidad": ["presupuesto_anual", "liquidacion_ejercicio", "certificado_cuenta", "extractos_bancarios"],
  "05_Juridico": ["escritura_division", "nota_simple", "cif_comunidad", "estatutos", "reglamento_interno"],
  "06_Gobierno": ["nombramiento_presidente", "poder_administrador"],
  "07_PRL": ["evaluacion_riesgos", "plan_emergencia", "certificados_prl", "fichas_seguridad"],
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const files = await prisma.fileCache.findMany({
    where: { comunidadId: id, isFolder: false },
    select: { subfolder: true },
  });

  const subfolders = new Set(files.map((f) => f.subfolder).filter(Boolean));

  const docTypeIds: string[] = [];
  for (const [subfolder, dtIds] of Object.entries(SUBFOLDER_TO_DOCTYPE)) {
    if (subfolders.has(subfolder)) {
      docTypeIds.push(...dtIds);
    }
  }

  if (docTypeIds.length === 0) {
    return NextResponse.json({ updated: 0, message: "No matching subfolders found" });
  }

  const validDocTypeIds = DOC_TYPES.map((dt) => dt.id);
  const filtered = docTypeIds.filter((id) => validDocTypeIds.includes(id));

  let updated = 0;
  for (const docTypeId of filtered) {
    const result = await prisma.checklist.updateMany({
      where: {
        comunidadId: id,
        docTypeId,
        estado: "PENDIENTE",
      },
      data: { estado: "COMPLETADO" },
    });
    updated += result.count;
  }

  return NextResponse.json({ updated, docTypeIds: filtered });
}
