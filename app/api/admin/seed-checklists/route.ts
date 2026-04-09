import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedMissingChecklists } from "@/lib/seed-checklists";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await prisma.comunidad.findMany({ select: { id: true } });
  const ids = all.map((c) => c.id);
  const created = await seedMissingChecklists(ids);

  return NextResponse.json({ ok: true, total: ids.length, created });
}
