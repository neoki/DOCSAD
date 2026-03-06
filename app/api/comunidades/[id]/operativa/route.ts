import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operativa = await prisma.operativa.findUnique({
    where: { comunidadId: params.id },
  });

  if (!operativa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(operativa);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Parse date fields
  const dateFields = [
    "fechaReformaFontaneria",
    "fechaReformaSaneamiento",
    "fechaReformaElectricidad",
    "fechaProximaITE",
  ];

  const data: Record<string, unknown> = { ...body };
  for (const field of dateFields) {
    if (data[field] === "" || data[field] === null) {
      data[field] = null;
    } else if (data[field]) {
      data[field] = new Date(data[field] as string);
    }
  }

  const operativa = await prisma.operativa.upsert({
    where: { comunidadId: params.id },
    create: { comunidadId: params.id, ...data },
    update: data,
  });

  return NextResponse.json(operativa);
}
