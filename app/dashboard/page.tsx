import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS, DOC_TYPES } from "@/lib/doctypes";
import DashboardClient from "./DashboardClient";

async function getDashboardData() {
  const [comunidades, checklists] = await Promise.all([
    prisma.comunidad.findMany({ include: { operativa: true } }),
    prisma.checklist.findMany(),
  ]);

  const checklistsByComunidad: Record<string, typeof checklists> = {};
  for (const cl of checklists) {
    if (!checklistsByComunidad[cl.comunidadId]) checklistsByComunidad[cl.comunidadId] = [];
    checklistsByComunidad[cl.comunidadId].push(cl);
  }

  const comunidadesData = comunidades.map((c) => {
    const cls = checklistsByComunidad[c.id] || [];
    const total = cls.length;
    const completados = cls.filter((x) => x.estado === "COMPLETADO").length;
    const noAplica = cls.filter((x) => x.estado === "NO_APLICA").length;
    const pendientes = cls.filter((x) => x.estado === "PENDIENTE").length;
    const applicable = total - noAplica;
    const completitud = applicable > 0 ? Math.round((completados / applicable) * 100) : 0;

    const categoriaStats: Record<string, { completados: number; pendientes: number; noAplica: number; total: number }> = {};
    for (const catKey of Object.keys(CATEGORIAS)) {
      const catDocIds = DOC_TYPES.filter((dt) => dt.categoria === catKey).map((dt) => dt.id);
      const catCls = cls.filter((x) => catDocIds.includes(x.docTypeId));
      categoriaStats[catKey] = {
        completados: catCls.filter((x) => x.estado === "COMPLETADO").length,
        pendientes: catCls.filter((x) => x.estado === "PENDIENTE").length,
        noAplica: catCls.filter((x) => x.estado === "NO_APLICA").length,
        total: catCls.length,
      };
    }

    const op = c.operativa;
    const tienePersonal = op
      ? op.tienePortero || op.tieneConserje || op.tieneGarajista || op.tieneLimpiadora || op.tieneOtroPersonal
      : false;
    const tieneReformas = op
      ? op.reformaFontaneria || op.reformaSaneamiento || op.reformaElectricidad
      : false;

    return {
      id: c.id,
      nombre: c.nombre,
      nif: c.nif,
      direccion: c.direccion,
      completados,
      pendientes,
      noAplica,
      total,
      completitud,
      categoriaStats,
      operativa: op
        ? {
            usaAgreGasfincas: op.usaAgreGasfincas,
            somosCorredorSeguro: op.somosCorredorSeguro,
            tieneVideovigilancia: op.tieneVideovigilancia,
            tienePersonal,
            actuaComoArrendadora: op.actuaComoArrendadora,
            obligadaITE: op.obligadaITE,
            tieneAppTuComunidad: op.tieneAppTuComunidad,
            gestionaConsumos: op.gestionaConsumos,
            gestionaPermisosGasoleo: op.gestionaPermisosGasoleo,
            tieneReformas,
          }
        : null,
    };
  });

  const catStats = Object.entries(CATEGORIAS).map(([key, cat]) => {
    let completados = 0, pendientes = 0, noAplica = 0, total = 0;
    for (const cd of comunidadesData) {
      const s = cd.categoriaStats[key];
      if (s) {
        completados += s.completados;
        pendientes += s.pendientes;
        noAplica += s.noAplica;
        total += s.total;
      }
    }
    return { key, label: cat.label, color: cat.color, completados, pendientes, noAplica, total };
  });

  const totalComunidades = comunidadesData.length;
  const completitudMedia =
    totalComunidades > 0
      ? Math.round(comunidadesData.reduce((sum, c) => sum + c.completitud, 0) / totalComunidades)
      : 0;
  const totalPendientes = comunidadesData.reduce((sum, c) => sum + c.pendientes, 0);
  const appTuComunidadCount = comunidadesData.filter((c) => c.operativa?.tieneAppTuComunidad).length;

  const conDocumentacion = comunidades.filter((c) => c.sharePointFolderName !== null).length;
  const sinDocumentacion = totalComunidades - conDocumentacion;
  const pctDigitalizacion = totalComunidades > 0 ? Math.round((conDocumentacion / totalComunidades) * 100) : 0;

  return {
    comunidades: comunidadesData,
    categorias: catStats,
    totalComunidades,
    completitudMedia,
    totalPendientes,
    appTuComunidadCount,
    conDocumentacion,
    sinDocumentacion,
    pctDigitalizacion,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const data = await getDashboardData();

  return (
    <DashboardClient
      comunidades={data.comunidades}
      categorias={data.categorias}
      totalComunidades={data.totalComunidades}
      completitudMedia={data.completitudMedia}
      totalPendientes={data.totalPendientes}
      appTuComunidadCount={data.appTuComunidadCount}
      conDocumentacion={data.conDocumentacion}
      sinDocumentacion={data.sinDocumentacion}
      pctDigitalizacion={data.pctDigitalizacion}
    />
  );
}
