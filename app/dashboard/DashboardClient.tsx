"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface ComunidadData {
  id: string;
  nombre: string;
  nif: string;
  direccion: string;
  completados: number;
  pendientes: number;
  noAplica: number;
  total: number;
  completitud: number;
  categoriaStats: Record<string, { completados: number; pendientes: number; noAplica: number; total: number }>;
  operativa: {
    usaAgreGasfincas: boolean;
    somosCorredorSeguro: boolean;
    tieneVideovigilancia: boolean;
    tienePersonal: boolean;
    actuaComoArrendadora: boolean;
    obligadaITE: boolean;
    tieneAppTuComunidad: boolean;
    gestionaConsumos: boolean;
    gestionaPermisosGasoleo: boolean;
    tieneReformas: boolean;
  } | null;
}

interface CategoriaInfo {
  key: string;
  label: string;
  color: string;
  completados: number;
  pendientes: number;
  noAplica: number;
  total: number;
}

interface Props {
  comunidades: ComunidadData[];
  categorias: CategoriaInfo[];
  totalComunidades: number;
  completitudMedia: number;
  totalPendientes: number;
  appTuComunidadCount: number;
}

function BarChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="6" y="4" width="3" height="11" rx="1" fill="currentColor"/>
      <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor" opacity="0.85"/>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <rect x="5" y="4" width="2" height="2" rx="0.5" fill="currentColor"/>
      <rect x="9" y="4" width="2" height="2" rx="0.5" fill="currentColor"/>
      <rect x="5" y="8" width="2" height="2" rx="0.5" fill="currentColor"/>
      <rect x="9" y="8" width="2" height="2" rx="0.5" fill="currentColor"/>
      <rect x="6.5" y="12" width="3" height="3" rx="0.5" fill="currentColor"/>
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 1h5.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
      <line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="4" y="1" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 2h12L8.5 7v4.5L5.5 13V7L1 2z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

function CircularProgress({ value, size = 64, strokeWidth = 5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="#1e293b">
        {value}%
      </text>
    </svg>
  );
}

function getCompletitudColor(pct: number) {
  if (pct >= 70) return "#22C55E";
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

const FILTER_PILLS = [
  { key: "usaAgreGasfincas", label: "GESFINCAS" },
  { key: "somosCorredorSeguro", label: "Corredor propio" },
  { key: "tieneVideovigilancia", label: "Videovigilancia" },
  { key: "tienePersonal", label: "Con personal" },
  { key: "actuaComoArrendadora", label: "Arrendadora" },
  { key: "obligadaITE", label: "Obligada ITE" },
] as const;

const DISTRIBUTION_METRICS = [
  { key: "usaAgreGasfincas", label: "GESFINCAS" },
  { key: "somosCorredorSeguro", label: "Corredor propio" },
  { key: "tieneVideovigilancia", label: "Videovigilancia" },
  { key: "tienePersonal", label: "Con personal laboral" },
  { key: "actuaComoArrendadora", label: "Arrendadora" },
  { key: "obligadaITE", label: "Obligada ITE" },
  { key: "tieneAppTuComunidad", label: "App Tu Comunidad" },
  { key: "gestionaConsumos", label: "Gestiona consumos" },
  { key: "gestionaPermisosGasoleo", label: "Permisos gasóleo" },
  { key: "tieneReformas", label: "Con alguna reforma" },
] as const;

const OP_TAG_LIST = [
  { key: "usaAgreGasfincas", label: "GESFINCAS", activeColor: "#4F7CFF", activeBg: "#EFF6FF" },
  { key: "somosCorredorSeguro", label: "Corredor propio", activeColor: "#EC4899", activeBg: "#FDF2F8" },
  { key: "tieneVideovigilancia", label: "Videovigilancia", activeColor: "#8B5CF6", activeBg: "#F5F3FF" },
  { key: "tienePersonal", label: "Con personal", activeColor: "#F59E0B", activeBg: "#FFFBEB" },
  { key: "actuaComoArrendadora", label: "Arrendadora", activeColor: "#EC4899", activeBg: "#FDF2F8" },
  { key: "obligadaITE", label: "Obligada ITE", activeColor: "#EF4444", activeBg: "#FEF2F2" },
  { key: "tieneAppTuComunidad", label: "App Tu Comunidad", activeColor: "#4F7CFF", activeBg: "#EFF6FF" },
  { key: "gestionaConsumos", label: "Gestiona consumos", activeColor: "#06b6d4", activeBg: "#ECFEFF" },
  { key: "gestionaPermisosGasoleo", label: "Permisos gasóleo", activeColor: "#78716c", activeBg: "#F5F5F4" },
  { key: "tieneReformas", label: "Con reforma", activeColor: "#a855f7", activeBg: "#FAF5FF" },
] as const;

export default function DashboardClient({ comunidades, categorias, totalComunidades, completitudMedia, totalPendientes, appTuComunidadCount }: Props) {
  const [tab, setTab] = useState<"documental" | "operativo">("documental");
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const sortedByCompletitud = useMemo(
    () => [...comunidades].sort((a, b) => b.completitud - a.completitud),
    [comunidades]
  );

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => setActiveFilters(new Set());

  const filteredComunidades = useMemo(() => {
    if (activeFilters.size === 0) return comunidades;
    return comunidades.filter((c) => {
      if (!c.operativa) return false;
      for (const f of activeFilters) {
        if (!(c.operativa as Record<string, boolean>)[f]) return false;
      }
      return true;
    });
  }, [comunidades, activeFilters]);

  const distributionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of DISTRIBUTION_METRICS) {
      counts[m.key] = comunidades.filter((c) => c.operativa && (c.operativa as Record<string, boolean>)[m.key]).length;
    }
    return counts;
  }, [comunidades]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>Resumen general del estado documental y operativo</p>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
        <button
          onClick={() => setTab("documental")}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: tab === "documental" ? "#4F7CFF" : "#64748b",
            borderBottom: tab === "documental" ? "2px solid #4F7CFF" : "2px solid transparent",
            marginBottom: -2,
          }}
        >
          Documental
        </button>
        <button
          onClick={() => setTab("operativo")}
          style={{
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: tab === "operativo" ? "#4F7CFF" : "#64748b",
            borderBottom: tab === "operativo" ? "2px solid #4F7CFF" : "2px solid transparent",
            marginBottom: -2,
          }}
        >
          Operativo
        </button>
      </div>

      {tab === "documental" ? (
        <DocumentalTab
          comunidades={sortedByCompletitud}
          categorias={categorias}
          totalComunidades={totalComunidades}
          completitudMedia={completitudMedia}
          totalPendientes={totalPendientes}
          appTuComunidadCount={appTuComunidadCount}
        />
      ) : (
        <OperativoTab
          comunidades={comunidades}
          filteredComunidades={filteredComunidades}
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
          clearFilters={clearFilters}
          distributionCounts={distributionCounts}
          totalComunidades={totalComunidades}
        />
      )}
    </div>
  );
}

function DocumentalTab({
  comunidades,
  categorias,
  totalComunidades,
  completitudMedia,
  totalPendientes,
  appTuComunidadCount,
}: {
  comunidades: ComunidadData[];
  categorias: CategoriaInfo[];
  totalComunidades: number;
  completitudMedia: number;
  totalPendientes: number;
  appTuComunidadCount: number;
}) {
  const kpis = [
    { label: "Comunidades", value: String(totalComunidades), icon: <BuildingIcon />, color: "#4F7CFF" },
    { label: "Completitud media", value: `${completitudMedia}%`, icon: <CheckCircleIcon />, color: "#22C55E" },
    { label: "Docs. pendientes", value: String(totalPendientes), icon: <DocIcon />, color: "#F59E0B" },
    { label: "App Tu Comunidad", value: String(appTuComunidadCount), icon: <PhoneIcon />, color: "#8B5CF6" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: k.color + "18", color: k.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Ranking por completitud
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comunidades.map((c) => {
              const color = getCompletitudColor(c.completitud);
              return (
                <Link key={c.id} href={`/comunidades/${c.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", minWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.nombre}
                    </div>
                    <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${c.completitud}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color, minWidth: 36, textAlign: "right" }}>
                      {c.completitud}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Estado por categoría documental
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categorias.map((cat) => {
              const applicable = cat.total - cat.noAplica;
              const pct = applicable > 0 ? Math.round((cat.completados / applicable) * 100) : 0;
              return (
                <div key={cat.key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", flex: 1 }}>{cat.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: cat.color, borderRadius: 3, transition: "width 0.3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
        Comunidades
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {comunidades.map((c) => {
          const color = getCompletitudColor(c.completitud);
          return (
            <Link key={c.id} href={`/comunidades/${c.id}`} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: 16, textAlign: "center", cursor: "pointer", transition: "box-shadow 0.2s" }}>
                <CircularProgress value={c.completitud} color={color} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 8 }}>{c.nombre}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "#F59E0B" }}>{c.pendientes} pend.</span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{c.noAplica} N/A</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OperativoTab({
  comunidades,
  filteredComunidades,
  activeFilters,
  toggleFilter,
  clearFilters,
  distributionCounts,
  totalComunidades,
}: {
  comunidades: ComunidadData[];
  filteredComunidades: ComunidadData[];
  activeFilters: Set<string>;
  toggleFilter: (key: string) => void;
  clearFilters: () => void;
  distributionCounts: Record<string, number>;
  totalComunidades: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <span style={{ color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
          <FilterIcon />
        </span>
        {FILTER_PILLS.map((f) => {
          const active = activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              style={{
                padding: "4px 12px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                border: active ? "1px solid #4F7CFF" : "1px solid #e2e8f0",
                background: active ? "#EFF6FF" : "#fff",
                color: active ? "#4F7CFF" : "#64748b",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button
            onClick={clearFilters}
            style={{
              padding: "4px 12px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              background: "none",
              color: "#EF4444",
              cursor: "pointer",
            }}
          >
            Limpiar filtros
          </button>
        )}
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
          {filteredComunidades.length} / {totalComunidades} comunidades
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Distribución operativa
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DISTRIBUTION_METRICS.map((m) => {
              const count = distributionCounts[m.key] || 0;
              const pct = totalComunidades > 0 ? Math.round((count / totalComunidades) * 100) : 0;
              const isFilterActive = activeFilters.has(m.key);
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    if (FILTER_PILLS.some((f) => f.key === m.key)) {
                      toggleFilter(m.key);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: isFilterActive ? "#EFF6FF" : "transparent",
                    border: "none",
                    cursor: FILTER_PILLS.some((f) => f.key === m.key) ? "pointer" : "default",
                    padding: "2px 0",
                    borderRadius: 6,
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#334155", minWidth: 130, whiteSpace: "nowrap" }}>
                    {m.label}
                  </span>
                  <div style={{ flex: 1, height: 7, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#4F7CFF", borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#4F7CFF", minWidth: 24, textAlign: "right" }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: 16, maxHeight: 420, overflowY: "auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Comunidades {activeFilters.size > 0 ? "(filtradas)" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredComunidades.map((c) => (
              <Link key={c.id} href={`/comunidades/${c.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="card"
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{c.nombre}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                    {c.nif} &middot; {c.direccion}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {OP_TAG_LIST.map((t) => {
                      const val = c.operativa ? (c.operativa as Record<string, boolean>)[t.key] : false;
                      return (
                        <span
                          key={t.key}
                          style={{
                            padding: "1px 8px",
                            borderRadius: 9999,
                            fontSize: 9,
                            fontWeight: 600,
                            border: val ? `1px solid ${t.activeColor}` : "1px solid #e2e8f0",
                            background: val ? t.activeBg : "#f8fafc",
                            color: val ? t.activeColor : "#94a3b8",
                          }}
                        >
                          {t.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </Link>
            ))}
            {filteredComunidades.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 12 }}>
                No hay comunidades que coincidan con los filtros seleccionados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
