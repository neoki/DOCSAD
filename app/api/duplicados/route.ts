import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const comunidadId = searchParams.get("comunidadId");

  const where: Record<string, unknown> = { isFolder: false };
  if (comunidadId) where.comunidadId = comunidadId;

  const files = await prisma.fileCache.findMany({
    where: where as never,
    select: {
      id: true,
      name: true,
      sizeBytes: true,
      subfolder: true,
      path: true,
      comunidadId: true,
      comunidad: { select: { codigo: true, nombre: true } },
    },
  });

  const nameMap = new Map<string, typeof files>();
  for (const f of files) {
    const key = f.name.toLowerCase();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(f);
  }

  const duplicates: {
    name: string;
    count: number;
    files: {
      id: string;
      subfolder: string | null;
      path: string;
      sizeBytes: number;
      comunidadId: string | null;
      comunidad: { codigo: string; nombre: string } | null;
    }[];
  }[] = [];

  for (const [name, group] of nameMap) {
    if (group.length > 1) {
      duplicates.push({
        name,
        count: group.length,
        files: group.map((f) => ({
          id: f.id,
          subfolder: f.subfolder,
          path: f.path,
          sizeBytes: f.sizeBytes,
          comunidadId: f.comunidadId,
          comunidad: f.comunidad,
        })),
      });
    }
  }

  duplicates.sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalDuplicateGroups: duplicates.length,
    totalDuplicateFiles: duplicates.reduce((s, d) => s + d.count, 0),
    duplicates: duplicates.slice(0, 100),
  });
}
