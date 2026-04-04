import { prisma } from "./prisma";

export async function logAudit(opts: {
  userId?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        userEmail: opts.userEmail,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId,
        details: opts.details,
      },
    });
  } catch {
  }
}
