"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type SPFile = {
  id: string;
  driveId?: string;
  name: string;
  size: number;
  mimeType?: string;
  lastModified?: string;
  webUrl?: string;
  isFolder: boolean;
};

type SPSubfolder = {
  id: string;
  name: string;
  fileCount: number;
  isStandard: boolean;
};

type OcrData = {
  sharePointItemId: string;
  importe: number | null;
  moneda: string;
  proveedor: string | null;
  fechaFactura: string | null;
  status: string;
};

type Expiry = {
  sharePointItemId: string;
  label: string;
  expiresAt: string;
};

function formatSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryColor(days: number): { bg: string; color: string; border: string } {
  if (days < 0) return { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" };
  if (days <= 30) return { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" };
  if (days <= 90) return { bg: "#fefce8", color: "#ca8a04", border: "#fde68a" };
  return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
}

function getFileIcon(name: string, mimeType?: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType?.includes("pdf")) return { bg: "#fef2f2", color: "#ef4444", label: "PDF" };
  if (["doc", "docx"].includes(ext) || mimeType?.includes("word")) return { bg: "#eff6ff", color: "#3b82f6", label: "DOC" };
  if (["xls", "xlsx"].includes(ext) || mimeType?.includes("excel") || mimeType?.includes("spreadsheet")) return { bg: "#f0fdf4", color: "#22c55e", label: "XLS" };
  if (["ppt", "pptx"].includes(ext) || mimeType?.includes("presentation")) return { bg: "#fff7ed", color: "#f97316", label: "PPT" };
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(ext) || mimeType?.startsWith("image/")) return { bg: "#fff7ed", color: "#f97316", label: "IMG" };
  if (["mp4", "avi", "mov", "wmv"].includes(ext)) return { bg: "#faf5ff", color: "#8b5cf6", label: "VID" };
  if (["zip", "rar", "7z"].includes(ext)) return { bg: "#fef3c7", color: "#d97706", label: "ZIP" };
  return { bg: "#f1f5f9", color: "#64748b", label: ext.toUpperCase() || "FILE" };
}

const EXPIRY_LABELS = [
  "Seguro",
  "Contrato mantenimiento",
  "Contrato limpieza",
  "Contrato ascensor",
  "Licencia",
  "Certificado",
  "Garantía",
  "Otro",
];

const ROOT_KEY = "__root__";

function ExpiryModal({
  file,
  comunidadId,
  existing,
  onClose,
  onSaved,
}: {
  file: SPFile;
  comunidadId: string;
  existing: Expiry | null;
  onClose: () => void;
  onSaved: (expiry: Expiry | null) => void;
}) {
  const [label, setLabel] = useState(existing?.label || EXPIRY_LABELS[0]);
  const [customLabel, setCustomLabel] = useState(
    existing?.label && !EXPIRY_LABELS.includes(existing.label) ? existing.label : ""
  );
  const [useCustom, setUseCustom] = useState(
    !!(existing?.label && !EXPIRY_LABELS.includes(existing.label))
  );
  const [date, setDate] = useState(
    existing?.expiresAt ? existing.expiresAt.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const effectiveLabel = useCustom ? customLabel : label;

  async function handleSave() {
    if (!effectiveLabel.trim() || !date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vencimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharePointItemId: file.id,
          comunidadId,
          fileName: file.name,
          label: effectiveLabel.trim(),
          expiresAt: date,
        }),
      });
      const data = await res.json();
      onSaved({ sharePointItemId: file.id, label: effectiveLabel.trim(), expiresAt: data.expiry.expiresAt });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/vencimientos?itemId=${file.id}`, { method: "DELETE" });
      onSaved(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 12, padding: 28, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#1e293b" }}>Fecha de vencimiento</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20, wordBreak: "break-all" }}>{file.name}</div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Tipo de vencimiento</label>
          {!useCustom ? (
            <select value={label} onChange={(e) => setLabel(e.target.value)} className="form-input" style={{ width: "100%" }}>
              {EXPIRY_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          ) : (
            <input type="text" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Ej: Contrato OTIS" className="form-input" style={{ width: "100%" }} />
          )}
          <button onClick={() => setUseCustom(!useCustom)} style={{ fontSize: 11, color: "#4F7CFF", background: "none", border: "none", cursor: "pointer", marginTop: 6, padding: 0 }}>
            {useCustom ? "← Usar tipo predefinido" : "Escribir tipo personalizado →"}
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Fecha de vencimiento</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" style={{ width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {existing && (
            <button onClick={handleDelete} disabled={deleting} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", fontSize: 13, cursor: "pointer" }}>
              {deleting ? "Eliminando..." : "Quitar vencimiento"}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer" }}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !effectiveLabel.trim() || !date}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: saving || !effectiveLabel.trim() || !date ? "#e2e8f0" : "#4F7CFF", color: saving || !effectiveLabel.trim() || !date ? "#94a3b8" : "#fff", fontSize: 13, cursor: saving || !effectiveLabel.trim() || !date ? "default" : "pointer", fontWeight: 600 }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtImporte(importe: number | null, moneda: string): string {
  if (importe === null) return "";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda || "EUR", maximumFractionDigits: 0 }).format(importe);
}

export default function DocumentosTab({ comunidadId }: { comunidadId: string }) {
  const [subfolders, setSubfolders] = useState<SPSubfolder[]>([]);
  const [rootFiles, setRootFiles] = useState<SPFile[]>([]);
  const [folderFiles, setFolderFiles] = useState<SPFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expiries, setExpiries] = useState<Map<string, Expiry>>(new Map());
  const [ocrMap, setOcrMap] = useState<Map<string, OcrData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [linked, setLinked] = useState(true);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [currentSubfolderName, setCurrentSubfolderName] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expiryModal, setExpiryModal] = useState<SPFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingOcr, setAnalyzingOcr] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSubfolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint?action=subfolders`);
      const data = await res.json();
      if (!data.linked) {
        setLinked(false);
      } else {
        setLinked(true);
        setSubfolders(data.subfolders || []);
        setRootFiles((data.rootFiles || []).filter((f: SPFile) => !f.isFolder));
        setFolderName(data.folderName || null);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [comunidadId]);

  const loadFolderFiles = useCallback(async (folderId: string) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint?action=files&folderId=${encodeURIComponent(folderId)}`);
      const data = await res.json();
      setFolderFiles((data.files || []).filter((f: SPFile) => !f.isFolder));
    } catch {
      // silently ignore
    } finally {
      setLoadingFiles(false);
    }
  }, [comunidadId]);

  const loadExpiries = useCallback(async () => {
    try {
      const res = await fetch(`/api/vencimientos?comunidadId=${comunidadId}`);
      const data = await res.json();
      const map = new Map<string, Expiry>();
      for (const e of data.expiries || []) {
        map.set(e.sharePointItemId, e);
      }
      setExpiries(map);
    } catch {
      // silently ignore
    }
  }, [comunidadId]);

  const loadOcr = useCallback(async () => {
    try {
      const res = await fetch(`/api/comunidades/${comunidadId}/facturas`);
      if (!res.ok) return;
      const data = await res.json();
      const map = new Map<string, OcrData>();
      for (const f of data.facturas ?? []) {
        map.set(f.sharePointItemId, f);
      }
      setOcrMap(map);
    } catch {
      // silently ignore
    }
  }, [comunidadId]);

  useEffect(() => {
    loadSubfolders();
    loadExpiries();
    loadOcr();
  }, [loadSubfolders, loadExpiries, loadOcr]);

  function handleTabChange(folderId: string | null, subName?: string) {
    setCurrentFolderId(folderId);
    setCurrentSubfolderName(subName ?? null);
    setSearch("");
    setFolderFiles([]);
    if (folderId !== null) {
      loadFolderFiles(folderId);
    }
  }

  const currentFiles = currentFolderId === null ? rootFiles : folderFiles;
  const displayFiles = search
    ? currentFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : currentFiles;

  const handleDownload = async (file: SPFile) => {
    setDownloading(file.id);
    try {
      const res = await fetch(`/api/files/download?driveId=${file.driveId}&itemId=${file.id}`);
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = file.name;
        a.click();
      }
    } catch {
      // silently ignore
    } finally {
      setDownloading(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAnalyzingOcr(false);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolderId) formData.append("folderId", currentFolderId);
      if (currentSubfolderName) formData.append("folderName", currentSubfolderName);
      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "Error al subir el archivo");
      } else {
        if (currentFolderId !== null) {
          await loadFolderFiles(currentFolderId);
        } else {
          await loadSubfolders();
        }
        if (data.ocrQueued) {
          setAnalyzingOcr(true);
          const pollOcr = async () => {
            for (let i = 0; i < 15; i++) {
              await new Promise((r) => setTimeout(r, 4000));
              await loadOcr();
              const res2 = await fetch(`/api/comunidades/${comunidadId}/facturas`);
              if (res2.ok) {
                const d = await res2.json();
                const hasPending = (d.facturas ?? []).some((f: { status: string }) => f.status === "pending");
                if (!hasPending) break;
              }
            }
            setAnalyzingOcr(false);
          };
          pollOcr();
        }
      }
    } catch {
      setUploadError("Error al subir el archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const totalRootFiles = rootFiles.length;
  const isLoading = loading || loadingFiles;

  if (!loading && !linked) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
        <div style={{ fontWeight: 600, color: "#475569", marginBottom: 8 }}>Sin carpeta vinculada</div>
        <div style={{ fontSize: 14 }}>Esta comunidad aún no tiene una carpeta en SharePoint</div>
      </div>
    );
  }

  const activeName = currentFolderId
    ? (subfolders.find((s) => s.id === currentFolderId)?.name ?? "Carpeta")
    : "(raíz)";

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 400 }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {folderName && <span style={{ fontWeight: 600, color: "#1e293b" }}>{folderName}</span>}
          {expiries.size > 0 && (
            <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
              {expiries.size} con vencimiento
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Buscar en carpeta actual..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", width: 200, background: "#f8fafc" }}
          />
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || analyzingOcr}
            title={`Subir archivo a ${activeName}`}
            style={{ padding: "6px 14px", borderRadius: 8, background: uploading || analyzingOcr ? "#e2e8f0" : "#4F7CFF", color: uploading || analyzingOcr ? "#94a3b8" : "#fff", border: "none", fontSize: 13, cursor: uploading || analyzingOcr ? "default" : "pointer", fontWeight: 500, whiteSpace: "nowrap" }}
          >
            {uploading ? "Subiendo..." : analyzingOcr ? "Analizando..." : "+ Subir archivo"}
          </button>
        </div>
      </div>

      {uploadError && (
        <div style={{ padding: "8px 20px", background: "#fef2f2", color: "#dc2626", fontSize: 13, borderBottom: "1px solid #fca5a5" }}>
          {uploadError}
          <button onClick={() => setUploadError(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Subfolder tabs */}
      {!loading && (subfolders.length > 0 || totalRootFiles > 0) && (
        <div style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: "1px solid #e2e8f0", padding: "0 8px", background: "#fafafa" }}>
          <button
            onClick={() => handleTabChange(null)}
            style={{ padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", borderBottom: currentFolderId === null ? "2px solid #4F7CFF" : "2px solid transparent", color: currentFolderId === null ? "#4F7CFF" : "#64748b", fontWeight: currentFolderId === null ? 600 : 400 }}
          >
            Raíz
            <span style={{ marginLeft: 6, fontSize: 11, background: currentFolderId === null ? "#eff4ff" : "#f1f5f9", color: currentFolderId === null ? "#4F7CFF" : "#94a3b8", borderRadius: 10, padding: "2px 6px" }}>
              {totalRootFiles}
            </span>
          </button>
          {subfolders.map((sf) => (
            <button
              key={sf.id}
              onClick={() => handleTabChange(sf.id, sf.name)}
              style={{ padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", borderBottom: currentFolderId === sf.id ? "2px solid #4F7CFF" : "2px solid transparent", color: currentFolderId === sf.id ? "#4F7CFF" : "#64748b", fontWeight: currentFolderId === sf.id ? 600 : 400 }}
            >
              {sf.name}
              <span style={{ marginLeft: 6, fontSize: 11, background: currentFolderId === sf.id ? "#eff4ff" : "#f1f5f9", color: currentFolderId === sf.id ? "#4F7CFF" : "#94a3b8", borderRadius: 10, padding: "2px 6px" }}>
                {sf.fileCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* File list */}
      <div style={{ flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Cargando...</div>
        ) : displayFiles.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14 }}>
              {search ? "No hay archivos que coincidan" : currentFolderId === null ? "No hay archivos en la raíz" : "Esta carpeta está vacía"}
            </div>
          </div>
        ) : (
          <div>
            {displayFiles.map((file) => {
              const icon = getFileIcon(file.name, file.mimeType);
              const expiry = expiries.get(file.id);
              const days = expiry ? daysUntil(expiry.expiresAt) : null;
              const expiryStyle = days !== null ? expiryColor(days) : null;
              const ocr = ocrMap.get(file.id);

              return (
                <div
                  key={file.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: icon.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: icon.color, flexShrink: 0 }}>
                    {icon.label}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span>{formatSize(file.size)}</span>
                      <span>·</span>
                      <span>{formatDate(file.lastModified)}</span>
                      {expiry && expiryStyle && (
                        <span style={{ background: expiryStyle.bg, color: expiryStyle.color, border: `1px solid ${expiryStyle.border}`, borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>
                          {expiry.label} · {days! < 0 ? `Vencido hace ${Math.abs(days!)}d` : days === 0 ? "Vence hoy" : `Vence en ${days}d`}
                        </span>
                      )}
                      {ocr && ocr.status === "pending" && (
                        <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>
                          Analizando OCR...
                        </span>
                      )}
                      {ocr && ocr.status === "success" && (
                        <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600, display: "inline-flex", gap: 4 }}>
                          🧾{ocr.importe !== null ? ` ${fmtImporte(ocr.importe, ocr.moneda)}` : ""}{ocr.proveedor ? ` · ${ocr.proveedor}` : ""}{ocr.fechaFactura ? ` · ${new Date(ocr.fechaFactura).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setExpiryModal(file)}
                      title={expiry ? "Editar vencimiento" : "Añadir fecha de vencimiento"}
                      style={{ padding: "5px 8px", borderRadius: 6, background: expiry ? expiryColor(days!).bg : "#f8fafc", color: expiry ? expiryColor(days!).color : "#94a3b8", border: `1px solid ${expiry ? expiryColor(days!).border : "#e2e8f0"}`, fontSize: 13, cursor: "pointer" }}
                    >
                      {expiry ? "⏰" : "⏱"}
                    </button>
                    {file.webUrl && (
                      <a
                        href={file.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir en SharePoint"
                        style={{ padding: "5px 10px", borderRadius: 6, background: "#f1f5f9", color: "#475569", fontSize: 12, textDecoration: "none", border: "1px solid #e2e8f0", cursor: "pointer" }}
                      >
                        Abrir
                      </a>
                    )}
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id || !file.driveId}
                      title="Descargar"
                      style={{ padding: "5px 10px", borderRadius: 6, background: downloading === file.id ? "#f1f5f9" : "#4F7CFF", color: downloading === file.id ? "#94a3b8" : "#fff", fontSize: 12, border: "none", cursor: downloading === file.id || !file.driveId ? "default" : "pointer" }}
                    >
                      {downloading === file.id ? "..." : "↓"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {expiryModal && (
        <ExpiryModal
          file={expiryModal}
          comunidadId={comunidadId}
          existing={expiries.get(expiryModal.id) || null}
          onClose={() => setExpiryModal(null)}
          onSaved={(newExpiry) => {
            setExpiries((prev) => {
              const next = new Map(prev);
              if (newExpiry) next.set(expiryModal.id, newExpiry);
              else next.delete(expiryModal.id);
              return next;
            });
            setExpiryModal(null);
          }}
        />
      )}
    </div>
  );
}
