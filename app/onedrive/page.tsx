"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DemoFile {
  id: string;
  name: string;
  size: string;
  modified: string;
  type: string;
}

interface Comunidad {
  id: string;
  nombre: string;
}

export default function OneDrivePage() {
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState<DemoFile[]>([]);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/onedrive?status=true").then((r) => r.json()),
      fetch("/api/onedrive").then((r) => r.json()),
      fetch("/api/comunidades?all=true").then((r) => r.json()),
    ])
      .then(([statusData, filesData, comData]) => {
        setConnected(statusData.connected);
        setFiles(filesData.files || []);
        setComunidades(comData.comunidades || []);
      })
      .catch(() => {
        setError("Error al cargar los datos. Inténtalo de nuevo.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === files.filter((f) => !imported.has(f.id)).length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.filter((f) => !imported.has(f.id)).map((f) => f.id)));
    }
  };

  const assignCommunity = (fileId: string, comunidadId: string) => {
    setAssignments((prev) => ({ ...prev, [fileId]: comunidadId }));
  };

  const canImport =
    selected.size > 0 &&
    Array.from(selected).every((id) => assignments[id] && assignments[id] !== "");

  const handleImport = async () => {
    if (!canImport) return;
    setImporting(true);
    setSuccessMsg("");

    await new Promise((r) => setTimeout(r, 1500));

    const count = selected.size;
    setImported((prev) => {
      const next = new Set(prev);
      selected.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
    setImporting(false);
    setSuccessMsg(
      `${count} archivos importados correctamente. La IA clasificará los documentos automáticamente.`
    );
  };

  const fileIcon = (type: string) => {
    if (type === "xlsx") return "📊";
    return "📄";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>OneDrive</h1>

      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
          border: connected ? "1px solid #bbf7d0" : "1px solid #fde68a",
          background: connected ? "#f0fdf4" : "#fffbeb",
        }}
      >
        <span style={{ fontSize: 32 }}>☁️</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {connected ? "OneDrive conectado" : "OneDrive no conectado"}
            </span>
            {connected && <span className="badge-completado">Conectado</span>}
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>
            {connected
              ? "Tu carpeta de OneDrive está sincronizada."
              : "Configura las credenciales de Azure para conectar tu carpeta de OneDrive"}
          </p>
        </div>
        {!connected && (
          <Link
            href="/ajustes"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#2563eb",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Ir a Ajustes →
          </Link>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <span className="section-label">
          {connected ? "Archivos" : "Vista previa (demo)"}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontWeight: 600 }}>OneDrive</span>
        <span style={{ color: "#cbd5e1" }}>&gt;</span>
        <span style={{ fontWeight: 600 }}>DocFincas</span>
        <span style={{ color: "#cbd5e1" }}>&gt;</span>
        <span style={{ color: "#0f172a" }}>Documentos</span>
      </div>

      {successMsg && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "#166534",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✅</span>
          {successMsg}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "8px 12px", width: 32, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={
                    files.filter((f) => !imported.has(f.id)).length > 0 &&
                    selected.size === files.filter((f) => !imported.has(f.id)).length
                  }
                  onChange={toggleAll}
                  style={{ cursor: "pointer" }}
                />
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569" }}>
                Nombre
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", width: 80 }}>
                Tamaño
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", width: 100 }}>
                Modificado
              </th>
              <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", width: 180 }}>
                Comunidad
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const isImported = imported.has(file.id);
              return (
                <tr
                  key={file.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: selected.has(file.id) ? "#eff6ff" : "transparent",
                    opacity: isImported ? 0.7 : 1,
                  }}
                >
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    {isImported ? (
                      <span style={{ color: "#22c55e", fontSize: 16 }}>✓</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selected.has(file.id)}
                        onChange={() => toggleSelect(file.id)}
                        style={{ cursor: "pointer" }}
                      />
                    )}
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{fileIcon(file.type)}</span>
                      <span style={{ fontWeight: 500 }}>{file.name}</span>
                      {isImported && <span className="badge-completado">Importado</span>}
                    </div>
                  </td>
                  <td style={{ padding: "8px 12px", color: "#64748b" }}>{file.size}</td>
                  <td style={{ padding: "8px 12px", color: "#64748b" }}>{file.modified}</td>
                  <td style={{ padding: "8px 12px" }}>
                    {isImported ? (
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        {comunidades.find((c) => c.id === assignments[file.id])?.nombre || "—"}
                      </span>
                    ) : (
                      <select
                        value={assignments[file.id] || ""}
                        onChange={(e) => assignCommunity(file.id, e.target.value)}
                        style={{
                          width: "100%",
                          fontSize: 11,
                          padding: "4px 6px",
                          border: "1px solid #e2e8f0",
                          borderRadius: 6,
                          background: "#fff",
                          color: "#0f172a",
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {comunidades.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          className="btn-primary"
          disabled={!canImport || importing}
          onClick={handleImport}
          style={{ fontSize: 13, padding: "8px 20px" }}
        >
          {importing ? "Importando..." : "Importar seleccionados"}
        </button>
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {selected.size} archivo{selected.size !== 1 ? "s" : ""} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!connected && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            color: "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>ℹ️</span>
          En modo demo. Conecta OneDrive desde Ajustes para acceder a tus archivos reales.
        </div>
      )}
    </div>
  );
}
