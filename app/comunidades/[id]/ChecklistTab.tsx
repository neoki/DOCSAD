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

export default function ChecklistTab({ comunidadId }: { comunidadId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");

  const fetchChecklist = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${comunidadId}/checklist`);
    if (res.ok) {
      const data = await res.json();
      const map = new Map(data.map((i: ChecklistItem) => [i.docTypeId, i]));
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

  async function toggleEstado(docTypeId: string, targetEstado: "COMPLETADO" | "NO_APLICA") {
    const item = items.find((i) => i.docTypeId === docTypeId);
    if (!item) return;
    const newEstado = item.estado === targetEstado ? "PENDIENTE" : targetEstado;
    const newFecha = newEstado === "COMPLETADO" ? new Date().toISOString() : item.fecha;

    setItems((prev) =>
      prev.map((i) =>
        i.docTypeId === docTypeId ? { ...i, estado: newEstado, fecha: newFecha } : i
      )
    );

    await fetch(`/api/comunidades/${comunidadId}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ docTypeId, estado: newEstado, fecha: newFecha }]),
    });
  }

  const categorias = Object.keys(CATEGORIAS);

  const filteredItems = items.filter((item) => {
    const dt = DOC_TYPES.find((d) => d.id === item.docTypeId);
    if (!dt) return false;
    if (filterEstado !== "all" && item.estado !== filterEstado) return false;
    if (filterCategoria !== "all" && dt.categoria !== filterCategoria) return false;
    if (search) {
      const q = search.toLowerCase();
      const cat = CATEGORIAS[dt.categoria];
      if (
        !dt.label.toLowerCase().includes(q) &&
        !dt.subcategoria.toLowerCase().includes(q) &&
        !(cat && cat.label.toLowerCase().includes(q))
      )
        return false;
    }
    return true;
  });

  const [autoChecking, setAutoChecking] = useState(false);
  const [autoResult, setAutoResult] = useState<string | null>(null);

  const runAutoCheck = async () => {
    setAutoChecking(true);
    setAutoResult(null);
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/checklist/auto`, { method: "POST" });
      const data = await res.json();
      setAutoResult(`${data.updated} ítems marcados como completados`);
      fetchChecklist();
    } catch {
      setAutoResult("Error al ejecutar auto-checklist");
    }
    setAutoChecking(false);
  };

  if (loading) return <div className="text-gray-500 text-sm">Cargando checklist...</div>;

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar documento..."
          className="input-field"
          style={{ maxWidth: 260 }}
        />
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="input-field"
          style={{ maxWidth: 240 }}
        >
          <option value="all">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORIAS[cat].label}
            </option>
          ))}
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="input-field"
          style={{ maxWidth: 200 }}
        >
          <option value="all">Todos los estados</option>
          <option value="COMPLETADO">Completado</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="NO_APLICA">No aplica</option>
        </select>
        <button
          onClick={runAutoCheck}
          disabled={autoChecking}
          className="btn-primary text-xs"
          style={{ padding: "6px 14px", background: "#6d28d9" }}
        >
          {autoChecking ? "Verificando..." : "Auto-completar desde documentos"}
        </button>
        {autoResult && (
          <span className="text-xs text-green-600 font-semibold">{autoResult}</span>
        )}
      </div>

      <div className="card-static p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header text-left">Categoría</th>
              <th className="table-header text-left">Subcategoría</th>
              <th className="table-header text-left">Documento</th>
              <th className="table-header text-left">Estado</th>
              <th className="table-header text-left">Última actualización</th>
              <th className="table-header text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const dt = DOC_TYPES.find((d) => d.id === item.docTypeId);
              if (!dt) return null;
              const cat = CATEGORIAS[dt.categoria];
              const estadoClass =
                item.estado === "COMPLETADO"
                  ? "badge-completado"
                  : item.estado === "NO_APLICA"
                  ? "badge-no-aplica"
                  : "badge-pendiente";
              const estadoLabel =
                item.estado === "COMPLETADO"
                  ? "Completado"
                  : item.estado === "NO_APLICA"
                  ? "No aplica"
                  : "Pendiente";

              return (
                <tr key={item.docTypeId} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: cat?.color ?? "#94a3b8" }}
                      />
                      <span className="text-xs text-gray-700">
                        {cat?.label ?? dt.categoria}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-xs text-gray-500">
                    {dt.subcategoria}
                  </td>
                  <td className="table-cell font-semibold text-gray-900">
                    {dt.label}
                  </td>
                  <td className="table-cell">
                    <span className={estadoClass}>{estadoLabel}</span>
                  </td>
                  <td className="table-cell text-xs text-gray-500">
                    {item.fecha
                      ? new Date(item.fecha).toLocaleDateString("es-ES")
                      : "—"}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => toggleEstado(item.docTypeId, "COMPLETADO")}
                        title="Marcar completado"
                        className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                        style={{
                          background:
                            item.estado === "COMPLETADO" ? "#dcfce7" : "#f8fafc",
                          color:
                            item.estado === "COMPLETADO" ? "#166534" : "#94a3b8",
                          border: `1px solid ${
                            item.estado === "COMPLETADO" ? "#86efac" : "#e2e8f0"
                          }`,
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => toggleEstado(item.docTypeId, "NO_APLICA")}
                        title="Marcar no aplica"
                        className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                        style={{
                          background:
                            item.estado === "NO_APLICA" ? "#f1f5f9" : "#f8fafc",
                          color:
                            item.estado === "NO_APLICA" ? "#475569" : "#94a3b8",
                          border: `1px solid ${
                            item.estado === "NO_APLICA" ? "#94a3b8" : "#e2e8f0"
                          }`,
                        }}
                      >
                        N/A
                      </button>
                      <a
                        href="/visor"
                        className="px-2.5 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        style={{ border: "1px solid #e2e8f0" }}
                      >
                        Ver
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">
            No se encontraron documentos con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
}
