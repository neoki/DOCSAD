import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favoriteIds: favorites.map((f) => f.comunidadId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { comunidadId, action } = await req.json();
  if (!comunidadId) return NextResponse.json({ error: "comunidadId required" }, { status: 400 });

  if (action === "remove") {
    await prisma.favorite.deleteMany({ where: { userId: user.id, comunidadId } });
    return NextResponse.json({ ok: true, action: "removed" });
  }

  await prisma.favorite.upsert({
    where: { userId_comunidadId: { userId: user.id, comunidadId } },
    create: { userId: user.id, comunidadId },
    update: {},
  });

  return NextResponse.json({ ok: true, action: "added" });
}
