import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generarAlertas } from "@/lib/alerts";
import Navbar from "@/components/Navbar";
import Link from "next/link";

async function getDashboardData() {
  const [comunidades, totalDocs, checklists] = await Promise.all([
    prisma.comunidad.findMany({ include: { operativa: true } }),
    prisma.documento.count(),
    prisma.checklist.findMany(),
  ]);

  const alertas = generarAlertas(comunidades);
  const alertasActivas = alertas.length;

  const totalChecklist = checklists.length;
  const completados = checklists.filter((c) => c.estado === "COMPLETADO").length;
  const completionPct = totalChecklist > 0 ? Math.round((completados / totalChecklist) * 100) : 0;

  return {
    totalComunidades: comunidades.length,
    completionPct,
    alertasActivas,
    totalDocs,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const data = await getDashboardData();

  const kpis = [
    {
      label: "Comunidades",
      value: data.totalComunidades,
      icon: "🏢",
      color: "bg-blue-50 border-blue-200",
      textColor: "text-blue-700",
      iconBg: "bg-blue-100",
      link: "/comunidades",
    },
    {
      label: "Checklist completado",
      value: `${data.completionPct}%`,
      icon: "✅",
      color: "bg-green-50 border-green-200",
      textColor: "text-green-700",
      iconBg: "bg-green-100",
      link: null,
    },
    {
      label: "Alertas activas",
      value: data.alertasActivas,
      icon: "🔔",
      color: "bg-red-50 border-red-200",
      textColor: "text-red-700",
      iconBg: "bg-red-100",
      link: "/alertas",
    },
    {
      label: "Documentos",
      value: data.totalDocs,
      icon: "📄",
      color: "bg-purple-50 border-purple-200",
      textColor: "text-purple-700",
      iconBg: "bg-purple-100",
      link: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Bienvenido, {session.user?.name}. Resumen del sistema DocFincas.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {kpis.map((kpi) => {
            const card = (
              <div
                className={`card border ${kpi.color} hover:shadow-md transition-shadow ${kpi.link ? "cursor-pointer" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${kpi.iconBg} flex items-center justify-center text-2xl`}>
                    {kpi.icon}
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${kpi.textColor}`}>{kpi.value}</div>
                    <div className="text-sm text-gray-600">{kpi.label}</div>
                  </div>
                </div>
              </div>
            );

            return kpi.link ? (
              <Link key={kpi.label} href={kpi.link}>
                {card}
              </Link>
            ) : (
              <div key={kpi.label}>{card}</div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/comunidades/nueva"
              className="flex items-center gap-3 p-4 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl">➕</span>
              <div>
                <div className="font-medium text-blue-700">Nueva comunidad</div>
                <div className="text-sm text-gray-500">Registrar nueva finca</div>
              </div>
            </Link>
            <Link
              href="/comunidades"
              className="flex items-center gap-3 p-4 border-2 border-dashed border-green-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <span className="text-2xl">🔍</span>
              <div>
                <div className="font-medium text-green-700">Ver comunidades</div>
                <div className="text-sm text-gray-500">Gestionar todas las fincas</div>
              </div>
            </Link>
            <Link
              href="/alertas"
              className="flex items-center gap-3 p-4 border-2 border-dashed border-red-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition-colors"
            >
              <span className="text-2xl">🔔</span>
              <div>
                <div className="font-medium text-red-700">Centro de alertas</div>
                <div className="text-sm text-gray-500">Revisar incidencias</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Progress bar */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Estado documental global</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${data.completionPct}%` }}
              />
            </div>
            <span className="text-lg font-bold text-green-700 min-w-[4rem] text-right">
              {data.completionPct}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Porcentaje de documentos marcados como completados en todas las comunidades.
          </p>
        </div>
      </main>
    </div>
  );
}
