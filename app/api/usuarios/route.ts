import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  try {
    const { email, name, password, role } = await req.json();
    if (!email || !name || !password) return NextResponse.json({ error: "Campos requeridos" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role: role === "ADMIN" ? "ADMIN" : "USER" },
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
  if (currentUser?.role !== "ADMIN") return NextResponse.json({ error: "Solo admin" }, { status: 403 });

  try {
    const { userId } = await req.json();
    if (userId === currentUser.id) return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
