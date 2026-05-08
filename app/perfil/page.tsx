"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function PerfilPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async () => {
    setError("");
    setSuccess(false);

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Rellena todos los campos.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cambiar la contraseña.");
      } else {
        setSuccess(true);
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const user = session?.user as { name?: string; email?: string; role?: string } | undefined;

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="mb-6">
        <h1 className="page-title">Mi cuenta</h1>
        <p className="page-subtitle">Información de tu usuario y seguridad</p>
      </div>

      {/* User info card */}
      <div className="card mb-5">
        <div className="section-label mb-4">Información del usuario</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4F7CFF, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{user?.name ?? "—"}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{user?.email ?? "—"}</div>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 10px",
                borderRadius: 20,
                background: user?.role === "ADMIN" ? "#ede9fe" : "#f1f5f9",
                color: user?.role === "ADMIN" ? "#6d28d9" : "#64748b",
              }}
            >
              {user?.role === "ADMIN" ? "Administrador" : "Consulta"}
            </span>
          </div>
        </div>
      </div>

      {/* Change password card */}
      <div className="card mb-5">
        <div className="section-label mb-4">Cambiar contraseña</div>

        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#15803d", fontSize: 13, fontWeight: 600 }}>
            ✅ Contraseña actualizada correctamente.
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Contraseña actual</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="form-input"
              placeholder="Introduce tu contraseña actual"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="form-input"
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
          </div>
          <button
            onClick={handleChange}
            disabled={saving}
            className="btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {saving ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </div>
      </div>

      {/* Sign out card */}
      <div className="card">
        <div className="section-label mb-3">Sesión</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
          Cierra tu sesión en este dispositivo. Tendrás que volver a iniciar sesión para acceder.
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
