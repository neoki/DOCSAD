"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ComunidadData {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  linked: boolean;
  folderName: string | null;
  matchMethod: string | null;
  fileCount: number;
}

interface SyncStats {
  totalFiles: number;
  totalFolders: number;
  totalSizeBytes: number;
  totalComunidades: number;
  linkedComunidades: number;
  communitiesWithFiles: number;
  lastSync: string | null;
  syncStatus: string | null;
  subfolderStats: { subfolder: string | null; fileCount: number; sizeBytes: number }[];
}

interface CoverageItem {
  comunidadId: string;
  codigo: string;
  nombre: string;
  missing: string[];
  fileCount: number;
}

interface RecentFile {
  name: string;
  subfolder: string | null;
  sizeBytes: number;
  modified: string | null;
  comunidad: string | null;
}

interface DocInsights {
  subfolderCoverage: CoverageItem[];
  recentActivity: RecentFile[];
  staleCommunityCount: number;
  totalLinked: number;
}

interface LogEntry {
  id: string;
  operation: string;
  status: string;
  fileName: string | null;
  details: string | null;
  error: string | null;
  createdAt: string;
}

interface AlertItem {
  id: string;
  comunidadId: string;
  codigo: string;
  nombre: string;
  tipo: string;
  fecha: string;
  diasRestantes: number;
  urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
}

interface Props {
  comunidades: ComunidadData[];
  syncStats: SyncStats;
  docInsights: DocInsights;
  recentLogs: LogEntry[];
}

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardClient({ comunidades, syncStats, docInsights, recentLogs }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    added?: number;
    updated?: number;
    removed?: number;
    errors?: number;
  } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    fetch("/api/alertas")
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => {});
  }, []);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError("");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setSyncError(data.error);
      } else {
        setSyncResult(data.result);
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setSyncError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  const linked = comunidades.filter((c) => c.linked).length;
  const withFiles = comunidades.filter((c) => c.fileCount > 0).length;
  const noFiles = linked - withFiles;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle">
            {syncStats.lastSync
              ? `Última sincronización: ${timeAgo(syncStats.lastSync)}`
              : "Sin sincronizar todavía — pulsa Sincronizar para empezar"}
          </p>
        </div>
        <button
          onClick={runSync}
          disabled={syncing}
          className="btn-primary"
          style={{ minWidth: 180 }}
        >
          {syncing ? "Sincronizando..." : "Sincronizar ahora"}
        </button>
      </div>

      {syncResult && (
        <div className="card-static mb-4" style={{ borderLeft: "4px solid #22c55e", padding: "12px 16px", background: "#f0fdf4" }}>
          <span className="text-sm font-semibold text-green-700">
            Sincronización completada — {syncResult.added} nuevos, {syncResult.updated} actualizados, {syncResult.removed} eliminados
            {(syncResult.errors ?? 0) > 0 && `, ${syncResult.errors} errores`}
          </span>
        </div>
      )}
      {syncError && (
        <div className="card-static mb-4" style={{ borderLeft: "4px solid #dc2626", padding: "12px 16px", background: "#fef2f2" }}>
          <span className="text-sm font-semibold text-red-700">{syncError}</span>
        </div>
      )}

      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          { label: "Comunidades", value: syncStats.totalComunidades, color: "#4F7CFF" },
          { label: "Vinculadas SP", value: linked, color: "#22c55e" },
          { label: "Con archivos", value: withFiles, color: "#8B5CF6" },
          { label: "Archivos", value: syncStats.totalFiles.toLocaleString("es-ES"), color: "#f59e0b" },
          { label: "Tamaño total", value: formatSize(syncStats.totalSizeBytes), color: "#06b6d4" },
          { label: "Sin actividad 3m", value: docInsights.staleCommunityCount, color: docInsights.staleCommunityCount > 0 ? "#dc2626" : "#22c55e" },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div>
              <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="section-label">Alertas y vencimientos</div>
            <span className="text-xs text-gray-400">{alerts.length} vencimientos en los próximos 12 meses</span>
          </div>
          <div className="flex flex-col gap-1" style={{ maxHeight: 240, overflowY: "auto" }}>
            {alerts.map((a) => {
              const urgColors: Record<string, { bg: string; color: string; label: string }> = {
                CRITICA: { bg: "#fef2f2", color: "#dc2626", label: "VENCIDO" },
                ALTA: { bg: "#fff7ed", color: "#ea580c", label: "URGENTE" },
                MEDIA: { bg: "#fefce8", color: "#ca8a04", label: "PRONTO" },
                BAJA: { bg: "#f0fdf4", color: "#16a34a", label: "OK" },
              };
              const urg = urgColors[a.urgencia] || urgColors.BAJA;
              return (
                <Link
                  key={a.id}
                  href={`/comunidades/${a.comunidadId}`}
                  className="flex items-center gap-3 text-xs py-2 px-2 rounded hover:bg-gray-50 group"
                  style={{ textDecoration: "none" }}
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{ background: urg.bg, color: urg.color, flexShrink: 0, minWidth: 60, textAlign: "center" }}
                  >
                    {urg.label}
                  </span>
                  <span className="text-gray-700 group-hover:text-blue-600 truncate" style={{ width: 200, flexShrink: 0 }}>
                    {a.codigo} - {a.nombre}
                  </span>
                  <span className="text-gray-500 flex-1 truncate">{a.tipo}</span>
                  <span className="font-mono text-gray-400" style={{ flexShrink: 0, width: 90, textAlign: "right" }}>
                    {formatDate(a.fecha)}
                  </span>
                  <span className="font-mono" style={{ color: urg.color, flexShrink: 0, width: 80, textAlign: "right" }}>
                    {a.diasRestantes < 0 ? `${Math.abs(a.diasRestantes)}d vencido` : `${a.diasRestantes}d`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="section-label mb-3">Actividad reciente en SharePoint</div>
          {docInsights.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos. Ejecuta la sincronización.</p>
          ) : (
            <div className="flex flex-col gap-1" style={{ maxHeight: 340, overflowY: "auto" }}>
              {docInsights.recentActivity.map((f, i) => (
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
                  <span className="text-gray-400 truncate" style={{ maxWidth: 160, flexShrink: 0 }}>
                    {f.comunidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-3">Documentos por subcarpeta</div>
          {syncStats.subfolderStats.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos. Ejecuta la sincronización.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {syncStats.subfolderStats
                .sort((a, b) => b.fileCount - a.fileCount)
                .map((s) => {
                  const maxCount = Math.max(...syncStats.subfolderStats.map((x) => x.fileCount));
                  const pct = maxCount > 0 ? (s.fileCount / maxCount) * 100 : 0;
                  return (
                    <div key={s.subfolder || "root"} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 font-medium" style={{ width: 160, flexShrink: 0 }}>
                        {s.subfolder || "(raíz)"}
                      </span>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #4F7CFF, #8B5CF6)", minWidth: 2 }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-mono" style={{ width: 55, textAlign: "right" }}>
                        {s.fileCount.toLocaleString("es-ES")}
                      </span>
                      <span className="text-xs text-gray-400" style={{ width: 60, textAlign: "right" }}>
                        {formatSize(s.sizeBytes)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="card">
          <div className="section-label mb-3">
            Comunidades con subcarpetas incompletas
            {docInsights.subfolderCoverage.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({docInsights.subfolderCoverage.length} comunidades)
              </span>
            )}
          </div>
          {docInsights.subfolderCoverage.length === 0 ? (
            <p className="text-sm text-gray-400">
              {syncStats.totalFiles > 0
                ? "Todas las comunidades tienen sus subcarpetas estándar completas."
                : "Sin datos. Ejecuta la sincronización."}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5" style={{ maxHeight: 300, overflowY: "auto" }}>
              {docInsights.subfolderCoverage.map((c) => (
                <Link
                  key={c.comunidadId}
                  href={`/comunidades/${c.comunidadId}`}
                  className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-gray-50 group"
                  style={{ textDecoration: "none" }}
                >
                  <span className="font-mono text-gray-400" style={{ width: 50, flexShrink: 0 }}>
                    {c.codigo}
                  </span>
                  <span className="text-gray-700 truncate group-hover:text-blue-600" style={{ width: 140, flexShrink: 0 }}>
                    {c.nombre}
                  </span>
                  <span className="text-gray-500" style={{ width: 40, textAlign: "center", flexShrink: 0 }}>
                    {c.fileCount}
                  </span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {c.missing.slice(0, 4).map((m) => (
                      <span
                        key={m}
                        className="px-1 py-0.5 rounded text-[9px] font-medium"
                        style={{ background: "#fef2f2", color: "#dc2626" }}
                      >
                        {m}
                      </span>
                    ))}
                    {c.missing.length > 4 && (
                      <span className="text-[9px] text-gray-400">+{c.missing.length - 4}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-3">Top comunidades por archivos</div>
          {(() => {
            const topCommunities = [...comunidades]
              .filter((c) => c.fileCount > 0)
              .sort((a, b) => b.fileCount - a.fileCount)
              .slice(0, 12);
            if (topCommunities.length === 0)
              return <p className="text-sm text-gray-400">Sin datos.</p>;
            const maxCount = topCommunities[0]?.fileCount || 1;
            return (
              <div className="flex flex-col gap-1.5" style={{ maxHeight: 300, overflowY: "auto" }}>
                {topCommunities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/comunidades/${c.id}`}
                    className="flex items-center gap-2 text-xs group"
                    style={{ textDecoration: "none" }}
                  >
                    <span className="font-mono text-gray-400" style={{ width: 50, flexShrink: 0 }}>
                      {c.codigo}
                    </span>
                    <span className="text-gray-700 truncate group-hover:text-blue-600" style={{ width: 130, flexShrink: 0 }}>
                      {c.nombre}
                    </span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{ width: `${(c.fileCount / maxCount) * 100}%`, background: "#22c55e", minWidth: 2 }}
                      />
                    </div>
                    <span className="font-mono text-gray-500" style={{ width: 40, textAlign: "right" }}>
                      {c.fileCount}
                    </span>
                  </Link>
                ))}
              </div>
            );
          })()}
          {noFiles > 0 && (
            <p className="text-xs text-amber-600 mt-3">
              {noFiles} comunidades vinculadas sin archivos sincronizados
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-label mb-3">Historial de sincronización</div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400">Sin actividad registrada.</p>
        ) : (
          <div className="flex flex-col gap-1" style={{ maxHeight: 250, overflowY: "auto" }}>
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded hover:bg-gray-50">
                <span
                  className="font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: log.status === "success" ? "#dcfce7" : log.status === "error" ? "#fee2e2" : "#f1f5f9",
                    color: log.status === "success" ? "#16a34a" : log.status === "error" ? "#dc2626" : "#64748b",
                    flexShrink: 0,
                  }}
                >
                  {log.status === "success" ? "OK" : log.status === "error" ? "ERR" : log.status.toUpperCase()}
                </span>
                <span className="text-gray-500 font-mono" style={{ width: 120, flexShrink: 0 }}>
                  {log.operation}
                </span>
                <span className="text-gray-700 truncate flex-1">
                  {log.details || log.fileName || log.error || "-"}
                </span>
                <span className="text-gray-400" style={{ flexShrink: 0 }}>
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
