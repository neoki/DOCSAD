"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ChecklistItem = {
  estado: string;
};

type Operativa = {
  usaAgreGasfincas: boolean;
  tieneVideovigilancia: boolean;
  tienePortero: boolean;
  tieneConserje: boolean;
  tieneGarajista: boolean;
  tieneLimpiadora: boolean;
  tieneOtroPersonal: boolean;
  obligadaITE: boolean;
  fechaProximaITE: string | null;
};

type Comunidad = {
  id: string;
  nombre: string;
  nif: string;
  direccion: string;
  operativa: Operativa | null;
  checklists: ChecklistItem[];
};

function calcCompletitud(checklists: ChecklistItem[]): number {
  if (!checklists || checklists.length === 0) return 0;
  const completados = checklists.filter((c) => c.estado === "COMPLETADO").length;
  const noAplica = checklists.filter((c) => c.estado === "NO_APLICA").length;
  const denom = checklists.length - noAplica;
  if (denom <= 0) return 100;
  return Math.round((completados / denom) * 100);
}

function personalCount(op: Operativa | null): number {
  if (!op) return 0;
  return (
    (op.tienePortero ? 1 : 0) +
    (op.tieneConserje ? 1 : 0) +
    (op.tieneGarajista ? 1 : 0) +
    (op.tieneLimpiadora ? 1 : 0) +
    (op.tieneOtroPersonal ? 1 : 0)
  );
}

function progressColor(pct: number): string {
  if (pct >= 70) return "#22C55E";
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

export default function ComunidadesPage() {
  const router = useRouter();
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/comunidades?all=true&pageSize=1000");
      const data = await res.json();
      setComunidades(data.comunidades ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return comunidades;
    const q = search.toLowerCase();
    return comunidades.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.nif.toLowerCase().includes(q) ||
        c.direccion.toLowerCase().includes(q)
    );
  }, [comunidades, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Comunidades</h1>
          <p className="page-subtitle">
            {comunidades.length} comunidades registradas
          </p>
        </div>
        <Link href="/comunidades/nueva" className="btn-primary" style={{ textDecoration: "none" }}>
          + Nueva comunidad
        </Link>
      </div>

      <div className="card mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, NIF o dirección..."
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
                  <th className="table-header text-left">Comunidad</th>
                  <th className="table-header text-left">NIF</th>
                  <th className="table-header text-left">Dirección</th>
                  <th className="table-header text-left">Completitud</th>
                  <th className="table-header text-center">GESFINCAS</th>
                  <th className="table-header text-center">Videovig.</th>
                  <th className="table-header text-center">Personal</th>
                  <th className="table-header text-center">ITE</th>
                  <th className="table-header text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const pct = calcCompletitud(c.checklists);
                  const color = progressColor(pct);
                  const personal = personalCount(c.operativa);
                  const op = c.operativa;

                  return (
                    <tr
                      key={c.id}
                      className="table-row cursor-pointer"
                      onClick={() => router.push(`/comunidades/${c.id}`)}
                    >
                      <td className="table-cell">
                        <div className="font-semibold text-gray-900">{c.nombre}</div>
                        <div className="text-xs text-gray-500">{c.direccion}</div>
                      </td>
                      <td className="table-cell font-mono text-gray-600 text-xs">
                        {c.nif}
                      </td>
                      <td className="table-cell text-gray-600 text-xs max-w-[200px] truncate">
                        {c.direccion}
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
                      <td className="table-cell text-center">
                        <span className={op?.usaAgreGasfincas ? "badge-si" : "badge-no"}>
                          {op?.usaAgreGasfincas ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className={op?.tieneVideovigilancia ? "badge-si" : "badge-no"}>
                          {op?.tieneVideovigilancia ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-xs text-gray-700 font-semibold">
                          {personal} {personal === 1 ? "rol" : "roles"}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        {op?.obligadaITE ? (
                          <span className="text-xs">
                            <span className="badge-si">Sí</span>
                            {op.fechaProximaITE && (
                              <span className="text-gray-500 ml-1">
                                {new Date(op.fechaProximaITE).toLocaleDateString("es-ES")}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="badge-no">No</span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <Link
                          href={`/comunidades/${c.id}`}
                          className="text-primary hover:text-blue-700 text-sm font-semibold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Ver →
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
