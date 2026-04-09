"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import OperativaTab from "./OperativaTab";
import ChecklistTab from "./ChecklistTab";
import DocumentosTab from "./DocumentosTab";
import ResumenDocTab from "./ResumenDocTab";
import HistorialTab from "./HistorialTab";
import NotasTab from "./NotasTab";
import FacturasTab from "./FacturasTab";

type RoutingCandidate = {
  id: string;
  fileName: string;
  subfolder: string;
  confidence: string;
  comunidadId: string | null;
};

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
  codigo: string;
  nombre: string;
  nif: string;
  direccion: string;
  cp: string;
  pisos: number;
  sharePointFolderName: string | null;
  operativa: Operativa | null;
  _count: { checklists: number; documentos: number };
};

type ChecklistItem = {
  id: string;
  docTypeId: string;
  estado: "COMPLETADO" | "PENDIENTE" | "NO_APLICA";
};

const TABS = [
  { id: "resumen", label: "Resumen documental" },
  { id: "documentos", label: "Documentos" },
  { id: "facturas", label: "Facturas" },
  { id: "notas", label: "Notas" },
  { id: "historial", label: "Historial" },
  { id: "checklist", label: "Checklist" },
  { id: "operativa", label: "Info. Operativa" },
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
  const [activeTab, setActiveTab] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: "", nif: "", direccion: "", cp: "" });
  const [editSaving, setEditSaving] = useState(false);

  const [routingCandidates, setRoutingCandidates] = useState<RoutingCandidate[]>([]);
  const [routingConfirming, setRoutingConfirming] = useState(false);

  const fetchData = useCallback(async () => {
    const [comRes, checkRes] = await Promise.all([
      fetch(`/api/comunidades/${id}`),
      fetch(`/api/comunidades/${id}/checklist`),
    ]);
    if (comRes.ok) setComunidad(await comRes.json());
    if (checkRes.ok) setChecklist(await checkRes.json());
    setLoading(false);
  }, [id]);

  const fetchRouting = useCallback(async () => {
    const res = await fetch(`/api/routing?comunidadId=${id}`);
    if (res.ok) {
      const data = await res.json();
      setRoutingCandidates(data.candidates || []);
    }
  }, [id]);

  const confirmAllRouting = async () => {
    if (routingCandidates.length === 0) return;
    setRoutingConfirming(true);
    try {
      await fetch("/api/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          ids: routingCandidates.map((c) => c.id),
        }),
      });
      await fetchRouting();
    } finally {
      setRoutingConfirming(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRouting();
  }, [fetchData, fetchRouting]);

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
            <span className="font-mono">{comunidad.codigo}</span>
            <span>·</span>
            <span>{comunidad.nif}</span>
            <span>·</span>
            <span>{comunidad.direccion}</span>
            {comunidad.cp && (
              <>
                <span>·</span>
                <span>CP {comunidad.cp}</span>
              </>
            )}
            {comunidad.sharePointFolderName && (
              <>
                <span>·</span>
                <span style={{ color: "#16a34a" }}>OneDrive vinculado</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => {
              setEditForm({
                nombre: comunidad.nombre,
                nif: comunidad.nif,
                direccion: comunidad.direccion,
                cp: comunidad.cp || "",
              });
              setEditOpen(true);
            }}
          >
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

      {routingCandidates.length > 0 && (
        <div
          className="mb-5"
          style={{
            border: "2px solid #4F7CFF",
            borderRadius: 12,
            overflow: "hidden",
            background: "white",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #EFF6FF, #E0EAFF)",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18 }}>📥</span>
              <span className="font-bold text-gray-900" style={{ fontSize: 14 }}>
                Documentos detectados en el Escáner
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#4F7CFF", color: "white" }}
              >
                {routingCandidates.length} pendiente{routingCandidates.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={confirmAllRouting}
              disabled={routingConfirming}
              className="text-xs font-semibold px-4 py-1.5 rounded-lg cursor-pointer"
              style={{
                background: routingConfirming ? "#94a3b8" : "#4F7CFF",
                color: "white",
                border: "none",
                opacity: routingConfirming ? 0.7 : 1,
              }}
            >
              {routingConfirming ? "Archivando en SharePoint..." : `✓ Confirmar y archivar todos (${routingCandidates.length})`}
            </button>
          </div>
          <div>
            {routingCandidates.map((c, i) => (
              <div
                key={c.id}
                style={{
                  padding: "8px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderTop: i === 0 ? "none" : "1px solid #f1f5f9",
                  background: i % 2 === 0 ? "#FAFBFF" : "white",
                }}
              >
                <span style={{ fontSize: 14 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-xs font-medium text-gray-800 truncate">{c.fileName}</div>
                  <div className="text-xs text-gray-400">
                    Se archivará en: <span className="font-semibold text-blue-600">{c.subfolder}</span>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: c.confidence === "high" ? "#dcfce7" : c.confidence === "medium" ? "#fef3c7" : "#f1f5f9",
                    color: c.confidence === "high" ? "#16a34a" : c.confidence === "medium" ? "#d97706" : "#64748b",
                  }}
                >
                  {c.confidence === "high" ? "Alta" : c.confidence === "medium" ? "Media" : "Baja"}
                </span>
              </div>
            ))}
          </div>
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

      {activeTab === "resumen" && <ResumenDocTab comunidadId={id} />}
      {activeTab === "documentos" && <DocumentosTab comunidadId={id} />}
      {activeTab === "facturas" && <FacturasTab comunidadId={id} />}
      {activeTab === "notas" && <NotasTab comunidadId={id} />}
      {activeTab === "historial" && <HistorialTab comunidadId={id} />}
      {activeTab === "checklist" && <ChecklistTab comunidadId={id} />}
      {activeTab === "operativa" && <OperativaTab comunidadId={id} />}

      {editOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditOpen(false); }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              width: 480,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Editar datos básicos</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Nombre
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="input-field"
                  style={{ marginTop: 4, width: "100%" }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                NIF / CIF
                <input
                  type="text"
                  value={editForm.nif}
                  onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                  className="input-field"
                  style={{ marginTop: 4, width: "100%" }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Dirección
                <input
                  type="text"
                  value={editForm.direccion}
                  onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })}
                  className="input-field"
                  style={{ marginTop: 4, width: "100%" }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Código Postal
                <input
                  type="text"
                  value={editForm.cp}
                  onChange={(e) => setEditForm({ ...editForm, cp: e.target.value })}
                  className="input-field"
                  style={{ marginTop: 4, width: "100%" }}
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setEditOpen(false)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                disabled={editSaving}
                onClick={async () => {
                  setEditSaving(true);
                  try {
                    const res = await fetch(`/api/comunidades/${id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(editForm),
                    });
                    if (res.ok) {
                      setEditOpen(false);
                      fetchData();
                    } else {
                      const data = await res.json().catch(() => ({}));
                      alert(data.error || "Error al guardar los cambios");
                    }
                  } catch (err) {
                    alert("Error de conexión: " + String(err));
                  } finally {
                    setEditSaving(false);
                  }
                }}
              >
                {editSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
