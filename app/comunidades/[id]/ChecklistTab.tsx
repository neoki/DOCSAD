"use client";

import { useState, useEffect, useCallback } from "react";
import { DOC_TYPES, CATEGORIAS } from "@/lib/doctypes";

type ChecklistItem = {
  id: string;
  docTypeId: string;
  estado: "COMPLETADO" | "PENDIENTE" | "NO_APLICA";
  fecha: string | null;
  observaciones: string;
  justificacion: string;
};

const ESTADO_OPTIONS = [
  { value: "COMPLETADO", label: "Completado", className: "badge-completado" },
  { value: "PENDIENTE", label: "Pendiente", className: "badge-pendiente" },
  { value: "NO_APLICA", label: "No aplica", className: "badge-no-aplica" },
] as const;

export default function ChecklistTab({ comunidadId }: { comunidadId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${comunidadId}/checklist`);
    if (res.ok) {
      const data = await res.json();
      const map = new Map(data.map((i: ChecklistItem) => [i.docTypeId, i]));

      // Fill in any missing doc types
      const filled = DOC_TYPES.map((dt) => {
        const existing = map.get(dt.id) as ChecklistItem | undefined;
        return existing ?? {
          id: `new-${dt.id}`,
          docTypeId: dt.id,
          estado: "PENDIENTE" as const,
          fecha: null,
          observaciones: "",
          justificacion: "",
        };
      });
      setItems(filled);
    }
    setLoading(false);
  }, [comunidadId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const updateItem = (docTypeId: string, field: keyof ChecklistItem, value: unknown) => {
    setItems((prev) =>
      prev.map((i) => (i.docTypeId === docTypeId ? { ...i, [field]: value } : i))
    );
  };

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/comunidades/${comunidadId}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetchChecklist();
  }

  const categorias = Object.keys(CATEGORIAS) as (keyof typeof CATEGORIAS)[];

  const filteredItems = items.filter((item) => {
    const dt = DOC_TYPES.find((d) => d.id === item.docTypeId);
    if (!dt) return false;
    if (filterEstado !== "all" && item.estado !== filterEstado) return false;
    if (filterCategoria !== "all" && dt.categoria !== filterCategoria) return false;
    return true;
  });

  const stats = {
    completado: items.filter((i) => i.estado === "COMPLETADO").length,
    pendiente: items.filter((i) => i.estado === "PENDIENTE").length,
    noAplica: items.filter((i) => i.estado === "NO_APLICA").length,
  };

  if (loading) return <div className="text-gray-500 text-sm">Cargando checklist...</div>;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completado}</div>
          <div className="text-sm text-gray-500">Completados</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pendiente}</div>
          <div className="text-sm text-gray-500">Pendientes</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-500">{stats.noAplica}</div>
          <div className="text-sm text-gray-500">No aplica</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="input-field py-1.5 text-sm"
            >
              <option value="all">Todos</option>
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Categoría</label>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="input-field py-1.5 text-sm"
            >
              <option value="all">Todas</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORIAS[cat]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {filteredItems.map((item) => {
          const dt = DOC_TYPES.find((d) => d.id === item.docTypeId);
          if (!dt) return null;
          const isExpanded = expanded === item.docTypeId;
          const estadoClass = item.estado === "COMPLETADO" ? "badge-completado" : item.estado === "NO_APLICA" ? "badge-no-aplica" : "badge-pendiente";

          return (
            <div key={item.docTypeId} className="card p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.docTypeId)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  {isExpanded ? "▼" : "▶"}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm">{dt.label}</div>
                  <div className="text-xs text-gray-400 capitalize">{CATEGORIAS[dt.categoria as keyof typeof CATEGORIAS]}</div>
                </div>
                <select
                  value={item.estado}
                  onChange={(e) => updateItem(item.docTypeId, "estado", e.target.value)}
                  className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${estadoClass}`}
                  style={{ appearance: "auto" }}
                >
                  {ESTADO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {isExpanded && (
                <div className="mt-4 space-y-3 pl-8 border-t border-gray-100 pt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha del documento</label>
                    <input
                      type="date"
                      value={item.fecha ? item.fecha.split("T")[0] : ""}
                      onChange={(e) => updateItem(item.docTypeId, "fecha", e.target.value || null)}
                      className="input-field text-sm py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
                    <textarea
                      value={item.observaciones}
                      onChange={(e) => updateItem(item.docTypeId, "observaciones", e.target.value)}
                      rows={2}
                      className="input-field text-sm"
                      placeholder="Observaciones sobre este documento..."
                    />
                  </div>
                  {item.estado === "NO_APLICA" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Justificación (No aplica)</label>
                      <textarea
                        value={item.justificacion}
                        onChange={(e) => updateItem(item.docTypeId, "justificacion", e.target.value)}
                        rows={2}
                        className="input-field text-sm"
                        placeholder="Motivo por el que no aplica..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 mt-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? "Guardando..." : "Guardar checklist"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ Guardado</span>}
      </div>
    </div>
  );
}
