"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Comunidad = {
  id: string;
  codigo: string;
  nombre: string;
  nif: string;
  direccion: string;
  cp: string;
  sharePointFolderName: string | null;
  checklists: { estado: string }[];
};

function calcCompletitud(checklists: { estado: string }[]): number {
  if (!checklists || checklists.length === 0) return 0;
  const completados = checklists.filter((c) => c.estado === "COMPLETADO").length;
  const noAplica = checklists.filter((c) => c.estado === "NO_APLICA").length;
  const denom = checklists.length - noAplica;
  if (denom <= 0) return 100;
  return Math.round((completados / denom) * 100);
}

function progressColor(pct: number): string {
  if (pct >= 70) return "#22C55E";
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

type SortKey = "codigo" | "nombre" | "nif" | "cp" | "completitud" | "docs";
type SortDir = "asc" | "desc";

export default function ComunidadesPage() {
  const router = useRouter();
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("codigo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/comunidades?all=true&pageSize=1000");
      const data = await res.json();
      setComunidades(data.comunidades ?? []);
      setLoading(false);
    })();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  const filtered = useMemo(() => {
    let result = comunidades;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          c.nif.toLowerCase().includes(q) ||
          c.direccion.toLowerCase().includes(q) ||
          c.codigo.toLowerCase().includes(q) ||
          c.cp.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "codigo":
          cmp = a.codigo.localeCompare(b.codigo);
          break;
        case "nombre":
          cmp = a.nombre.localeCompare(b.nombre);
          break;
        case "nif":
          cmp = a.nif.localeCompare(b.nif);
          break;
        case "cp":
          cmp = a.cp.localeCompare(b.cp);
          break;
        case "completitud":
          cmp = calcCompletitud(a.checklists) - calcCompletitud(b.checklists);
          break;
        case "docs":
          cmp = (a.sharePointFolderName ? 1 : 0) - (b.sharePointFolderName ? 1 : 0);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [comunidades, search, sortKey, sortDir]);

  const conCarpeta = comunidades.filter((c) => c.sharePointFolderName).length;
  const sinCarpeta = comunidades.length - conCarpeta;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Comunidades</h1>
          <p className="page-subtitle">
            {comunidades.length} comunidades registradas
            {" · "}
            <span style={{ color: "#22C55E" }}>{conCarpeta} con documentos</span>
            {" · "}
            <span style={{ color: "#94a3b8" }}>{sinCarpeta} sin carpeta</span>
          </p>
        </div>
        <Link href="/comunidades/nueva" className="btn-primary" style={{ textDecoration: "none" }}>
          + Nueva comunidad
        </Link>
      </div>

      <div className="card mb-6">
        <input
          type="text"
          placeholder="Buscar por código, nombre, NIF, dirección o CP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card-static p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron comunidades.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th
                    className="table-header text-left cursor-pointer select-none"
                    onClick={() => handleSort("codigo")}
                  >
                    Cód.{sortIndicator("codigo")}
                  </th>
                  <th
                    className="table-header text-left cursor-pointer select-none"
                    onClick={() => handleSort("nombre")}
                  >
                    Comunidad{sortIndicator("nombre")}
                  </th>
                  <th
                    className="table-header text-left cursor-pointer select-none"
                    onClick={() => handleSort("nif")}
                  >
                    NIF{sortIndicator("nif")}
                  </th>
                  <th
                    className="table-header text-left cursor-pointer select-none"
                    onClick={() => handleSort("cp")}
                  >
                    CP{sortIndicator("cp")}
                  </th>
                  <th
                    className="table-header text-center cursor-pointer select-none"
                    onClick={() => handleSort("docs")}
                  >
                    OneDrive{sortIndicator("docs")}
                  </th>
                  <th
                    className="table-header text-left cursor-pointer select-none"
                    onClick={() => handleSort("completitud")}
                  >
                    Completitud{sortIndicator("completitud")}
                  </th>
                  <th className="table-header text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const pct = calcCompletitud(c.checklists);
                  const color = progressColor(pct);
                  const hasFolder = !!c.sharePointFolderName;

                  return (
                    <tr
                      key={c.id}
                      className="table-row cursor-pointer"
                      onClick={() => router.push(`/comunidades/${c.id}`)}
                    >
                      <td className="table-cell font-mono text-gray-500 text-xs">
                        {c.codigo}
                      </td>
                      <td className="table-cell">
                        <div className="font-semibold text-gray-900">{c.nombre}</div>
                        <div className="text-xs text-gray-500">{c.direccion}</div>
                      </td>
                      <td className="table-cell font-mono text-gray-600 text-xs">
                        {c.nif}
                      </td>
                      <td className="table-cell text-gray-600 text-xs">
                        {c.cp}
                      </td>
                      <td className="table-cell text-center">
                        {hasFolder ? (
                          <span
                            title={c.sharePointFolderName || ""}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "#dcfce7",
                              color: "#16a34a",
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: "#f1f5f9",
                              color: "#94a3b8",
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold" style={{ color }}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <Link
                          href={`/comunidades/${c.id}`}
                          className="text-primary hover:text-blue-700 text-sm font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
