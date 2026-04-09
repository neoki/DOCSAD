import { prisma } from "./prisma";
import { DOC_TYPES } from "./doctypes";

const DOC_TYPE_IDS = DOC_TYPES.map((dt) => dt.id);
export const EXPECTED_CHECKLIST_COUNT = DOC_TYPES.length;

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
