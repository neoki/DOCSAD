import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: comunidadId } = await params;

  const facturas = await prisma.extractedInvoiceData.findMany({
    where: { comunidadId },
    orderBy: { fechaFactura: "desc" },
  });

  const byYear: Record<number, { total: number; count: number }> = {};
  for (const f of facturas) {
    if (f.importe && f.fechaFactura) {
      const year = new Date(f.fechaFactura).getFullYear();
      if (!byYear[year]) byYear[year] = { total: 0, count: 0 };
      byYear[year].total += f.importe;
      byYear[year].count += 1;
    }
  }

  const proveedores = Array.from(new Set(facturas.map((f) => f.proveedor).filter(Boolean)));

  return NextResponse.json({ facturas, byYear, proveedores });
}
