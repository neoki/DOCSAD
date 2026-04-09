import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DOC_TYPES } from "@/lib/doctypes";
import { seedMissingChecklists, EXPECTED_CHECKLIST_COUNT } from "@/lib/seed-checklists";

const DOC_TYPE_IDS = DOC_TYPES.map((dt) => dt.id);

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
          { codigo: { contains: search, mode: "insensitive" as const } },
          { cp: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const all = searchParams.get("all") === "true";

  const [total, comunidades] = await Promise.all([
    prisma.comunidad.count({ where }),
    prisma.comunidad.findMany({
      where,
      include: {
        operativa: true,
        checklists: all ? { select: { estado: true } } : false,
        _count: {
          select: { checklists: true, documentos: true, alertas: true, notas: true },
        },
      },
      orderBy: { codigo: "asc" },
      ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
  ]);

  const unseededIds = comunidades
    .filter((c) => c._count.checklists < EXPECTED_CHECKLIST_COUNT)
    .map((c) => c.id);

  if (unseededIds.length > 0 && all) {
    try {
      console.log(`[seed-checklists] Seeding ${unseededIds.length} communities synchronously…`);
      const created = await seedMissingChecklists(unseededIds);
      console.log(`[seed-checklists] Created ${created} checklist entries.`);

      const freshChecklists = await prisma.checklist.findMany({
        where: { comunidadId: { in: unseededIds } },
        select: { comunidadId: true, estado: true },
      });
      const byId = new Map<string, { estado: string }[]>();
      for (const row of freshChecklists) {
        const arr = byId.get(row.comunidadId) ?? [];
        arr.push({ estado: row.estado });
        byId.set(row.comunidadId, arr);
      }
      for (const c of comunidades) {
        if (unseededIds.includes(c.id)) {
          (c as Record<string, unknown>).checklists = byId.get(c.id) ?? [];
          c._count.checklists = (byId.get(c.id) ?? []).length;
        }
      }
    } catch (err) {
      console.error("[seed-checklists] Error:", err);
    }
  }

  return NextResponse.json({ comunidades, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { codigo, nombre, nif, direccion, cp, pisos } = body;

  if (!nombre || !nif || !direccion || !codigo) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const comunidad = await prisma.comunidad.create({
    data: {
      codigo,
      nombre,
      nif,
      direccion,
      cp: cp ?? "",
      pisos: pisos ?? 0,
      operativa: {
        create: {},
      },
      checklists: {
        createMany: {
          data: DOC_TYPE_IDS.map((docTypeId) => ({ docTypeId })),
        },
      },
    },
    include: { operativa: true },
  });

  return NextResponse.json(comunidad, { status: 201 });
}
