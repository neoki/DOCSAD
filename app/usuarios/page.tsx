"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  createdAt: string;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "USER" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = () => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => { setUsers(data.users || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setShowAdd(false);
      setForm({ email: "", name: "", password: "", role: "USER" });
      fetchUsers();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Eliminar al usuario ${name}?`)) return;
    try {
      const res = await fetch("/api/usuarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error || "Error");
      }
    } catch (err) {
      alert(String(err));
    }
  };

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Cargando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          {showAdd ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      {showAdd && (
        <div className="card mb-5">
          <div className="section-label mb-3">Nuevo usuario</div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="form-input"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="form-input">
                <option value="USER">Consulta</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <button onClick={addUser} disabled={saving} className="btn-primary">
            {saving ? "Guardando..." : "Crear usuario"}
          </button>
        </div>
      )}

      <div className="card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 font-semibold text-gray-500">Nombre</th>
              <th className="text-left py-2 px-3 font-semibold text-gray-500">Email</th>
              <th className="text-center py-2 px-3 font-semibold text-gray-500">Rol</th>
              <th className="text-right py-2 px-3 font-semibold text-gray-500">Registrado</th>
              <th className="text-right py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 px-3 font-medium text-gray-700">{u.name}</td>
                <td className="py-2.5 px-3 text-gray-500">{u.email}</td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: u.role === "ADMIN" ? "#ede9fe" : "#f1f5f9",
                      color: u.role === "ADMIN" ? "#6d28d9" : "#64748b",
                    }}
                  >
                    {u.role === "ADMIN" ? "Admin" : "Consulta"}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-gray-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString("es-ES")}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => deleteUser(u.id, u.name)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
