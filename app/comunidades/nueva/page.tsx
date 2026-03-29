"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NuevaComunidadPage() {
  const router = useRouter();
  const [form, setForm] = useState({ codigo: "", nombre: "", nif: "", direccion: "", cp: "", pisos: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.codigo || !form.nombre || !form.nif || !form.direccion) {
      setError("Código, nombre, NIF y dirección son obligatorios.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/comunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pisos: parseInt(form.pisos) || 0 }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al crear la comunidad");
      return;
    }
    const comunidad = await res.json();
    router.push(`/comunidades/${comunidad.id}`);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Link
        href="/comunidades"
        className="inline-flex items-center gap-1 text-sm text-primary font-semibold hover:text-blue-700 mb-4"
        style={{ textDecoration: "none" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver a comunidades
      </Link>

      <div className="card">
        <h1 className="page-title">Nueva comunidad</h1>
        <p className="page-subtitle mb-6">
          Registra una nueva comunidad de propietarios. Se creará automáticamente el checklist documental.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="section-label block mb-1.5">
                  Código Gesfincas *
                </label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => set("codigo", e.target.value)}
                  placeholder="000XXX"
                  className="input-field font-mono"
                  required
                />
              </div>
              <div>
                <label className="section-label block mb-1.5">
                  NIF *
                </label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={(e) => set("nif", e.target.value)}
                  placeholder="H28XXXXXX"
                  className="input-field font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="section-label block mb-1.5">
                Nombre de la comunidad *
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder="C.P. Ejemplo"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="section-label block mb-1.5">
                Dirección *
              </label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => set("direccion", e.target.value)}
                placeholder="Calle, número"
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="section-label block mb-1.5">
                  Código postal
                </label>
                <input
                  type="text"
                  value={form.cp}
                  onChange={(e) => set("cp", e.target.value)}
                  placeholder="15001"
                  className="input-field font-mono"
                />
              </div>
              <div>
                <label className="section-label block mb-1.5">
                  Pisos
                </label>
                <input
                  type="number"
                  value={form.pisos}
                  onChange={(e) => set("pisos", e.target.value)}
                  placeholder="0"
                  className="input-field"
                  min="0"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-danger text-xs mt-3">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creando..." : "Crear comunidad"}
            </button>
            <Link href="/comunidades" className="btn-secondary inline-flex items-center" style={{ textDecoration: "none" }}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
