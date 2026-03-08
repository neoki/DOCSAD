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
      <div className="py-8 text-center text-gray-500" style={{ fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  if (!comunidad) {
    return (
      <div className="py-8 text-center text-red-500" style={{ fontSize: 13 }}>
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
        style={{ fontSize: 13 }}
      >
        ← Volver a comunidades
      </Link>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{comunidad.nombre}</h1>
          <div className="flex items-center gap-3 mt-1 text-gray-500" style={{ fontSize: 12 }}>
            <span>{comunidad.nif}</span>
            <span>·</span>
            <span>{comunidad.direccion}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/subir" className="btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>
            Subir doc.
          </Link>
          <button className="btn-secondary" style={{ fontSize: 12, padding: "6px 14px" }}>
            Editar datos básicos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="card"
            style={{
              borderLeft: `4px solid ${kpi.color}`,
              padding: "12px 14px",
            }}
          >
            <div className="font-bold text-lg text-gray-900">{kpi.value}</div>
            <div className="text-gray-500" style={{ fontSize: 11 }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {op && (
        <div className="flex flex-wrap gap-1.5 mb-5">
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
              className={`px-5 py-2.5 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={{ fontSize: 13 }}
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
