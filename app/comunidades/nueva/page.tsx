"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NuevaComunidadPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: "", nif: "", direccion: "", pisos: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.nif || !form.direccion) {
      setError("Nombre, NIF y dirección son obligatorios.");
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
        style={{ color: "#4F7CFF", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 16 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Volver a comunidades
      </Link>

      <div className="card">
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Nueva comunidad</h1>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 24 }}>
          Registra una nueva comunidad de propietarios. Se creará automáticamente el checklist documental con los 27 tipos de documento.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  NIF *
                </label>
                <input
                  type="text"
                  value={form.nif}
                  onChange={(e) => set("nif", e.target.value)}
                  placeholder="H28XXXXXX"
                  className="input-field"
                  style={{ fontFamily: "monospace" }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
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

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Dirección *
              </label>
              <input
                type="text"
                value={form.direccion}
                onChange={(e) => set("direccion", e.target.value)}
                placeholder="Calle, número, ciudad, CP"
                className="input-field"
                required
              />
            </div>
          </div>

          {error && (
            <p style={{ color: "#EF4444", fontSize: 12, marginTop: 12 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creando..." : "Crear comunidad"}
            </button>
            <Link href="/comunidades" className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
