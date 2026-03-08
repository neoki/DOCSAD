"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import OperativaTab from "./OperativaTab";
import ChecklistTab from "./ChecklistTab";
import DocumentosTab from "./DocumentosTab";

type Operativa = {
  usaAgreGasfincas: boolean;
  somosCorredorSeguro: boolean;
  tieneAppTuComunidad: boolean;
  tienePortero: boolean;
  tieneConserje: boolean;
  tieneGarajista: boolean;
  tieneLimpiadora: boolean;
  tieneOtroPersonal: boolean;
  tieneVideovigilancia: boolean;
  actuaComoArrendadora: boolean;
  gestionaConsumos: boolean;
  gestionaPermisosGasoleo: boolean;
  reformaFontaneria: boolean;
  reformaSaneamiento: boolean;
  reformaElectricidad: boolean;
  obligadaITE: boolean;
  usaNuevoSistemaIncidencias: boolean;
};

type Comunidad = {
  id: string;
  nombre: string;
  nif: string;
  direccion: string;
  pisos: number;
  operativa: Operativa | null;
  _count: { checklists: number; documentos: number };
};

type ChecklistItem = {
  id: string;
  docTypeId: string;
  estado: "COMPLETADO" | "PENDIENTE" | "NO_APLICA";
};

const TABS = [
  { id: "checklist", label: "Checklist" },
  { id: "operativa", label: "Info. Operativa" },
  { id: "documentos", label: "Documentos" },
];

const TAG_DEFS: { key: keyof Operativa; label: string }[] = [
  { key: "usaAgreGasfincas", label: "GESFINCAS" },
  { key: "somosCorredorSeguro", label: "Corredor propio" },
  { key: "tieneVideovigilancia", label: "Videovigilancia" },
  { key: "tieneAppTuComunidad", label: "App TuComunidad" },
  { key: "gestionaConsumos", label: "Gestiona consumos" },
  { key: "gestionaPermisosGasoleo", label: "Permisos gasóleo" },
  { key: "actuaComoArrendadora", label: "Arrendadora" },
  { key: "obligadaITE", label: "Obligada ITE" },
];

export default function ComunidadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [comunidad, setComunidad] = useState<Comunidad | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [activeTab, setActiveTab] = useState("checklist");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [comRes, checkRes] = await Promise.all([
      fetch(`/api/comunidades/${id}`),
      fetch(`/api/comunidades/${id}/checklist`),
    ]);
    if (comRes.ok) setComunidad(await comRes.json());
    if (checkRes.ok) setChecklist(await checkRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="py-8 text-center text-gray-500 text-sm">
        Cargando...
      </div>
    );
  }

  if (!comunidad) {
    return (
      <div className="py-8 text-center text-red-500 text-sm">
        Comunidad no encontrada.
      </div>
    );
  }

  const completados = checklist.filter((i) => i.estado === "COMPLETADO").length;
  const pendientes = checklist.filter((i) => i.estado === "PENDIENTE").length;
  const noAplica = checklist.filter((i) => i.estado === "NO_APLICA").length;
  const total = checklist.length;
  const aplicables = total - noAplica;
  const completitud = aplicables > 0 ? Math.round((completados / aplicables) * 100) : 0;

  const op = comunidad.operativa;
  const reformasCount = op
    ? [op.reformaFontaneria, op.reformaSaneamiento, op.reformaElectricidad].filter(Boolean).length
    : 0;

  const hasPersonal = op
    ? [op.tienePortero, op.tieneConserje, op.tieneGarajista, op.tieneLimpiadora, op.tieneOtroPersonal].some(Boolean)
    : false;

  const kpis = [
    { label: "Completitud", value: `${completitud}%`, color: "#4F7CFF" },
    { label: "Completados", value: completados, color: "#22C55E" },
    { label: "Pendientes", value: pendientes, color: "#F59E0B" },
    { label: "No aplica", value: noAplica, color: "#64748b" },
    { label: "Reformas", value: `${reformasCount}/3`, color: "#a855f7" },
  ];

  return (
    <div>
      <Link
        href="/comunidades"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4"
      >
        ← Volver a comunidades
      </Link>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="page-title">{comunidad.nombre}</h1>
          <div className="flex items-center gap-3 mt-1 text-gray-500 text-sm">
            <span>{comunidad.nif}</span>
            <span>·</span>
            <span>{comunidad.direccion}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/subir" className="btn-primary" style={{ textDecoration: "none" }}>
            Subir doc.
          </Link>
          <button className="btn-secondary">
            Editar datos básicos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="kpi-card"
            style={{ borderLeft: `4px solid ${kpi.color}` }}
          >
            <div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {op && (
        <div className="flex flex-wrap gap-2 mb-5">
          {TAG_DEFS.map((tag) => {
            const active = Boolean(op[tag.key]);
            return (
              <span
                key={tag.key}
                className={active ? "tag-activo" : "tag-inactivo"}
                style={
                  active
                    ? { background: "#dcfce7", color: "#166534", borderColor: "#86efac" }
                    : {}
                }
              >
                {tag.label}
              </span>
            );
          })}
          {hasPersonal && (
            <span
              className="tag-activo"
              style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" }}
            >
              Con personal
            </span>
          )}
        </div>
      )}

      <div className="border-b border-gray-200 mb-5">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "checklist" && <ChecklistTab comunidadId={id} />}
      {activeTab === "operativa" && <OperativaTab comunidadId={id} />}
      {activeTab === "documentos" && <DocumentosTab comunidadId={id} />}
    </div>
  );
}
