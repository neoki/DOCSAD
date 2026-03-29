"use client";

import { useState, useEffect, useCallback } from "react";

type FileItem = {
  id: string;
  name: string;
  size: number;
  isFolder: boolean;
  lastModified: string;
  webUrl?: string;
  downloadUrl?: string;
  mimeType?: string;
};

type BreadcrumbItem = {
  id: string | null;
  name: string;
};

function formatSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string, mimeType?: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return { bg: "#fef2f2", color: "#ef4444", label: "PDF" };
  }
  if (["doc", "docx"].includes(ext) || mimeType?.includes("word")) {
    return { bg: "#eff6ff", color: "#3b82f6", label: "DOC" };
  }
  if (["xls", "xlsx"].includes(ext) || mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) {
    return { bg: "#f0fdf4", color: "#22c55e", label: "XLS" };
  }
  if (["ppt", "pptx"].includes(ext) || mimeType?.includes("presentation")) {
    return { bg: "#fff7ed", color: "#f97316", label: "PPT" };
  }
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext) || mimeType?.startsWith("image/")) {
    return { bg: "#fff7ed", color: "#f97316", label: "IMG" };
  }
  if (["mp4", "avi", "mov", "wmv"].includes(ext) || mimeType?.startsWith("video/")) {
    return { bg: "#faf5ff", color: "#8b5cf6", label: "VID" };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return { bg: "#fef3c7", color: "#d97706", label: "ZIP" };
  }
  if (["txt", "csv", "log"].includes(ext)) {
    return { bg: "#f1f5f9", color: "#64748b", label: "TXT" };
  }
  return { bg: "#f1f5f9", color: "#64748b", label: ext.toUpperCase() || "FILE" };
}

type ComunidadInfo = {
  codigo: string;
  nombre: string;
  sharePointFolderName: string | null;
  sharePointDriveId: string | null;
  sharePointFolderId: string | null;
  sharePointMatchMethod: string | null;
  sharePointMatchScore: number | null;
};

export default function DocumentosTab({ comunidadId }: { comunidadId: string }) {
  const [comunidad, setComunidad] = useState<ComunidadInfo | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [connected, setConnected] = useState(true);

  const fetchComunidad = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${comunidadId}`);
    if (res.ok) {
      const data = await res.json();
      setComunidad(data);
    }
  }, [comunidadId]);

  const fetchFiles = useCallback(async (folderId?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ action: "files" });
      if (folderId) params.set("folderId", folderId);
      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint?${params}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "SharePoint no conectado") {
          setConnected(false);
        }
        if (!data.linked) {
          setFiles([]);
        } else {
          setError(data.error || "Error al cargar archivos");
        }
        setLoading(false);
        return;
      }

      setConnected(true);
      setFiles(data.files || []);
    } catch {
      setError("Error de conexión");
    }
    setLoading(false);
  }, [comunidadId]);

  useEffect(() => {
    fetchComunidad();
  }, [fetchComunidad]);

  useEffect(() => {
    if (comunidad?.sharePointDriveId && comunidad?.sharePointFolderId) {
      fetchFiles(currentFolderId || undefined);
    } else {
      setLoading(false);
    }
  }, [comunidad, currentFolderId, fetchFiles]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
    setCurrentFolderId(folderId);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setBreadcrumbs([]);
    } else {
      setCurrentFolderId(breadcrumbs[index].id);
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
    }
  };

  const handleCreateFolder = async () => {
    if (!comunidad) return;
    setCreating(true);
    setError("");

    try {
      const sitesRes = await fetch("/api/onedrive?action=sites");
      const sitesData = await sitesRes.json();
      const sites = sitesData.sites || [];

      if (sites.length === 0) {
        setError("No se encontraron sitios SharePoint. Verifica la conexión.");
        setCreating(false);
        return;
      }

      const drivesRes = await fetch(`/api/onedrive?action=drives&siteId=${sites[0].id}`);
      const drivesData = await drivesRes.json();
      const drives = drivesData.drives || [];

      if (drives.length === 0) {
        setError("No se encontraron bibliotecas de documentos.");
        setCreating(false);
        return;
      }

      const folderName = `${comunidad.codigo}. ${comunidad.nombre}`;

      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-folder",
          driveId: drives[0].id,
          siteId: sites[0].id,
          folderName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al crear la carpeta");
      } else {
        await fetchComunidad();
        setCurrentFolderId(null);
        setBreadcrumbs([]);
      }
    } catch {
      setError("Error de conexión al crear carpeta");
    }
    setCreating(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !comunidad?.sharePointDriveId) return;

    setUploading(true);
    setError("");

    try {
      const folderId = currentFolderId || comunidad.sharePointFolderId;
      if (!folderId) return;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderId", folderId);

      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al subir archivo");
      } else {
        await fetchFiles(currentFolderId || undefined);
      }
    } catch {
      setError("Error al subir el archivo");
    }
    setUploading(false);
    e.target.value = "";
  };

  if (!connected) {
    return (
      <div className="card-static py-16 text-center">
        <div className="text-gray-400 mb-2" style={{ fontSize: 32 }}>
          🔗
        </div>
        <p className="text-gray-500 text-sm mb-2">
          OneDrive/SharePoint no está conectado
        </p>
        <a href="/onedrive" className="text-blue-600 text-sm font-semibold hover:text-blue-800">
          Conectar OneDrive →
        </a>
      </div>
    );
  }

  const hasFolder = !!(comunidad?.sharePointDriveId && comunidad?.sharePointFolderId);
  const hasFolderName = !!comunidad?.sharePointFolderName;

  if (!hasFolder && !hasFolderName) {
    return (
      <div className="card-static py-16 text-center">
        <div className="text-gray-400 mb-2" style={{ fontSize: 32 }}>
          📁
        </div>
        <p className="text-gray-500 text-sm mb-3">
          Esta comunidad no tiene carpeta de documentos en OneDrive
        </p>
        {error && (
          <p className="text-red-500 text-xs mb-3">{error}</p>
        )}
        <button
          onClick={handleCreateFolder}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? "Creando carpeta..." : "Crear carpeta en OneDrive"}
        </button>
        <p className="text-gray-400 text-xs mt-3">
          Se creará: <strong>{comunidad?.codigo}. {comunidad?.nombre}</strong>
        </p>
      </div>
    );
  }

  if (hasFolderName && !hasFolder) {
    const isRevisar = comunidad?.sharePointMatchMethod === "REVISAR";
    return (
      <div className="card-static py-12 text-center">
        <div className="text-gray-400 mb-2" style={{ fontSize: 32 }}>
          📂
        </div>
        <p className="text-gray-700 text-sm mb-1 font-semibold">
          Carpeta asignada: {comunidad?.sharePointFolderName}
        </p>
        {isRevisar && (
          <div
            className="mx-auto mb-3 text-xs font-semibold rounded-lg"
            style={{
              maxWidth: 480,
              padding: "10px 16px",
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fde68a",
            }}
          >
            ⚠ Coincidencia automática ({comunidad?.sharePointMatchScore}%) — Revisa que esta carpeta corresponde realmente a esta comunidad antes de vincular.
          </div>
        )}
        <p className="text-gray-500 text-xs mb-4">
          La carpeta existe en OneDrive pero no está vinculada todavía. Vincula la carpeta para ver los documentos.
        </p>
        {error && (
          <p className="text-red-500 text-xs mb-3">{error}</p>
        )}
        <button
          onClick={handleCreateFolder}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? "Vinculando..." : "Vincular carpeta"}
        </button>
      </div>
    );
  }

  const folders = files.filter((f) => f.isFolder);
  const regularFiles = files.filter((f) => !f.isFolder);
  const filteredFiles = search.trim()
    ? regularFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : regularFiles;
  const filteredFolders = search.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : folders;

  const totalSize = regularFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateToBreadcrumb(-1)}
            className={`text-xs font-semibold cursor-pointer bg-transparent border-none ${breadcrumbs.length > 0 ? "text-blue-600 hover:text-blue-800" : "text-gray-700"}`}
          >
            {comunidad?.sharePointFolderName || "Raíz"}
          </button>
          {breadcrumbs.map((bc, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">/</span>
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`text-xs font-semibold cursor-pointer bg-transparent border-none ${isLast ? "text-gray-700" : "text-blue-600 hover:text-blue-800"}`}
                >
                  {bc.name}
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {regularFiles.length} archivos · {formatSize(totalSize)}
          </span>
          <label className="btn-primary text-xs cursor-pointer" style={{ padding: "6px 14px" }}>
            {uploading ? "Subiendo..." : "Subir documento"}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre de archivo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          style={{ fontSize: 13 }}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm py-8 text-center">
          Cargando documentos...
        </div>
      ) : (
        <div className="card-static p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-left">Nombre</th>
                <th className="table-header text-left" style={{ width: 120 }}>Fecha</th>
                <th className="table-header text-right" style={{ width: 100 }}>Tamaño</th>
                <th className="table-header text-right" style={{ width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredFolders.map((folder) => (
                <tr
                  key={folder.id}
                  className="table-row cursor-pointer"
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: "#fef3c7", color: "#d97706" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-gray-900">{folder.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-500 text-sm">
                    {folder.lastModified ? new Date(folder.lastModified).toLocaleDateString("es-ES") : "-"}
                  </td>
                  <td className="table-cell text-right text-gray-400 text-sm">
                    -
                  </td>
                  <td className="table-cell text-right">
                    <span className="text-xs text-blue-600 font-semibold">Abrir →</span>
                  </td>
                </tr>
              ))}
              {filteredFiles.map((file) => {
                const icon = getFileIcon(file.name, file.mimeType);
                return (
                  <tr key={file.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: icon.bg, color: icon.color }}
                        >
                          {icon.label}
                        </div>
                        <span className="font-semibold text-gray-900 truncate">{file.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-500 text-sm">
                      {file.lastModified ? new Date(file.lastModified).toLocaleDateString("es-ES") : "-"}
                    </td>
                    <td className="table-cell text-right text-gray-500 text-sm">
                      {formatSize(file.size)}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-3">
                        {file.webUrl && (
                          <a
                            href={file.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver
                          </a>
                        )}
                        {file.downloadUrl && (
                          <a
                            href={file.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-gray-600 hover:text-gray-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Descargar
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                    {search ? "No se encontraron archivos con ese nombre" : "Esta carpeta está vacía"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
