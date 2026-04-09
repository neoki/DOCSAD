import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedMissingChecklists, autoCompleteChecklistsFromFiles } from "@/lib/seed-checklists";

async function runSeed() {
  const all = await prisma.comunidad.findMany({ select: { id: true } });
  const ids = all.map((c) => c.id);
  const seeded = await seedMissingChecklists(ids);
  const completed = await autoCompleteChecklistsFromFiles(ids);
  return { ok: true, total: ids.length, seeded, completed };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runSeed();
  return NextResponse.json(result);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runSeed();
  return NextResponse.json(result);
}
