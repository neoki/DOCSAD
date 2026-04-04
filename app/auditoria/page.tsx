"use client";

import { useState, useEffect } from "react";

type AuditEntry = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  create: { bg: "#dcfce7", color: "#16a34a" },
  update: { bg: "#dbeafe", color: "#2563eb" },
  delete: { bg: "#fee2e2", color: "#dc2626" },
  login: { bg: "#fef3c7", color: "#d97706" },
  sync: { bg: "#ede9fe", color: "#7c3aed" },
  upload: { bg: "#d1fae5", color: "#059669" },
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (filterEntity) params.set("entity", filterEntity);
    fetch(`/api/auditoria?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filterEntity]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Log de auditoría</h1>
          <p className="page-subtitle">{total} registros de actividad</p>
        </div>
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          className="form-input"
          style={{ width: 200 }}
        >
          <option value="">Todas las entidades</option>
          <option value="user">Usuarios</option>
          <option value="comunidad">Comunidades</option>
          <option value="nota">Notas</option>
          <option value="sync">Sincronización</option>
          <option value="upload">Subidas</option>
          <option value="checklist">Checklist</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando...</div>
      ) : logs.length === 0 ? (
        <div className="card text-center text-gray-400 py-12">
          No hay registros de auditoría todavía
        </div>
      ) : (
        <div className="card-static p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left" style={{ width: 70 }}>Tiempo</th>
                <th className="table-header text-left" style={{ width: 150 }}>Usuario</th>
                <th className="table-header text-left" style={{ width: 80 }}>Acción</th>
                <th className="table-header text-left" style={{ width: 100 }}>Entidad</th>
                <th className="table-header text-left">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const style = ACTION_COLORS[log.action] || { bg: "#f1f5f9", color: "#64748b" };
                return (
                  <tr key={log.id} className="table-row">
                    <td className="table-cell text-xs text-gray-400 font-mono">{timeAgo(log.createdAt)}</td>
                    <td className="table-cell text-xs text-gray-600">{log.userEmail || "-"}</td>
                    <td className="table-cell">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-600">{log.entity}</td>
                    <td className="table-cell text-xs text-gray-500 truncate" style={{ maxWidth: 300 }}>
                      {log.details || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm rounded border disabled:opacity-30"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm rounded border disabled:opacity-30"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
