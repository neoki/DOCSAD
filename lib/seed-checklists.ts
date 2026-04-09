import { prisma } from "./prisma";
import { DOC_TYPES } from "./doctypes";

const DOC_TYPE_IDS = DOC_TYPES.map((dt) => dt.id);
export const EXPECTED_CHECKLIST_COUNT = DOC_TYPES.length;

export const SUBFOLDER_TO_DOCTYPE: Record<string, string[]> = {
  "01_Actas":    ["acta_ordinaria", "acta_extraordinaria", "libro_actas"],
  "Actas":       ["acta_ordinaria", "acta_extraordinaria", "libro_actas"],
  "Acta":        ["acta_ordinaria", "acta_extraordinaria"],

  "02_Seguros":  ["poliza_multirriesgo", "poliza_rc", "expedientes_siniestros", "resoluciones_siniestros"],
  "05_Seguros":  ["poliza_multirriesgo", "poliza_rc", "expedientes_siniestros", "resoluciones_siniestros"],
  "Seguro":      ["poliza_multirriesgo", "poliza_rc"],

  "03_Contratos":     ["contrato_ascensor", "contrato_limpieza", "contrato_jardineria", "contrato_luz", "contrato_agua"],
  "Contratos":        ["contrato_ascensor", "contrato_limpieza", "contrato_jardineria", "contrato_luz", "contrato_agua"],
  "Contrato":         ["contrato_ascensor", "contrato_limpieza", "contrato_jardineria", "contrato_luz", "contrato_agua"],
  "Mantenimiento":    ["contrato_ascensor", "contrato_limpieza", "contrato_jardineria"],
  "10_Mantenimiento": ["contrato_ascensor", "contrato_limpieza", "contrato_jardineria"],

  "04_Contabilidad":           ["presupuesto_anual", "liquidacion_ejercicio", "certificado_cuenta", "extractos_bancarios"],
  "02_Presupuestos_y_Cuentas": ["presupuesto_anual", "liquidacion_ejercicio", "certificado_cuenta", "extractos_bancarios"],
  "04_Facturas":               ["presupuesto_anual", "liquidacion_ejercicio"],

  "05_Juridico":           ["escritura_division", "nota_simple", "cif_comunidad", "estatutos", "reglamento_interno"],
  "09_Documentacion_Legal":["escritura_division", "nota_simple", "cif_comunidad", "estatutos", "reglamento_interno"],
  "Documentación":         ["escritura_division", "nota_simple", "cif_comunidad", "estatutos", "reglamento_interno"],
  "Documentaciób":         ["escritura_division", "nota_simple", "cif_comunidad", "estatutos", "reglamento_interno"],
  "Estatutos":             ["estatutos", "reglamento_interno"],

  "06_Gobierno": ["nombramiento_presidente", "poder_administrador"],

  "07_PRL":      ["evaluacion_riesgos", "plan_emergencia", "certificados_prl", "fichas_seguridad"],
};

export async function seedMissingChecklists(comunidadIds: string[]): Promise<number> {
  if (comunidadIds.length === 0) return 0;

  const existing = await prisma.checklist.findMany({
    where: { comunidadId: { in: comunidadIds } },
    select: { comunidadId: true, docTypeId: true },
  });

  const existingSet = new Set(existing.map((c) => `${c.comunidadId}|${c.docTypeId}`));

  const toCreate: { comunidadId: string; docTypeId: string }[] = [];
  for (const comunidadId of comunidadIds) {
    for (const docTypeId of DOC_TYPE_IDS) {
      if (!existingSet.has(`${comunidadId}|${docTypeId}`)) {
        toCreate.push({ comunidadId, docTypeId });
      }
    }
  }

  if (toCreate.length === 0) return 0;

  const result = await prisma.checklist.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  return result.count;
}

export async function autoCompleteChecklistsFromFiles(comunidadIds?: string[]): Promise<number> {
  const files = await prisma.fileCache.findMany({
    where: {
      isFolder: false,
      subfolder: { not: null },
      ...(comunidadIds ? { comunidadId: { in: comunidadIds } } : { comunidadId: { not: null } }),
    },
    select: { comunidadId: true, subfolder: true },
  });

  const comunidadSubfolders = new Map<string, Set<string>>();
  for (const f of files) {
    if (!f.comunidadId || !f.subfolder) continue;
    if (!comunidadSubfolders.has(f.comunidadId)) {
      comunidadSubfolders.set(f.comunidadId, new Set());
    }
    comunidadSubfolders.get(f.comunidadId)!.add(f.subfolder);
  }

  let totalUpdated = 0;

  for (const [comunidadId, subfolders] of comunidadSubfolders) {
    const docTypeIdsToComplete = new Set<string>();
    for (const subfolder of subfolders) {
      const mapped = SUBFOLDER_TO_DOCTYPE[subfolder];
      if (mapped) mapped.forEach((id) => docTypeIdsToComplete.add(id));
    }

    if (docTypeIdsToComplete.size === 0) continue;

    const result = await prisma.checklist.updateMany({
      where: {
        comunidadId,
        docTypeId: { in: [...docTypeIdsToComplete] },
        estado: "PENDIENTE",
      },
      data: { estado: "COMPLETADO" },
    });
    totalUpdated += result.count;
  }

  return totalUpdated;
}
