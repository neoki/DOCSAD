"use client";

import { useState, useEffect } from "react";

type ComunidadOption = {
  id: string;
  codigo: string;
  nombre: string;
};

type SubfolderCoverage = {
  name: string;
  hasFiles: boolean;
  fileCount: number;
};

type FileType = { ext: string; count: number };

type CompareResult = {
  id: string;
  codigo: string;
  nombre: string;
  folderName: string | null;
  totalFiles: number;
  totalSize: number;
  coveragePct: number;
  coverage: SubfolderCoverage[];
  notasCount: number;
  lastActivity: string | null;
  fileTypes: FileType[];
};

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CompararPage() {
  const [comunidades, setComunidades] = useState<ComunidadOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/comunidades?all=true&pageSize=1000")
      .then((r) => r.json())
      .then((data) => setComunidades(data.comunidades || []))
      .catch(() => {});
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const compare = async () => {
    if (selected.length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comparar?ids=${selected.join(",")}`);
      const data = await res.json();
      setResults(data.communities || []);
    } catch {
    }
    setLoading(false);
  };

  const filtered = search.trim()
    ? comunidades.filter(
        (c) =>
          c.nombre.toLowerCase().includes(search.toLowerCase()) ||
          c.codigo.includes(search)
      )
    : comunidades;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Comparar comunidades</h1>
        <p className="page-subtitle">Selecciona 2-5 comunidades para comparar lado a lado</p>
      </div>

      {results.length === 0 && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              placeholder="Buscar comunidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input flex-1"
            />
            <button
              onClick={compare}
              disabled={selected.length < 2 || loading}
              className="btn-primary"
            >
              {loading ? "Comparando..." : `Comparar (${selected.length})`}
            </button>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selected.map((id) => {
                const c = comunidades.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="px-2 py-1 rounded-full text-xs font-semibold cursor-pointer"
                    style={{ background: "#ede9fe", color: "#6d28d9" }}
                    onClick={() => toggleSelect(id)}
                  >
                    {c?.codigo} - {c?.nombre} x
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {filtered.slice(0, 50).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2 px-2 rounded cursor-pointer hover:bg-gray-50 text-sm"
                onClick={() => toggleSelect(c.id)}
              >
                <span
                  className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: selected.includes(c.id) ? "#6d28d9" : "#d1d5db",
                    background: selected.includes(c.id) ? "#6d28d9" : "transparent",
                    color: "#fff",
                  }}
                >
                  {selected.includes(c.id) && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="font-mono text-gray-400 text-xs" style={{ width: 50 }}>{c.codigo}</span>
                <span className="text-gray-700">{c.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setResults([])}
              className="text-sm text-blue-600 font-semibold hover:text-blue-800"
            >
              &larr; Volver a seleccionar
            </button>
          </div>

          <div className="card-static p-0 overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left" style={{ width: 200 }}>Indicador</th>
                  {results.map((r) => (
                    <th key={r.id} className="table-header text-center">{r.codigo} - {r.nombre}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="table-row">
                  <td className="table-cell font-semibold text-gray-600">Total archivos</td>
                  {results.map((r) => (
                    <td key={r.id} className="table-cell text-center font-bold">{r.totalFiles.toLocaleString("es-ES")}</td>
                  ))}
                </tr>
                <tr className="table-row">
                  <td className="table-cell font-semibold text-gray-600">Tamaño total</td>
                  {results.map((r) => (
                    <td key={r.id} className="table-cell text-center">{formatSize(r.totalSize)}</td>
                  ))}
                </tr>
                <tr className="table-row">
                  <td className="table-cell font-semibold text-gray-600">Cobertura</td>
                  {results.map((r) => (
                    <td key={r.id} className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.coveragePct}%`,
                              background: r.coveragePct >= 70 ? "#22c55e" : r.coveragePct >= 40 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold">{r.coveragePct}%</span>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="table-row">
                  <td className="table-cell font-semibold text-gray-600">Notas</td>
                  {results.map((r) => (
                    <td key={r.id} className="table-cell text-center">{r.notasCount}</td>
                  ))}
                </tr>
                <tr className="table-row">
                  <td className="table-cell font-semibold text-gray-600">Última actividad</td>
                  {results.map((r) => (
                    <td key={r.id} className="table-cell text-center text-sm">{formatDate(r.lastActivity)}</td>
                  ))}
                </tr>
                <tr className="table-row">
                  <td className="table-cell font-semibold text-gray-600">Tipos de archivo</td>
                  {results.map((r) => (
                    <td key={r.id} className="table-cell text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {r.fileTypes.map((ft) => (
                          <span key={ft.ext} className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: "#f1f5f9", color: "#64748b" }}>
                            .{ft.ext} ({ft.count})
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="section-label mb-3">Detalle de subcarpetas</div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header text-left" style={{ width: 180 }}>Subcarpeta</th>
                    {results.map((r) => (
                      <th key={r.id} className="table-header text-center">{r.codigo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results[0]?.coverage.map((sf) => (
                    <tr key={sf.name} className="table-row">
                      <td className="table-cell text-sm font-medium">{sf.name}</td>
                      {results.map((r) => {
                        const c = r.coverage.find((x) => x.name === sf.name);
                        return (
                          <td key={r.id} className="table-cell text-center">
                            {c?.hasFiles ? (
                              <span className="text-green-600 font-bold">{c.fileCount}</span>
                            ) : (
                              <span className="text-red-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
