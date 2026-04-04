"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  id: string;
  operation: string;
  status: string;
  fileName: string | null;
  filePath: string | null;
  details: string | null;
  error: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days}d`;
  const months = Math.floor(days / 30);
  return `Hace ${months} meses`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const OP_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  sync_file: { label: "Sincronizado", color: "#2563eb", bg: "#dbeafe" },
  upload: { label: "Subido", color: "#16a34a", bg: "#dcfce7" },
  delete: { label: "Eliminado", color: "#dc2626", bg: "#fee2e2" },
  move: { label: "Movido", color: "#f59e0b", bg: "#fef3c7" },
  classify: { label: "Clasificado", color: "#8B5CF6", bg: "#ede9fe" },
};

export default function HistorialTab({ comunidadId }: { comunidadId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comunidades/${comunidadId}/historial`)
      .then((r) => {
        if (!r.ok) throw new Error("Error");
        return r.json();
      })
      .then((data) => { setLogs(data.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [comunidadId]);

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Cargando historial...</div>;

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        Sin actividad registrada para esta comunidad.
      </div>
    );
  }

  return (
    <div>
      <div className="section-label mb-3">Historial de cambios ({logs.length})</div>
      <div className="flex flex-col gap-0" style={{ maxHeight: 500, overflowY: "auto" }}>
        {logs.map((log, i) => {
          const opDef = OP_LABELS[log.operation] || { label: log.operation, color: "#64748b", bg: "#f1f5f9" };
          return (
            <div key={log.id} className="flex items-start gap-3 relative pl-6 pb-4">
              <div
                className="absolute left-2 top-1.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ borderColor: opDef.color, background: log.status === "error" ? "#dc2626" : opDef.color }}
              />
              {i < logs.length - 1 && (
                <div className="absolute left-[11px] top-4 bottom-0 w-px bg-gray-200" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: opDef.bg, color: opDef.color }}
                  >
                    {opDef.label}
                  </span>
                  {log.status === "error" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">
                      ERROR
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400" title={formatDate(log.createdAt)}>
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
                <div className="text-xs text-gray-700">
                  {log.fileName && <span className="font-medium">{log.fileName}</span>}
                  {log.details && <span className="text-gray-500 ml-1">— {log.details}</span>}
                  {log.error && <span className="text-red-500 ml-1">— {log.error}</span>}
                </div>
                {log.filePath && (
                  <div className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{log.filePath}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
