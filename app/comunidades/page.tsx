"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";

type Comunidad = {
  id: string;
  nombre: string;
  nif: string;
  direccion: string;
  pisos: number;
  _count: { checklists: number; documentos: number; alertas: number };
};

export default function ComunidadesPage() {
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const fetchComunidades = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      page: String(page),
      pageSize: String(pageSize),
    });
    const res = await fetch(`/api/comunidades?${params}`);
    const data = await res.json();
    setComunidades(data.comunidades ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchComunidades();
  }, [fetchComunidades]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Comunidades</h1>
              <p className="text-gray-500 mt-1">{total} comunidades registradas</p>
            </div>
            <Link href="/comunidades/nueva" className="btn-primary">
              + Nueva comunidad
            </Link>
          </div>

          {/* Search */}
          <div className="card mb-6">
            <input
              type="text"
              placeholder="Buscar por nombre, NIF o dirección..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input-field"
            />
          </div>

          {/* List */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : comunidades.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No se encontraron comunidades.{" "}
                <Link href="/comunidades/nueva" className="text-blue-600 hover:underline">
                  Crear la primera
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comunidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NIF
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pisos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Docs
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {comunidades.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{c.nombre}</div>
                        <div className="text-sm text-gray-500">{c.direccion}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.nif}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.pisos}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="badge-completado">{c._count.documentos} docs</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/comunidades/${c.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver detalle →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Mostrando {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, total)} de {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm py-1 px-3"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
