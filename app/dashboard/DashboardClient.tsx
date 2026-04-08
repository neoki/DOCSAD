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

interface TrendMonth {
  month: string;
  added: number;
  updated: number;
  removed: number;
  uploaded: number;
}

export default function DashboardClient({ comunidades, syncStats, docInsights, recentLogs }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    added?: number; updated?: number; removed?: number; errors?: number;
  } | null>(null);
  const [syncError, setSyncError] = useState("");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [trends, setTrends] = useState<TrendMonth[]>([]);

  // Live sync state
  const [liveStatus, setLiveStatus] = useState<"idle" | "running" | null>(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [liveLogs, setLiveLogs] = useState<Array<{ operation: string; status: string; fileName?: string; details?: string; error?: string; createdAt: string }>>([]);
  const [liveStartedAt, setLiveStartedAt] = useState<string | null>(null);
  const [liveCompletedAt, setLiveCompletedAt] = useState<string | null>(null);

  const syncOutdated = syncStats.lastSync
    ? Date.now() - new Date(syncStats.lastSync).getTime() > 24 * 60 * 60 * 1000
    : false;

  // Persistent polling — always checks sync status every 4 seconds
  useEffect(() => {
    let startMs: number | null = null;
    let timerInterval: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch("/api/sync?action=status"),
          fetch("/api/sync?action=logs&limit=10"),
        ]);
        const statusData = await statusRes.json();
        const logsData = await logsRes.json();

        const isRunning = statusData.status === "running";
        setLiveStatus(isRunning ? "running" : "idle");
        setLiveLogs(logsData.logs || []);
        setLiveStartedAt(statusData.startedAt || null);
        if (statusData.completedAt) setLiveCompletedAt(statusData.completedAt);

        if (isRunning) {
          if (!startMs) {
            startMs = statusData.startedAt
              ? new Date(statusData.startedAt).getTime()
              : Date.now();
          }
          if (!timerInterval) {
            timerInterval = setInterval(() => {
              setLiveElapsed(Math.floor((Date.now() - startMs!) / 1000));
            }, 1000);
          }
        } else {
          if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
          startMs = null;
          setSyncing(false);
          if (liveStatus === "running") {
            // just finished — reload to update stats
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      } catch {}
    };

    poll();
    const pollInterval = setInterval(poll, 4000);
    return () => {
      clearInterval(pollInterval);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const runSync = async (mode: "incremental" | "full" = "incremental") => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.error) {
        setSyncError(data.error);
        setSyncing(false);
      }
      // If started OK, polling will detect completion and reload
    } catch (err) {
      setSyncError(String(err));
      setSyncing(false);
    }
  };

  const resetSync = async () => {
    if (!confirm("¿Cancelar la sincronización actual y resetear el estado?")) return;
    await fetch("/api/sync", { method: "DELETE" });
    setLiveStatus("idle");
    setSyncing(false);
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
            {(liveCompletedAt || syncStats.lastSync)
              ? `Última sincronización: ${timeAgo((liveCompletedAt || syncStats.lastSync)!)}`
              : "Sin sincronizar todavía — pulsa Sincronizar para empezar"}
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
          <button
            onClick={() => runSync("incremental")}
            disabled={liveStatus === "running" || syncing}
            className="btn-primary"
            style={{ minWidth: 180 }}
            title="Añade solo los archivos nuevos o modificados desde la última sincronización"
          >
            {liveStatus === "running" ? "Sincronizando..." : "Sincronizar cambios"}
          </button>
          <button
            onClick={() => runSync("full")}
            disabled={liveStatus === "running" || syncing}
            className="btn-primary"
            style={{ minWidth: 180, background: "#6d28d9" }}
            title="Analiza todos los archivos de SharePoint desde cero"
          >
            Sincronización completa
          </button>
        </div>
      </div>

      {/* Live sync progress panel */}
      {liveStatus === "running" && (
        <div className="card-static mb-4" style={{ borderLeft: "4px solid #3b82f6", background: "#eff6ff", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2.5px solid #3b82f6", borderTopColor: "transparent", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1e40af" }}>
                Sincronizando con SharePoint...
              </span>
              {liveElapsed > 0 && (
                <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>
                  {Math.floor(liveElapsed / 60) > 0 && `${Math.floor(liveElapsed / 60)}m `}{liveElapsed % 60}s
                </span>
              )}
            </div>
            <button
              onClick={resetSync}
              style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid #93c5fd", background: "#fff", color: "#1d4ed8", cursor: "pointer", fontWeight: 600 }}
            >
              Cancelar
            </button>
          </div>
          {liveLogs.length > 0 && (
            <div style={{ fontFamily: "monospace", fontSize: 12, background: "#0f172a", color: "#e2e8f0", padding: "10px 16px", maxHeight: 180, overflowY: "auto", lineHeight: 1.8 }}>
              {liveLogs.map((log, i) => (
                <div key={i} style={{ color: log.status === "error" ? "#f87171" : log.status === "success" ? "#4ade80" : "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "#475569", marginRight: 6 }}>{new Date(log.createdAt).toLocaleTimeString("es-ES")}</span>
                  <span style={{ color: log.status === "error" ? "#f87171" : "#60a5fa", marginRight: 6 }}>[{log.operation}]</span>
                  {log.fileName && <span style={{ marginRight: 4 }}>{log.fileName}</span>}
                  {log.details && <span style={{ color: "#64748b" }}>{log.details}</span>}
                  {log.error && <span style={{ color: "#f87171" }}> ✕ {log.error.slice(0, 60)}</span>}
                </div>
              ))}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {syncError && liveStatus !== "running" && (
        <div className="card-static mb-4" style={{ borderLeft: "4px solid #dc2626", padding: "12px 16px", background: "#fef2f2" }}>
          <span className="text-sm font-semibold text-red-700">{syncError}</span>
        </div>
      )}

      {syncOutdated && !syncing && !syncResult && (
        <div className="card-static mb-4" style={{ borderLeft: "4px solid #f59e0b", padding: "12px 16px", background: "#fffbeb" }}>
          <span className="text-sm font-semibold text-amber-700">
            Los datos llevan más de 24 horas sin actualizarse. Pulsa &ldquo;Sincronizar ahora&rdquo; para añadir los cambios de SharePoint.
          </span>
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
                  "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
                  "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
                };
                return (
                  <div key={t.month} className="flex flex-col items-center flex-1">
                    <div className="text-[10px] text-gray-400 font-mono mb-1">{total}</div>
                    <div className="w-full flex flex-col items-center" style={{ height: 80 }}>
                      <div className="w-full flex-1" />
                      <div className="w-full flex flex-col rounded-t" style={{ height: `${height}%`, minHeight: 2 }}>
                        {t.added > 0 && (
                          <div style={{ flex: t.added, background: "#22c55e", borderRadius: "3px 3px 0 0" }} title={`${t.added} nuevos`} />
                        )}
                        {t.updated > 0 && (
                          <div style={{ flex: t.updated, background: "#3b82f6" }} title={`${t.updated} actualizados`} />
                        )}
                        {t.uploaded > 0 && (
                          <div style={{ flex: t.uploaded, background: "#8b5cf6", borderRadius: "0 0 3px 3px" }} title={`${t.uploaded} subidos`} />
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{monthNames[monthLabel] || monthLabel}</div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded" style={{ background: "#22c55e" }} /> Nuevos</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded" style={{ background: "#3b82f6" }} /> Actualizados</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="w-2.5 h-2.5 rounded" style={{ background: "#8b5cf6" }} /> Subidos</span>
          </div>
        </div>
      )}

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
