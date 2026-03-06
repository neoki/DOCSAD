"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";

export default function NuevaComunidadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "",
    nif: "",
    direccion: "",
    pisos: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/comunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pisos: parseInt(form.pisos) || 0,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al crear la comunidad");
      return;
    }

    const created = await res.json();
    router.push(`/comunidades/${created.id}`);
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/comunidades" className="hover:text-blue-600">
              Comunidades
            </Link>
            <span>›</span>
            <span className="text-gray-900">Nueva comunidad</span>
          </div>

          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Nueva comunidad</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la comunidad *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Comunidad Calle Mayor 12"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIF de la comunidad *
                </label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))}
                  placeholder="Ej: H28123456"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                  placeholder="Ej: Calle Mayor 12, Madrid 28001"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de pisos
                </label>
                <input
                  type="number"
                  value={form.pisos}
                  onChange={(e) => setForm((f) => ({ ...f, pisos: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="input-field"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Creando..." : "Crear comunidad"}
                </button>
                <Link href="/comunidades" className="btn-secondary">
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
