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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  sync: "Sync",
  upload: "Subida",
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  login: { bg: "#fef3c7", color: "#d97706" },
  create: { bg: "#dcfce7", color: "#16a34a" },
  update: { bg: "#dbeafe", color: "#2563eb" },
  delete: { bg: "#fee2e2", color: "#dc2626" },
  sync: { bg: "#ede9fe", color: "#7c3aed" },
  upload: { bg: "#d1fae5", color: "#059669" },
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuario",
  comunidad: "Comunidad",
  nota: "Nota",
  sync: "Sincronización",
  upload: "Subida",
  checklist: "Checklist",
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (filterEntity) params.set("entity", filterEntity);
    if (filterAction) params.set("action", filterAction);
    fetch(`/api/auditoria?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filterEntity, filterAction]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">
            Registro de actividad del sistema — logins, syncs con SharePoint y cambios de usuarios
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="form-input"
            style={{ width: 150 }}
          >
            <option value="">Todas las acciones</option>
            <option value="login">Login</option>
            <option value="sync">Sync</option>
            <option value="create">Crear</option>
            <option value="update">Editar</option>
            <option value="delete">Eliminar</option>
          </select>
          <select
            value={filterEntity}
            onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
            className="form-input"
            style={{ width: 160 }}
          >
            <option value="">Todo</option>
            <option value="user">Usuarios</option>
            <option value="sync">Sincronización</option>
            <option value="comunidad">Comunidades</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Cargando...</div>
      ) : logs.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-gray-500 font-medium mb-1">
            {total === 0 ? "Aún no hay registros de actividad" : "No hay resultados para este filtro"}
          </div>
          <div className="text-gray-400 text-sm">
            Los logins de usuarios y las sincronizaciones con SharePoint se registrarán aquí automáticamente
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">{total} registros{filterAction || filterEntity ? " (filtrado)" : ""}</p>
          <div className="card-static p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left" style={{ width: 140 }}>Fecha</th>
                  <th className="table-header text-left" style={{ width: 50 }}>Hace</th>
                  <th className="table-header text-left" style={{ width: 180 }}>Usuario</th>
                  <th className="table-header text-left" style={{ width: 90 }}>Acción</th>
                  <th className="table-header text-left">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = ACTION_COLORS[log.action] || { bg: "#f1f5f9", color: "#64748b" };
                  return (
                    <tr key={log.id} className="table-row">
                      <td className="table-cell text-xs text-gray-500 font-mono whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="table-cell text-xs text-gray-400">{timeAgo(log.createdAt)}</td>
                      <td className="table-cell text-xs text-gray-600 truncate" style={{ maxWidth: 180 }}>
                        {log.userEmail || <span className="text-gray-400 italic">Sistema</span>}
                      </td>
                      <td className="table-cell">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-500" style={{ maxWidth: 400 }}>
                        {log.details || (ENTITY_LABELS[log.entity] || log.entity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
