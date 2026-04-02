"use client";

import { useState, useEffect } from "react";

interface SubfolderInfo {
  count: number;
  sizeBytes: number;
}

interface RecentFile {
  name: string;
  subfolder: string | null;
  sizeBytes: number;
  modified: string | null;
}

interface DocInsights {
  totalFiles: number;
  totalSize: number;
  subfolderCounts: Record<string, SubfolderInfo>;
  missingSubfolders: string[];
  mimeGroups: Record<string, number>;
  recentFiles: RecentFile[];
  oldFilesCount: number;
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const EXT_COLORS: Record<string, string> = {
  pdf: "#dc2626",
  doc: "#2563eb",
  docx: "#2563eb",
  xls: "#16a34a",
  xlsx: "#16a34a",
  jpg: "#f59e0b",
  jpeg: "#f59e0b",
  png: "#f59e0b",
  tif: "#f59e0b",
  tiff: "#f59e0b",
};

export default function ResumenDocTab({ comunidadId }: { comunidadId: string }) {
  const [data, setData] = useState<DocInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comunidades/${comunidadId}/docs-insights`)
      .then((r) => {
        if (!r.ok) throw new Error("Error loading insights");
        return r.json();
      })
      .then((d) => {
        if (d.error || !d.subfolderCounts) throw new Error(d.error || "Invalid data");
        setData(d);
        setLoading(false);
      })
      .catch(() => { setData(null); setLoading(false); });
  }, [comunidadId]);

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Cargando análisis...</div>;
  if (!data) return <div className="text-sm text-red-500 py-8 text-center">Error al cargar datos.</div>;
  if (data.totalFiles === 0) {
    return (
      <div className="card-static py-12 text-center">
        <p className="text-gray-500 text-sm mb-2">No hay archivos sincronizados para esta comunidad.</p>
        <p className="text-gray-400 text-xs">Ejecuta la sincronización desde el Dashboard para importar metadatos de SharePoint.</p>
      </div>
    );
  }

  const subfolderEntries = Object.entries(data.subfolderCounts).sort((a, b) => b[1].count - a[1].count);
  const maxSubfolderCount = Math.max(...subfolderEntries.map(([, v]) => v.count));
  const extEntries = Object.entries(data.mimeGroups).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxExtCount = Math.max(...extEntries.map(([, v]) => v));

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="kpi-card" style={{ borderLeft: "4px solid #4F7CFF" }}>
          <div>
            <div className="kpi-value" style={{ color: "#4F7CFF" }}>{data.totalFiles}</div>
            <div className="kpi-label">Archivos</div>
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #06b6d4" }}>
          <div>
            <div className="kpi-value" style={{ color: "#06b6d4" }}>{formatSize(data.totalSize)}</div>
            <div className="kpi-label">Tamaño total</div>
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeft: `4px solid ${data.missingSubfolders.length > 0 ? "#f59e0b" : "#22c55e"}` }}>
          <div>
            <div className="kpi-value" style={{ color: data.missingSubfolders.length > 0 ? "#f59e0b" : "#22c55e" }}>
              {Object.keys(data.subfolderCounts).length}/11
            </div>
            <div className="kpi-label">Subcarpetas</div>
          </div>
        </div>
        <div className="kpi-card" style={{ borderLeft: `4px solid ${data.oldFilesCount > 0 ? "#f59e0b" : "#22c55e"}` }}>
          <div>
            <div className="kpi-value" style={{ color: data.oldFilesCount > 0 ? "#f59e0b" : "#22c55e" }}>
              {data.oldFilesCount}
            </div>
            <div className="kpi-label">Antiguos (+1 año)</div>
          </div>
        </div>
      </div>

      {data.missingSubfolders.length > 0 && (
        <div className="card-static mb-5" style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb", padding: "12px 16px" }}>
          <div className="text-sm font-semibold text-amber-700 mb-1">Subcarpetas estándar faltantes</div>
          <div className="flex flex-wrap gap-2">
            {data.missingSubfolders.map((sf) => (
              <span key={sf} className="px-2 py-1 rounded text-xs font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                {sf}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="card">
          <div className="section-label mb-3">Distribución por subcarpeta</div>
          <div className="flex flex-col gap-2">
            {subfolderEntries.map(([name, info]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-medium" style={{ width: 150, flexShrink: 0 }}>
                  {name}
                </span>
                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(info.count / maxSubfolderCount) * 100}%`, background: "linear-gradient(90deg, #4F7CFF, #8B5CF6)", minWidth: 2 }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-mono" style={{ width: 40, textAlign: "right" }}>
                  {info.count}
                </span>
                <span className="text-xs text-gray-400" style={{ width: 60, textAlign: "right" }}>
                  {formatSize(info.sizeBytes)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-label mb-3">Tipos de archivo</div>
          <div className="flex flex-col gap-2">
            {extEntries.map(([ext, count]) => (
              <div key={ext} className="flex items-center gap-3">
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{
                    width: 50,
                    textAlign: "center",
                    flexShrink: 0,
                    background: `${EXT_COLORS[ext] || "#64748b"}15`,
                    color: EXT_COLORS[ext] || "#64748b",
                  }}
                >
                  .{ext}
                </span>
                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{ width: `${(count / maxExtCount) * 100}%`, background: EXT_COLORS[ext] || "#94a3b8", minWidth: 2 }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-mono" style={{ width: 40, textAlign: "right" }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-label mb-3">Archivos más recientes</div>
        <div className="flex flex-col gap-1" style={{ maxHeight: 300, overflowY: "auto" }}>
          {data.recentFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-gray-50">
              <span className="font-mono text-gray-400" style={{ width: 75, flexShrink: 0 }}>
                {formatDate(f.modified)}
              </span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: "#ede9fe", color: "#6d28d9", flexShrink: 0 }}
              >
                {f.subfolder || "raíz"}
              </span>
              <span className="text-gray-700 truncate flex-1" title={f.name}>{f.name}</span>
              <span className="text-gray-400" style={{ flexShrink: 0, width: 60, textAlign: "right" }}>
                {formatSize(f.sizeBytes)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
