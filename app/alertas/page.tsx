"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";

type Alerta = {
  id: string;
  comunidadId: string;
  tipo: string;
  urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
  titulo: string;
  descripcion: string;
  descartada: boolean;
  createdAt: string;
};

const URGENCIA_CONFIG = {
  CRITICA: {
    label: "Crítica",
    icon: "🚨",
    badgeClass: "badge-critica",
    borderClass: "border-l-red-500",
    bgClass: "bg-red-50",
  },
  ALTA: {
    label: "Alta",
    icon: "⚠️",
    badgeClass: "badge-alta",
    borderClass: "border-l-orange-500",
    bgClass: "bg-orange-50",
  },
  MEDIA: {
    label: "Media",
    icon: "📋",
    badgeClass: "badge-media",
    borderClass: "border-l-yellow-500",
    bgClass: "bg-yellow-50",
  },
  BAJA: {
    label: "Baja",
    icon: "ℹ️",
    badgeClass: "badge-baja",
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-50",
  },
};

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgencia, setFilterUrgencia] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [dismissing, setDismissing] = useState<string | null>(null);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/alertas");
    if (res.ok) {
      setAlertas(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  async function handleDismiss(alerta: Alerta) {
    setDismissing(alerta.id);
    await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comunidadId: alerta.comunidadId,
        tipo: alerta.tipo,
        urgencia: alerta.urgencia,
        titulo: alerta.titulo,
        descripcion: alerta.descripcion,
        descartada: true,
      }),
    });
    setDismissing(null);
    setAlertas((prev) => prev.filter((a) => a.id !== alerta.id));
  }

  const tipos = [...new Set(alertas.map((a) => a.tipo))];

  const filtered = alertas.filter((a) => {
    if (filterUrgencia !== "all" && a.urgencia !== filterUrgencia) return false;
    if (filterTipo !== "all" && a.tipo !== filterTipo) return false;
    return true;
  });

  const stats = {
    CRITICA: alertas.filter((a) => a.urgencia === "CRITICA").length,
    ALTA: alertas.filter((a) => a.urgencia === "ALTA").length,
    MEDIA: alertas.filter((a) => a.urgencia === "MEDIA").length,
    BAJA: alertas.filter((a) => a.urgencia === "BAJA").length,
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Centro de Alertas</h1>
            <p className="text-gray-500 mt-1">
              Alertas generadas automáticamente a partir del estado actual de las comunidades.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {(["CRITICA", "ALTA", "MEDIA", "BAJA"] as const).map((u) => {
              const cfg = URGENCIA_CONFIG[u];
              return (
                <button
                  key={u}
                  onClick={() => setFilterUrgencia(filterUrgencia === u ? "all" : u)}
                  className={`card text-center cursor-pointer transition-all hover:shadow-md ${
                    filterUrgencia === u ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="text-2xl mb-1">{cfg.icon}</div>
                  <div className="text-2xl font-bold text-gray-900">{stats[u]}</div>
                  <div className={`text-xs font-medium mt-1 ${cfg.badgeClass} inline-block px-2 py-0.5 rounded-full`}>
                    {cfg.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <div className="card mb-6 flex gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Urgencia</label>
              <select
                value={filterUrgencia}
                onChange={(e) => setFilterUrgencia(e.target.value)}
                className="input-field py-1.5 text-sm"
              >
                <option value="all">Todas</option>
                {(["CRITICA", "ALTA", "MEDIA", "BAJA"] as const).map((u) => (
                  <option key={u} value={u}>
                    {URGENCIA_CONFIG[u].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="input-field py-1.5 text-sm"
              >
                <option value="all">Todos</option>
                {tipos.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAlertas}
                className="btn-secondary text-sm py-1.5"
              >
                🔄 Regenerar alertas
              </button>
            </div>
          </div>

          {/* Alert list */}
          {loading ? (
            <div className="text-center text-gray-500 py-12">Cargando alertas...</div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-xl font-semibold text-gray-700">
                {alertas.length === 0 ? "Sin alertas activas" : "No hay alertas con los filtros aplicados"}
              </div>
              <p className="text-gray-500 mt-2 text-sm">
                {alertas.length === 0
                  ? "Todas las comunidades están en orden."
                  : "Prueba a cambiar los filtros."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((alerta) => {
                const cfg = URGENCIA_CONFIG[alerta.urgencia];
                return (
                  <div
                    key={alerta.id}
                    className={`card border-l-4 ${cfg.borderClass} flex items-start gap-4`}
                  >
                    <div className="text-2xl flex-shrink-0">{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <span className={`${cfg.badgeClass} mr-2`}>{cfg.label}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {alerta.tipo}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-1">{alerta.titulo}</h3>
                      <p className="text-sm text-gray-600 mt-1">{alerta.descripcion}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(alerta)}
                      disabled={dismissing === alerta.id}
                      className="flex-shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-red-200"
                    >
                      {dismissing === alerta.id ? "..." : "Descartar"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
