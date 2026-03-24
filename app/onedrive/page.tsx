"use client";

import { useState, useEffect, useCallback } from "react";

interface OneDriveFile {
  id: string;
  name: string;
  size: string;
  modified: string;
  type: string;
  downloadUrl?: string;
  isFolder: boolean;
  driveId?: string;
}

interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

interface SharePointDrive {
  id: string;
  name: string;
  driveType: string;
}

interface Comunidad {
  id: string;
  nombre: string;
}

type ViewMode = "sites" | "drives" | "files";

export default function OneDrivePage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("sites");
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [drives, setDrives] = useState<SharePointDrive[]>([]);
  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);

  const [currentSite, setCurrentSite] = useState<SharePointSite | null>(null);
  const [currentDrive, setCurrentDrive] = useState<SharePointDrive | null>(null);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onedrive?action=sites");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setConnected(false);
      } else {
        setSites(data.sites || []);
        setConnected(true);
      }
    } catch {
      setError("Error al cargar los sitios de SharePoint.");
    }
    setLoading(false);
  }, []);

  const loadDrives = async (site: SharePointSite) => {
    setLoading(true);
    setCurrentSite(site);
    setViewMode("drives");
    try {
      const res = await fetch(`/api/onedrive?action=drives&siteId=${encodeURIComponent(site.id)}`);
      const data = await res.json();
      setDrives(data.drives || []);
    } catch {
      setError("Error al cargar las bibliotecas.");
    }
    setLoading(false);
  };

  const loadFiles = async (drive: SharePointDrive, folderId?: string) => {
    setLoading(true);
    if (!folderId) {
      setCurrentDrive(drive);
      setFolderStack([]);
    }
    setViewMode("files");
    setSelected(new Set());
    try {
      let url = `/api/onedrive?action=files&driveId=${encodeURIComponent(drive.id)}`;
      if (folderId) url += `&folderId=${encodeURIComponent(folderId)}`;
      const res = await fetch(url);
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setError("Error al cargar los archivos.");
    }
    setLoading(false);
  };

  const navigateToFolder = async (folder: OneDriveFile) => {
    if (!currentDrive) return;
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    await loadFiles(currentDrive, folder.id);
  };

  const navigateBack = async () => {
    if (!currentDrive) return;
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : undefined;
    await loadFiles(currentDrive, parentId);
  };

  const goToSites = () => {
    setViewMode("sites");
    setCurrentSite(null);
    setCurrentDrive(null);
    setFolderStack([]);
    setSelected(new Set());
  };

  const goToDrives = () => {
    setViewMode("drives");
    setCurrentDrive(null);
    setFolderStack([]);
    setSelected(new Set());
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/onedrive?status=true").then((r) => r.json()),
      fetch("/api/comunidades?all=true").then((r) => r.json()),
    ])
      .then(async ([statusData, comData]) => {
        setConnected(statusData.connected);
        setComunidades(comData.comunidades || []);
        if (statusData.connected) {
          await loadSites();
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Error al cargar los datos.");
        setLoading(false);
      });
  }, [loadSites]);

  const recheckConnection = useCallback(async () => {
    setCheckingConnection(true);
    try {
      const res = await fetch("/api/onedrive?status=true");
      const data = await res.json();
      if (data.connected && !connected) {
        setConnected(true);
        await loadSites();
      }
    } catch {}
    setCheckingConnection(false);
  }, [connected, loadSites]);

  useEffect(() => {
    if (connected) return;
    const onFocus = () => { recheckConnection(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [connected, recheckConnection]);

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
    if (!canImport || !currentDrive) return;
    setImporting(true);
    setSuccessMsg("");

    let importedCount = 0;
    for (const fileId of Array.from(selected)) {
      const file = files.find((f) => f.id === fileId);
      const comunidadId = assignments[fileId];
      if (!file || !comunidadId) continue;

      try {
        await fetch(`/api/comunidades/${comunidadId}/documentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: file.name,
            oneDriveItemId: `${currentDrive.id}:${file.id}`,
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
      setSites([]);
      setDrives([]);
      setFiles([]);
      setCurrentSite(null);
      setCurrentDrive(null);
      setFolderStack([]);
      setViewMode("sites");
    } catch {
      setError("Error al desconectar.");
    }
    setDisconnecting(false);
  };

  const fileIcon = (file: OneDriveFile) => {
    if (file.isFolder) return "📁";
    const t = file.type;
    if (t === "xlsx" || t === "xls") return "📊";
    if (t === "doc" || t === "docx") return "📝";
    if (t === "pdf") return "📕";
    return "📄";
  };

  if (loading && !sites.length && !files.length) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <p className="text-sm text-slate-400">Cargando...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 className="page-title" style={{ marginBottom: 16 }}>SharePoint / OneDrive</h1>

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
              {connected ? "Microsoft 365 conectado" : "Microsoft 365 no conectado"}
            </span>
            {connected && <span className="badge-completado">Conectado</span>}
          </div>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {connected
              ? "Navega por los sitios de SharePoint y sus bibliotecas de documentos."
              : "Conecta tu cuenta de Microsoft 365 para acceder a SharePoint."}
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
          <button
            onClick={async () => {
              try {
                const res = await fetch("/api/onedrive/auth");
                const data = await res.json();
                if (data.authUrl) {
                  window.open(data.authUrl, "_blank", "noopener,noreferrer");
                }
              } catch {
                setError("Error al iniciar la conexión.");
              }
            }}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#2563eb",
              background: "none",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Conectar Microsoft 365 →
          </button>
        )}
      </div>

      {error && (
        <div
          className="flex items-center gap-2"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
            color: "#991b1b",
            marginBottom: 12,
          }}
        >
          <span>⚠️</span>
          {error}
          <button
            onClick={() => setError("")}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {connected && (
        <>
          <div className="flex items-center gap-1" style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            <button
              onClick={goToSites}
              style={{
                fontWeight: 600,
                color: viewMode !== "sites" ? "#2563eb" : "#0f172a",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              SharePoint
            </button>
            {currentSite && (
              <>
                <span style={{ color: "#cbd5e1" }}>&gt;</span>
                <button
                  onClick={goToDrives}
                  style={{
                    fontWeight: viewMode === "drives" ? 600 : 400,
                    color: viewMode !== "drives" ? "#2563eb" : "#0f172a",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {currentSite.name}
                </button>
              </>
            )}
            {currentDrive && (
              <>
                <span style={{ color: "#cbd5e1" }}>&gt;</span>
                <span style={{ fontWeight: folderStack.length === 0 ? 600 : 400, color: folderStack.length === 0 ? "#0f172a" : "#64748b" }}>
                  {currentDrive.name}
                </span>
              </>
            )}
            {folderStack.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <span style={{ color: "#cbd5e1" }}>&gt;</span>
                <span style={{ fontWeight: i === folderStack.length - 1 ? 600 : 400, color: i === folderStack.length - 1 ? "#0f172a" : "#64748b" }}>
                  {f.name}
                </span>
              </span>
            ))}
          </div>

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
            <div className="py-8 text-center text-gray-500 text-sm">Cargando...</div>
          ) : viewMode === "sites" ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="table-header" style={{ textAlign: "left" }}>Sitio de SharePoint</th>
                    <th className="table-header" style={{ textAlign: "left", width: 300 }}>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="table-cell" style={{ textAlign: "center", color: "#94a3b8" }}>
                        No se encontraron sitios de SharePoint.
                      </td>
                    </tr>
                  ) : (
                    sites.map((site) => (
                      <tr
                        key={site.id}
                        className="table-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => loadDrives(site)}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span>🌐</span>
                            <span style={{ fontWeight: 500, color: "#2563eb" }}>{site.name}</span>
                          </div>
                        </td>
                        <td className="table-cell" style={{ color: "#64748b", fontSize: 13 }}>
                          {site.webUrl}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === "drives" ? (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="table-header" style={{ textAlign: "left" }}>Biblioteca de documentos</th>
                    <th className="table-header" style={{ textAlign: "left", width: 150 }}>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {drives.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="table-cell" style={{ textAlign: "center", color: "#94a3b8" }}>
                        No se encontraron bibliotecas en este sitio.
                      </td>
                    </tr>
                  ) : (
                    drives.map((drive) => (
                      <tr
                        key={drive.id}
                        className="table-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => loadFiles(drive)}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span>📚</span>
                            <span style={{ fontWeight: 500, color: "#2563eb" }}>{drive.name}</span>
                          </div>
                        </td>
                        <td className="table-cell" style={{ color: "#64748b" }}>
                          {drive.driveType === "documentLibrary" ? "Documentos" : drive.driveType}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {folderStack.length > 0 && (
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

              {files.length === 0 ? (
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
        </>
      )}

      {!connected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
            Haz clic en "Conectar Microsoft 365" para abrir el login en una nueva pestaña. Después de autorizar, vuelve aquí.
          </div>
          <button
            onClick={recheckConnection}
            disabled={checkingConnection}
            className="btn-primary"
            style={{ alignSelf: "flex-start" }}
          >
            {checkingConnection ? "Verificando..." : "Verificar conexión"}
          </button>
        </div>
      )}
    </div>
  );
}
