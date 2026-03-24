"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface OneDriveFile {
  id: string;
  name: string;
  size: string;
  modified: string;
  type: string;
  downloadUrl?: string;
  isFolder: boolean;
}

interface Comunidad {
  id: string;
  nombre: string;
}

export default function OneDrivePage() {
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadFiles = useCallback(async (path: string) => {
    try {
      const res = await fetch(`/api/onedrive?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setConnected(false);
      } else {
        setFiles(data.files || []);
        setConnected(data.connected !== false);
      }
    } catch {
      setError("Error al cargar los archivos.");
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/onedrive?status=true").then((r) => r.json()),
      fetch("/api/comunidades?all=true").then((r) => r.json()),
    ])
      .then(async ([statusData, comData]) => {
        setConnected(statusData.connected);
        setComunidades(comData.comunidades || []);
        if (statusData.connected) {
          await loadFiles("/");
        }
      })
      .catch(() => {
        setError("Error al cargar los datos. Inténtalo de nuevo.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadFiles]);

  const navigateToFolder = async (folder: OneDriveFile) => {
    const newPath = currentPath === "/" ? `/${folder.name}` : `${currentPath}/${folder.name}`;
    setPathHistory((prev) => [...prev, currentPath]);
    setCurrentPath(newPath);
    setSelected(new Set());
    setLoading(true);
    await loadFiles(newPath);
    setLoading(false);
  };

  const navigateBack = async () => {
    const prevPath = pathHistory[pathHistory.length - 1] || "/";
    setPathHistory((prev) => prev.slice(0, -1));
    setCurrentPath(prevPath);
    setSelected(new Set());
    setLoading(true);
    await loadFiles(prevPath);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableFiles = files.filter((f) => !f.isFolder && !imported.has(f.id));

  const toggleAll = () => {
    if (selected.size === selectableFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableFiles.map((f) => f.id)));
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

    let importedCount = 0;
    for (const fileId of Array.from(selected)) {
      const file = files.find((f) => f.id === fileId);
      const comunidadId = assignments[fileId];
      if (!file || !comunidadId) continue;

      try {
        const dlRes = await fetch(`/api/onedrive/download?id=${fileId}`);
        const dlData = await dlRes.json();

        await fetch(`/api/comunidades/${comunidadId}/documentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: file.name,
            rutaOneDrive: dlData.downloadUrl || null,
            oneDriveItemId: file.id,
            sizeBytes: 0,
            docTypeId: "",
          }),
        });
        importedCount++;
      } catch (err) {
        console.error("Import error for file:", file.name, err);
      }
    }

    setImported((prev) => {
      const next = new Set(prev);
      selected.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
    setImporting(false);
    setSuccessMsg(
      `${importedCount} archivo${importedCount !== 1 ? "s" : ""} importado${importedCount !== 1 ? "s" : ""} correctamente.`
    );
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/onedrive/disconnect", { method: "POST" });
      setConnected(false);
      setFiles([]);
      setCurrentPath("/");
      setPathHistory([]);
    } catch {
      setError("Error al desconectar.");
    }
    setDisconnecting(false);
  };

  const fileIcon = (file: OneDriveFile) => {
    if (file.isFolder) return "📁";
    if (file.type === "xlsx" || file.type === "xls") return "📊";
    if (file.type === "doc" || file.type === "docx") return "📝";
    return "📄";
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  if (loading && !files.length) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    );
  }

  if (error && !connected) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 className="page-title" style={{ marginBottom: 16 }}>OneDrive</h1>

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
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              {connected ? "OneDrive conectado" : "OneDrive no conectado"}
            </span>
            {connected && <span className="badge-completado">Conectado</span>}
          </div>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {connected
              ? "Tu cuenta de OneDrive está conectada. Navega por tus carpetas y archivos."
              : "Conecta tu cuenta de OneDrive para acceder a tus documentos."}
          </p>
        </div>
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#dc2626",
              background: "none",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {disconnecting ? "Desconectando..." : "Desconectar"}
          </button>
        ) : (
          <a
            href="/api/onedrive/auth"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#2563eb",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Conectar OneDrive →
          </a>
        )}
      </div>

      {connected && (
        <>
          <div className="flex items-center gap-1" style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            <button
              onClick={() => {
                setCurrentPath("/");
                setPathHistory([]);
                setSelected(new Set());
                loadFiles("/");
              }}
              style={{
                fontWeight: 600,
                color: pathParts.length > 0 ? "#2563eb" : "#0f172a",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              OneDrive
            </button>
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span style={{ color: "#cbd5e1" }}>&gt;</span>
                <span style={{ color: i === pathParts.length - 1 ? "#0f172a" : "#64748b", fontWeight: i === pathParts.length - 1 ? 600 : 400 }}>
                  {part}
                </span>
              </span>
            ))}
          </div>

          {currentPath !== "/" && (
            <button
              onClick={navigateBack}
              style={{
                fontSize: 13,
                color: "#2563eb",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                marginBottom: 8,
              }}
            >
              ← Volver
            </button>
          )}

          {successMsg && (
            <div
              className="flex items-center gap-2"
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                color: "#166534",
                marginBottom: 12,
              }}
            >
              <span>✅</span>
              {successMsg}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Cargando archivos...</div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">Esta carpeta está vacía.</div>
          ) : (
            <>
              <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th className="table-header" style={{ width: 40, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectableFiles.length > 0 && selected.size === selectableFiles.length}
                          onChange={toggleAll}
                          style={{ cursor: "pointer", width: 16, height: 16 }}
                        />
                      </th>
                      <th className="table-header" style={{ textAlign: "left" }}>Nombre</th>
                      <th className="table-header" style={{ textAlign: "left", width: 90 }}>Tamaño</th>
                      <th className="table-header" style={{ textAlign: "left", width: 110 }}>Modificado</th>
                      <th className="table-header" style={{ textAlign: "left", width: 220 }}>Comunidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => {
                      const isImported = imported.has(file.id);
                      return (
                        <tr
                          key={file.id}
                          className="table-row"
                          style={{
                            background: selected.has(file.id) ? "#eff6ff" : "transparent",
                            opacity: isImported ? 0.7 : 1,
                            cursor: file.isFolder ? "pointer" : "default",
                          }}
                          onClick={file.isFolder ? () => navigateToFolder(file) : undefined}
                        >
                          <td className="table-cell" style={{ textAlign: "center" }}>
                            {file.isFolder ? null : isImported ? (
                              <span style={{ color: "#22c55e", fontSize: 18 }}>✓</span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={selected.has(file.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(file.id);
                                }}
                                style={{ cursor: "pointer", width: 16, height: 16 }}
                              />
                            )}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <span>{fileIcon(file)}</span>
                              <span style={{ fontWeight: 500, color: file.isFolder ? "#2563eb" : undefined }}>
                                {file.name}
                              </span>
                              {isImported && <span className="badge-completado">Importado</span>}
                            </div>
                          </td>
                          <td className="table-cell" style={{ color: "#64748b" }}>{file.size}</td>
                          <td className="table-cell" style={{ color: "#64748b" }}>{file.modified}</td>
                          <td className="table-cell">
                            {file.isFolder ? null : isImported ? (
                              <span style={{ fontSize: 13, color: "#64748b" }}>
                                {comunidades.find((c) => c.id === assignments[file.id])?.nombre || "—"}
                              </span>
                            ) : (
                              <select
                                value={assignments[file.id] || ""}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  assignCommunity(file.id, e.target.value);
                                }}
                                className="input-field"
                                style={{ fontSize: 14, padding: "6px 10px" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="">Seleccionar...</option>
                                {comunidades.map((c) => (
                                  <option key={c.id} value={c.id}>{c.nombre}</option>
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

              <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
                <button
                  className="btn-primary"
                  disabled={!canImport || importing}
                  onClick={handleImport}
                >
                  {importing ? "Importando..." : "Importar seleccionados"}
                </button>
                {selected.size > 0 && (
                  <span style={{ fontSize: 14, color: "#64748b" }}>
                    {selected.size} archivo{selected.size !== 1 ? "s" : ""} seleccionado{selected.size !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}

      {!connected && (
        <div
          className="flex items-center gap-2"
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 14,
            color: "#1e40af",
          }}
        >
          <span>ℹ️</span>
          Conecta tu cuenta de OneDrive para navegar y importar documentos directamente.
        </div>
      )}
    </div>
  );
}
