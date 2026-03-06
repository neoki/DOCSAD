import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "10");

  const where = search
    ? {
        OR: [
          { nombre: { contains: search, mode: "insensitive" as const } },
          { nif: { contains: search, mode: "insensitive" as const } },
          { direccion: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, comunidades] = await Promise.all([
    prisma.comunidad.count({ where }),
    prisma.comunidad.findMany({
      where,
      include: {
        operativa: true,
        _count: {
          select: { checklists: true, documentos: true, alertas: true },
        },
      },
      orderBy: { nombre: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ comunidades, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { nombre, nif, direccion, pisos } = body;

  if (!nombre || !nif || !direccion) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const DOC_TYPES = [
    "estatutos", "acta_constitucion", "libro_actas", "cif_comunidad", "escrituras",
    "seguro_comunidad", "seguro_certificado", "ite_certificado", "boletin_electrico",
    "certificado_ascensor", "rgpd_registro", "rgpd_politica", "contrato_limpieza",
    "contrato_mantenimiento", "contrato_jardineria", "presupuesto_anual",
    "liquidacion_anual", "cuenta_corriente",
  ];

  const comunidad = await prisma.comunidad.create({
    data: {
      nombre,
      nif,
      direccion,
      pisos: pisos ?? 0,
      operativa: {
        create: {},
      },
      checklists: {
        createMany: {
          data: DOC_TYPES.map((docTypeId) => ({ docTypeId })),
        },
      },
    },
    include: { operativa: true },
  });

  return NextResponse.json(comunidad, { status: 201 });
}
