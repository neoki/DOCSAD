"use client";

import { useState, useEffect, useCallback } from "react";

interface Nota {
  id: string;
  texto: string;
  autor: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotasTab({ comunidadId }: { comunidadId: string }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotas = useCallback(() => {
    fetch(`/api/comunidades/${comunidadId}/notas`)
      .then((r) => {
        if (!r.ok) throw new Error("Error");
        return r.json();
      })
      .then((data) => { setNotas(data.notas || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [comunidadId]);

  useEffect(() => { fetchNotas(); }, [fetchNotas]);

  const addNota = async () => {
    if (!texto.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/notas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (res.ok) {
        setTexto("");
        fetchNotas();
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar la nota");
      }
    } catch (err) {
      alert(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteNota = async (notaId: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/notas`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notaId }),
      });
      if (res.ok) fetchNotas();
    } catch {
      alert("Error al eliminar");
    }
  };

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Cargando notas...</div>;

  return (
    <div>
      <div className="section-label mb-3">Notas y observaciones</div>

      <div className="mb-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe una nota u observación sobre esta comunidad..."
          className="form-input"
          style={{ minHeight: 80, resize: "vertical" }}
        />
        <div className="flex justify-end mt-2">
          <button onClick={addNota} disabled={saving || !texto.trim()} className="btn-primary">
            {saving ? "Guardando..." : "Añadir nota"}
          </button>
        </div>
      </div>

      {notas.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Sin notas todavía.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notas.map((nota) => (
            <div key={nota.id} className="border border-gray-100 rounded-lg p-3 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{nota.texto}</p>
                <button
                  onClick={() => deleteNota(nota.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Eliminar nota"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-gray-400">{nota.autor}</span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] text-gray-400">{timeAgo(nota.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
