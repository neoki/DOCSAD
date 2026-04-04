"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PendienteItem {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  missing: string[];
  present: string[];
  fileCount: number;
  coverage: number;
}

const COVERAGE_COLORS: Record<string, string> = {
  high: "#22c55e",
  medium: "#f59e0b",
  low: "#dc2626",
};

function getCoverageColor(coverage: number): string {
  if (coverage >= 70) return COVERAGE_COLORS.high;
  if (coverage >= 40) return COVERAGE_COLORS.medium;
  return COVERAGE_COLORS.low;
}

export default function PendientesPage() {
  const [items, setItems] = useState<PendienteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCommunities, setTotalCommunities] = useState(0);
  const [withIssues, setWithIssues] = useState(0);
  const [standardSubfolders, setStandardSubfolders] = useState<string[]>([]);
  const [filterSubfolder, setFilterSubfolder] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const params = filterSubfolder ? `?subfolder=${filterSubfolder}` : "";
    fetch(`/api/pendientes${params}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items || []);
        setTotalCommunities(data.totalCommunities || 0);
        setWithIssues(data.withIssues || 0);
        setStandardSubfolders(data.standardSubfolders || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterSubfolder]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/exportar?tipo=pendientes");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe_documentacion_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Cargando análisis...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Documentación pendiente</h1>
          <p className="page-subtitle">
            {withIssues} de {totalCommunities} comunidades vinculadas tienen subcarpetas incompletas
          </p>
        </div>
        <button onClick={exportCSV} disabled={exporting} className="btn-primary" style={{ minWidth: 160 }}>
          {exporting ? "Exportando..." : "Exportar CSV"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: "#4F7CFF" }}>{totalCommunities}</div>
          <div className="kpi-label">Total vinculadas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: "#dc2626" }}>{withIssues}</div>
          <div className="kpi-label">Con pendientes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: "#22c55e" }}>{totalCommunities - withIssues}</div>
          <div className="kpi-label">Completas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value" style={{ color: "#8B5CF6" }}>
            {totalCommunities > 0 ? Math.round(((totalCommunities - withIssues) / totalCommunities) * 100) : 0}%
          </div>
          <div className="kpi-label">Cobertura global</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-gray-500">Filtrar por subcarpeta faltante:</span>
          <select
            value={filterSubfolder}
            onChange={(e) => setFilterSubfolder(e.target.value)}
            className="form-input"
            style={{ width: 200 }}
          >
            <option value="">Todas</option>
            {standardSubfolders.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            {filterSubfolder
              ? `Todas las comunidades tienen la subcarpeta ${filterSubfolder}`
              : "Todas las comunidades tienen documentación completa"}
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 font-semibold text-gray-500">Código</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500">Comunidad</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-500">Archivos</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-500">Cobertura</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-500">Subcarpetas faltantes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 font-mono text-gray-400">{item.codigo}</td>
                  <td className="py-2 px-2">
                    <Link href={`/comunidades/${item.id}`} className="text-blue-600 hover:underline">
                      {item.nombre}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-center text-gray-600">{item.fileCount}</td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${item.coverage}%`, background: getCoverageColor(item.coverage) }}
                        />
                      </div>
                      <span className="font-mono" style={{ color: getCoverageColor(item.coverage) }}>
                        {item.coverage}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-1">
                      {item.missing.slice(0, 5).map((m) => (
                        <span
                          key={m}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                          style={{ background: "#fef2f2", color: "#dc2626" }}
                        >
                          {m}
                        </span>
                      ))}
                      {item.missing.length > 5 && (
                        <span className="text-[9px] text-gray-400">+{item.missing.length - 5}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
