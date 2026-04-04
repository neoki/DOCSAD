"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SearchResult {
  id: string;
  name: string;
  path: string;
  subfolder: string | null;
  sizeBytes: number;
  mimeType: string | null;
  sharePointModified: string | null;
  comunidad: { id: string; codigo: string; nombre: string } | null;
}

interface Comunidad {
  id: string;
  codigo: string;
  nombre: string;
}

const SUBFOLDERS = [
  "01_Actas", "02_Seguros", "03_Contratos", "04_Certificados",
  "05_Contabilidad", "06_Correspondencia", "07_Incidencias",
  "08_Obras", "09_Personal", "10_Juridico", "11_Otros",
];

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "PDF";
  if (["doc", "docx"].includes(ext)) return "DOC";
  if (["xls", "xlsx"].includes(ext)) return "XLS";
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "IMG";
  return "FILE";
}

function getIconColor(icon: string): string {
  const colors: Record<string, string> = { PDF: "#dc2626", DOC: "#2563eb", XLS: "#16a34a", IMG: "#f59e0b" };
  return colors[icon] || "#64748b";
}

export default function BusquedaPage() {
  const [query, setQuery] = useState("");
  const [subfolder, setSubfolder] = useState("");
  const [comunidadId, setComunidadId] = useState("");
  const [tipo, setTipo] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/comunidades")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComunidades(data);
      })
      .catch(() => {});
  }, []);

  const search = useCallback(async (p = 1) => {
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (subfolder) params.set("subfolder", subfolder);
    if (comunidadId) params.set("comunidadId", comunidadId);
    if (tipo) params.set("tipo", tipo);
    params.set("page", String(p));

    try {
      const res = await fetch(`/api/busqueda?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, subfolder, comunidadId, tipo]);

  return (
    <div>
      <h1 className="page-title">Búsqueda de documentos</h1>
      <p className="page-subtitle mb-4">Busca archivos en todas las comunidades sincronizadas con SharePoint</p>

      <div className="card mb-5">
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nombre del archivo</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search(1)}
              placeholder="Buscar por nombre..."
              className="form-input"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Subcarpeta</label>
            <select value={subfolder} onChange={(e) => setSubfolder(e.target.value)} className="form-input">
              <option value="">Todas</option>
              {SUBFOLDERS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Comunidad</label>
            <select value={comunidadId} onChange={(e) => setComunidadId(e.target.value)} className="form-input">
              <option value="">Todas</option>
              {comunidades.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input">
              <option value="">Todos</option>
              <option value="pdf">PDF</option>
              <option value="doc">Word</option>
              <option value="xls">Excel</option>
              <option value="img">Imágenes</option>
            </select>
          </div>
        </div>
        <button onClick={() => search(1)} disabled={loading} className="btn-primary">
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {searched && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">
              {total > 0 ? `${total.toLocaleString("es-ES")} resultados encontrados` : "Sin resultados"}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => search(page - 1)}
                  disabled={page <= 1 || loading}
                  className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-500">Pág. {page} de {totalPages}</span>
                <button
                  onClick={() => search(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="text-xs px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Archivo</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Subcarpeta</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-500">Comunidad</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Tamaño</th>
                  <th className="text-right py-2 px-2 font-semibold text-gray-500">Modificado</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const icon = getFileIcon(r.name);
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: `${getIconColor(icon)}15`, color: getIconColor(icon) }}
                          >
                            {icon}
                          </span>
                          <span className="text-gray-700 truncate" style={{ maxWidth: 250 }} title={r.name}>
                            {r.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: "#ede9fe", color: "#6d28d9" }}>
                          {r.subfolder || "raíz"}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {r.comunidad ? (
                          <Link
                            href={`/comunidades/${r.comunidad.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {r.comunidad.codigo} - {r.comunidad.nombre}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-500 font-mono">{formatSize(r.sizeBytes)}</td>
                      <td className="py-2 px-2 text-right text-gray-500">{formatDate(r.sharePointModified)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
