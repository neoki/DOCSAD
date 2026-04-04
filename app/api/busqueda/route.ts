import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const subfolder = req.nextUrl.searchParams.get("subfolder") || "";
  const comunidadId = req.nextUrl.searchParams.get("comunidadId") || "";
  const tipo = req.nextUrl.searchParams.get("tipo") || "";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 50;

  try {
    const where: Record<string, unknown> = { isFolder: false };

    if (q) where.name = { contains: q, mode: "insensitive" };
    if (subfolder) where.subfolder = subfolder;
    if (comunidadId) where.comunidadId = comunidadId;
    if (tipo) {
      const extensions: Record<string, string[]> = {
        pdf: ["pdf"],
        doc: ["doc", "docx"],
        xls: ["xls", "xlsx"],
        img: ["jpg", "jpeg", "png", "gif", "bmp", "tiff"],
      };
      if (extensions[tipo]) {
        where.name = {
          ...(typeof where.name === "object" ? where.name : {}),
          endsWith: undefined,
        };
        where.OR = extensions[tipo].map((ext) => ({
          name: { ...(q ? { contains: q, mode: "insensitive" } : {}), endsWith: `.${ext}` },
        }));
      }
    }

    const [results, total] = await Promise.all([
      prisma.fileCache.findMany({
        where,
        orderBy: { sharePointModified: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          name: true,
          path: true,
          subfolder: true,
          sizeBytes: true,
          mimeType: true,
          sharePointModified: true,
          comunidad: { select: { id: true, codigo: true, nombre: true } },
        },
      }),
      prisma.fileCache.count({ where }),
    ]);

    return NextResponse.json({
      results: results.map((r) => ({
        ...r,
        sharePointModified: r.sharePointModified?.toISOString() || null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
