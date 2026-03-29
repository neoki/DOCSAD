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
  conDocumentacion: number;
  porRevisar: number;
  sinDocumentacion: number;
  pctDigitalizacion: number;
}

function BarChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="8" width="3" height="7" rx="1" fill="currentColor" opacity="0.7"/>
      <rect x="6" y="4" width="3" height="11" rx="1" fill="currentColor"/>
      <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor" opacity="0.85"/>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
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
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M4 1h5.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
      <line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
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

function CircularProgress({ value, size = 72, strokeWidth = 5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
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
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="700" fill="#1e293b">
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

function CloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

export default function DashboardClient({ comunidades, categorias, totalComunidades, completitudMedia, totalPendientes, appTuComunidadCount, conDocumentacion, porRevisar, sinDocumentacion, pctDigitalizacion }: Props) {
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
      <div className="mb-5">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del estado documental y operativo</p>
      </div>

      <div className="flex mb-6" style={{ borderBottom: "2px solid #e2e8f0" }}>
        <button
          onClick={() => setTab("documental")}
          className={`tab-btn ${tab === "documental" ? "active" : ""}`}
        >
          Documental
        </button>
        <button
          onClick={() => setTab("operativo")}
          className={`tab-btn ${tab === "operativo" ? "active" : ""}`}
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
          conDocumentacion={conDocumentacion}
          porRevisar={porRevisar}
          sinDocumentacion={sinDocumentacion}
          pctDigitalizacion={pctDigitalizacion}
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

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 9v4M12 17h.01M10.29 3.86l-8.6 14.86A2 2 0 003.41 21h17.18a2 2 0 001.72-2.98l-8.6-14.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function DocumentalTab({
  comunidades,
  categorias,
  totalComunidades,
  completitudMedia,
  totalPendientes,
  appTuComunidadCount,
  conDocumentacion,
  porRevisar,
  sinDocumentacion,
  pctDigitalizacion,
}: {
  comunidades: ComunidadData[];
  categorias: CategoriaInfo[];
  totalComunidades: number;
  completitudMedia: number;
  totalPendientes: number;
  appTuComunidadCount: number;
  conDocumentacion: number;
  porRevisar: number;
  sinDocumentacion: number;
  pctDigitalizacion: number;
}) {
  const kpis = [
    { label: "Comunidades", value: String(totalComunidades), icon: <BuildingIcon />, color: "#4F7CFF" },
    { label: "Con documentación", value: String(conDocumentacion), icon: <CloudIcon />, color: "#22C55E" },
    { label: "Por revisar", value: String(porRevisar), icon: <WarningIcon />, color: "#F59E0B" },
    { label: "Sin carpeta", value: String(sinDocumentacion), icon: <DocIcon />, color: "#94a3b8" },
    { label: "Digitalización", value: `${pctDigitalizacion}%`, icon: <BarChartIcon />, color: "#8B5CF6" },
  ];

  return (
    <div>
      <div className="grid grid-cols-5 gap-4 mb-5">
        {kpis.map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-icon" style={{ background: k.color + "18", color: k.color }}>
              {k.icon}
            </div>
            <div>
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card">
          <div className="section-label mb-3">
            Ranking por completitud
          </div>
          <div className="flex flex-col gap-2">
            {comunidades.map((c) => {
              const color = getCompletitudColor(c.completitud);
              return (
                <Link key={c.id} href={`/comunidades/${c.id}`} className="no-underline">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-slate-700 min-w-[140px] whitespace-nowrap overflow-hidden text-ellipsis">
                      {c.nombre}
                    </div>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-300" style={{ width: `${c.completitud}%`, background: color }} />
                    </div>
                    <div className="text-xs font-bold min-w-[36px] text-right" style={{ color }}>
                      {c.completitud}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="section-label mb-3">
            Estado por categoría documental
          </div>
          <div className="flex flex-col gap-3">
            {categorias.map((cat) => {
              const applicable = cat.total - cat.noAplica;
              const pct = applicable > 0 ? Math.round((cat.completados / applicable) * 100) : 0;
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: cat.color }} />
                    <span className="text-xs font-semibold text-slate-700 flex-1">{cat.label}</span>
                    <span className="text-xs font-bold text-slate-500">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full rounded transition-all duration-300" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="section-label mb-3">
        Comunidades
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
        {comunidades.map((c) => {
          const color = getCompletitudColor(c.completitud);
          return (
            <Link key={c.id} href={`/comunidades/${c.id}`} className="no-underline">
              <div className="card text-center cursor-pointer">
                <CircularProgress value={c.completitud} color={color} />
                <div className="text-sm font-bold text-slate-900 mt-2">{c.nombre}</div>
                <div className="flex justify-center gap-3 mt-1.5">
                  <span className="text-xs text-warning">{c.pendientes} pend.</span>
                  <span className="text-xs text-slate-400">{c.noAplica} N/A</span>
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
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <span className="text-slate-500 flex items-center gap-1">
          <FilterIcon />
        </span>
        {FILTER_PILLS.map((f) => {
          const active = activeFilters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              className="rounded-full text-xs font-semibold cursor-pointer transition-all duration-150"
              style={{
                padding: "5px 14px",
                border: active ? "1px solid #4F7CFF" : "1px solid #e2e8f0",
                background: active ? "#EFF6FF" : "#fff",
                color: active ? "#4F7CFF" : "#64748b",
              }}
            >
              {f.label}
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button
            onClick={clearFilters}
            className="rounded-full text-xs font-semibold border-none bg-transparent text-danger cursor-pointer"
            style={{ padding: "5px 14px" }}
          >
            Limpiar filtros
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {filteredComunidades.length} / {totalComunidades} comunidades
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="section-label mb-3">
            Distribución operativa
          </div>
          <div className="flex flex-col gap-2">
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
                  className="flex items-center gap-3 border-none rounded-md w-full text-left"
                  style={{
                    background: isFilterActive ? "#EFF6FF" : "transparent",
                    cursor: FILTER_PILLS.some((f) => f.key === m.key) ? "pointer" : "default",
                    padding: "3px 0",
                  }}
                >
                  <span className="text-xs font-semibold text-slate-700 min-w-[140px] whitespace-nowrap" style={{ fontSize: "13px" }}>
                    {m.label}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-primary rounded transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-primary min-w-[28px] text-right">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ maxHeight: 420, overflowY: "auto" }}>
          <div className="section-label mb-3">
            Comunidades {activeFilters.size > 0 ? "(filtradas)" : ""}
          </div>
          <div className="flex flex-col gap-3">
            {filteredComunidades.map((c) => (
              <Link key={c.id} href={`/comunidades/${c.id}`} className="no-underline">
                <div className="card cursor-pointer" style={{ padding: "12px 16px" }}>
                  <div className="text-sm font-bold text-slate-900">{c.nombre}</div>
                  <div className="text-2xs text-slate-400 mt-0.5">
                    {c.nif} &middot; {c.direccion}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {OP_TAG_LIST.map((t) => {
                      const val = c.operativa ? (c.operativa as Record<string, boolean>)[t.key] : false;
                      return (
                        <span
                          key={t.key}
                          className="rounded-full font-semibold"
                          style={{
                            padding: "2px 10px",
                            fontSize: "10px",
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
              <div className="text-center py-6 text-slate-400 text-xs">
                No hay comunidades que coincidan con los filtros seleccionados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
