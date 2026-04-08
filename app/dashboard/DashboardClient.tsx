"use client";

import { useState, useEffect, useRef } from "react";
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

function parseLastSyncChanges(logs: LogEntry[]): string | null {
  const last = logs.find(
    (l) => (l.operation === "incremental_sync" || l.operation === "full_sync") && l.status === "success" && l.details
  );
  if (!last?.details) return null;
  const m = last.details.match(/Added (\d+), updated (\d+), removed (\d+)/);
  if (!m) return null;
  const added = parseInt(m[1]);
  const updated = parseInt(m[2]);
  const removed = parseInt(m[3]);
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added} nuevos`);
  if (updated > 0) parts.push(`${updated} modificados`);
  if (removed > 0) parts.push(`${removed} eliminados`);
  if (parts.length === 0) return "Sin cambios";
  return parts.join(", ");
}

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface TrendMonth {
  month: string;
  added: number;
  updated: number;
  removed: number;
  uploaded: number;
}

export default function DashboardClient({ comunidades, syncStats, docInsights, recentLogs }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [trends, setTrends] = useState<TrendMonth[]>([]);
  const [liveStatus, setLiveStatus] = useState<"idle" | "running" | null>(null);
  const [liveCompletedAt, setLiveCompletedAt] = useState<string | null>(null);
  const [liveLogs, setLiveLogs] = useState<LogEntry[]>(recentLogs);
  const wasRunningRef = useRef(false);
  const lastAutoSyncRef = useRef<number>(0);

  const linked = comunidades.filter((c) => c.linked).length;
  const withFiles = comunidades.filter((c) => c.fileCount > 0).length;
  const noFiles = linked - withFiles;

  const completedAt = liveCompletedAt || syncStats.lastSync;
  const lastSyncChanges = parseLastSyncChanges(liveLogs);

  const triggerAutoSync = async () => {
    const now = Date.now();
    if (now - lastAutoSyncRef.current < AUTO_SYNC_INTERVAL_MS) return;
    lastAutoSyncRef.current = now;
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "incremental" }),
      });
    } catch { /* silently ignore */ }
  };

  useEffect(() => {
    fetch("/api/alertas")
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => {});
    fetch("/api/tendencias")
      .then((r) => r.json())
      .then((data) => setTrends(data.monthly || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch("/api/sync?action=status"),
          fetch("/api/sync?action=logs&limit=20"),
        ]);
        const statusData = await statusRes.json();
        const logsData = await logsRes.json();

        const isRunning = statusData.status === "running";
        setLiveStatus(isRunning ? "running" : "idle");
        setLiveLogs(logsData.logs || []);
        if (statusData.completedAt) setLiveCompletedAt(statusData.completedAt);

        if (!isRunning) {
          if (wasRunningRef.current) {
            // just finished — reload to refresh stats
            setTimeout(() => window.location.reload(), 1500);
          }
          // Auto-trigger incremental sync if >5 min since last completion
          const lastDone = statusData.completedAt || syncStats.lastSync;
          const msSinceSync = lastDone ? Date.now() - new Date(lastDone).getTime() : Infinity;
          if (msSinceSync > AUTO_SYNC_INTERVAL_MS) {
            triggerAutoSync();
          }
        }
        wasRunningRef.current = isRunning;
      } catch { /* silently ignore */ }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Panel de control</h1>
          <p className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {liveStatus === "running" ? (
              <>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #3b82f6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                <span>Sincronizando con SharePoint...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : completedAt ? (
              <>
                <span style={{ color: "#22c55e", fontSize: 8 }}>●</span>
                <span>Última sincronización: {timeAgo(completedAt)}</span>
                {lastSyncChanges && (
                  <span style={{ color: "#94a3b8" }}>· {lastSyncChanges}</span>
                )}
              </>
            ) : (
              <span>Iniciando sincronización automática...</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/informe"
            className="btn-primary"
            style={{ minWidth: 140, textDecoration: "none", background: "#6d28d9", textAlign: "center" }}
          >
            Informe ejecutivo
          </a>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 mb-6">
        {[
          { label: "Comunidades", value: syncStats.totalComunidades, color: "#4F7CFF" },
          { label: "En SharePoint", value: linked, color: "#22c55e" },
          { label: "Con documentos", value: withFiles, color: "#8B5CF6" },
          { label: "Archivos", value: syncStats.totalFiles.toLocaleString("es-ES"), color: "#f59e0b" },
          { label: "Tamaño total", value: formatSize(syncStats.totalSizeBytes), color: "#06b6d4" },
          { label: "Sin docs nuevos (3 meses)", value: docInsights.staleCommunityCount, color: docInsights.staleCommunityCount > 0 ? "#dc2626" : "#22c55e" },
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
            <p className="text-sm text-gray-400">Sin actividad reciente registrada.</p>
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
            <p className="text-sm text-gray-400">Sin datos disponibles.</p>
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
                : "Sin datos disponibles."}
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
              {noFiles} comunidades vinculadas sin archivos
            </p>
          )}
        </div>
      </div>

      {trends.length > 0 && (
        <div className="card mb-6">
          <div className="section-label mb-3">Tendencia de actividad (últimos 6 meses)</div>
          <div className="flex items-end gap-1" style={{ height: 120 }}>
            {(() => {
              const maxVal = Math.max(...trends.map((t) => t.added + t.updated + t.uploaded), 1);
              return trends.map((t) => {
                const total = t.added + t.updated + t.uploaded;
                const height = Math.max((total / maxVal) * 100, 2);
                const monthLabel = t.month.split("-")[1];
                const monthNames: Record<string, string> = {
                  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
                  "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
                  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
                };
                return (
                  <div key={t.month} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                    <div style={{ width: "100%", height: 100, display: "flex", alignItems: "flex-end" }}>
                      <div
                        style={{ width: "100%", height: `${height}%`, background: "linear-gradient(180deg, #4F7CFF, #8B5CF6)", borderRadius: "3px 3px 0 0", minHeight: 2 }}
                        title={`${total} cambios`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{monthNames[monthLabel] || monthLabel}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
