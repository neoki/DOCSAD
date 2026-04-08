"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type CachedFile = {
  id: string;
  driveId: string;
  name: string;
  subfolder: string | null;
  sizeBytes: number;
  mimeType: string | null;
  lastModified: string | null;
  webUrl: string | null;
};

type Expiry = {
  sharePointItemId: string;
  label: string;
  expiresAt: string;
};

type SubfolderGroup = {
  name: string | null;
  count: number;
};

function formatSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
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

function getFileIcon(name: string, mimeType?: string | null) {
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

const ALL_KEY = "__all__";
const ROOT_KEY = "__root__";

function ExpiryModal({
  file,
  comunidadId,
  existing,
  onClose,
  onSaved,
}: {
  file: CachedFile;
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
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: 28, width: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "#1e293b" }}>
          Fecha de vencimiento
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20, wordBreak: "break-all" }}>
          {file.name}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
            Tipo de vencimiento
          </label>
          {!useCustom ? (
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="form-input"
              style={{ width: "100%" }}
            >
              {EXPIRY_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Ej: Contrato OTIS"
              className="form-input"
              style={{ width: "100%" }}
            />
          )}
          <button
            onClick={() => setUseCustom(!useCustom)}
            style={{ fontSize: 11, color: "#4F7CFF", background: "none", border: "none", cursor: "pointer", marginTop: 6, padding: 0 }}
          >
            {useCustom ? "← Usar tipo predefinido" : "Escribir tipo personalizado →"}
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
            Fecha de vencimiento
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {existing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #fca5a5",
                background: "#fff", color: "#dc2626", fontSize: 13, cursor: "pointer",
              }}
            >
              {deleting ? "Eliminando..." : "Quitar vencimiento"}
            </button>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#fff", color: "#475569", fontSize: 13, cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !effectiveLabel.trim() || !date}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "none",
                background: saving || !effectiveLabel.trim() || !date ? "#e2e8f0" : "#4F7CFF",
                color: saving || !effectiveLabel.trim() || !date ? "#94a3b8" : "#fff",
                fontSize: 13, cursor: saving || !effectiveLabel.trim() || !date ? "default" : "pointer",
                fontWeight: 600,
              }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentosTab({ comunidadId }: { comunidadId: string }) {
  const [subfolders, setSubfolders] = useState<SubfolderGroup[]>([]);
  const [files, setFiles] = useState<CachedFile[]>([]);
  const [expiries, setExpiries] = useState<Map<string, Expiry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(true);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(ALL_KEY);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expiryModal, setExpiryModal] = useState<CachedFile | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFiles = useCallback(async (subfolder: string, searchTerm: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ subfolder, search: searchTerm });
      const res = await fetch(`/api/comunidades/${comunidadId}/sharepoint/cache?${params}`);
      const data = await res.json();
      if (!data.linked) {
        setLinked(false);
      } else {
        setLinked(true);
        setFiles(data.files || []);
        if (data.subfolders) setSubfolders(data.subfolders);
        if (data.folderName) setFolderName(data.folderName);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [comunidadId]);

  const fetchExpiries = useCallback(async () => {
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

  useEffect(() => {
    fetchFiles(activeTab, "");
    fetchExpiries();
  }, [fetchFiles, fetchExpiries, activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearch("");
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchFiles(activeTab, val);
    }, 300);
  };

  const handleDownload = async (file: CachedFile) => {
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

  const totalCount = subfolders.reduce((s, g) => s + g.count, 0);

  const tabs: { key: string; label: string; count: number }[] = [
    { key: ALL_KEY, label: "Todos", count: totalCount },
    ...subfolders.map((g) => ({
      key: g.name ?? ROOT_KEY,
      label: g.name ?? "(raíz)",
      count: g.count,
    })),
  ];

  if (!linked) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
        <div style={{ fontWeight: 600, color: "#475569", marginBottom: 8 }}>Sin carpeta vinculada</div>
        <div style={{ fontSize: 14 }}>Esta comunidad aún no tiene una carpeta en SharePoint</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 400 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>
          {folderName && <span style={{ fontWeight: 600, color: "#1e293b" }}>{folderName}</span>}
          {" · "}
          <span>{totalCount} archivos</span>
          {expiries.size > 0 && (
            <span style={{ marginLeft: 8, background: "#fef3c7", color: "#92400e", borderRadius: 10, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
              {expiries.size} con vencimiento
            </span>
          )}
        </div>
        <input
          type="text"
          placeholder="Buscar archivos..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
            fontSize: 13, outline: "none", width: 220, background: "#f8fafc",
          }}
        />
      </div>

      {/* Subfolder tabs */}
      {!search && tabs.length > 1 && (
        <div style={{
          display: "flex", gap: 0, overflowX: "auto", borderBottom: "1px solid #e2e8f0",
          padding: "0 8px", background: "#fafafa",
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                padding: "10px 14px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, whiteSpace: "nowrap", borderBottom: activeTab === tab.key ? "2px solid #4F7CFF" : "2px solid transparent",
                color: activeTab === tab.key ? "#4F7CFF" : "#64748b",
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
            >
              {tab.label}
              <span style={{ marginLeft: 6, fontSize: 11, background: activeTab === tab.key ? "#eff4ff" : "#f1f5f9", color: activeTab === tab.key ? "#4F7CFF" : "#94a3b8", borderRadius: 10, padding: "2px 6px" }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* File list */}
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Cargando...</div>
        ) : files.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14 }}>{search ? "No hay archivos que coincidan" : "Sin archivos en esta carpeta"}</div>
          </div>
        ) : (
          <div>
            {files.map((file) => {
              const icon = getFileIcon(file.name, file.mimeType);
              const expiry = expiries.get(file.id);
              const days = expiry ? daysUntil(expiry.expiresAt) : null;
              const expiryStyle = days !== null ? expiryColor(days) : null;

              return (
                <div
                  key={file.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 20px", borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: icon.bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: icon.color, flexShrink: 0,
                  }}>
                    {icon.label}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span>{formatSize(file.sizeBytes)}</span>
                      <span>·</span>
                      <span>{formatDate(file.lastModified)}</span>
                      {file.subfolder && activeTab === ALL_KEY && !search && (
                        <>
                          <span>·</span>
                          <span style={{ color: "#4F7CFF" }}>{file.subfolder}</span>
                        </>
                      )}
                      {expiry && expiryStyle && (
                        <span
                          style={{
                            background: expiryStyle.bg, color: expiryStyle.color,
                            border: `1px solid ${expiryStyle.border}`,
                            borderRadius: 10, padding: "1px 8px", fontSize: 10, fontWeight: 600,
                          }}
                        >
                          {expiry.label} · {days! < 0 ? `Vencido hace ${Math.abs(days!)}d` : days === 0 ? "Vence hoy" : `Vence en ${days}d`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => setExpiryModal(file)}
                      title={expiry ? "Editar vencimiento" : "Añadir fecha de vencimiento"}
                      style={{
                        padding: "5px 8px", borderRadius: 6,
                        background: expiry ? expiryColor(days!).bg : "#f8fafc",
                        color: expiry ? expiryColor(days!).color : "#94a3b8",
                        border: `1px solid ${expiry ? expiryColor(days!).border : "#e2e8f0"}`,
                        fontSize: 13, cursor: "pointer",
                      }}
                    >
                      {expiry ? "⏰" : "⏱"}
                    </button>

                    {file.webUrl && (
                      <a
                        href={file.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir en SharePoint"
                        style={{
                          padding: "5px 10px", borderRadius: 6, background: "#f1f5f9",
                          color: "#475569", fontSize: 12, textDecoration: "none",
                          border: "1px solid #e2e8f0", cursor: "pointer",
                        }}
                      >
                        Abrir
                      </a>
                    )}
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                      title="Descargar"
                      style={{
                        padding: "5px 10px", borderRadius: 6, background: downloading === file.id ? "#f1f5f9" : "#4F7CFF",
                        color: downloading === file.id ? "#94a3b8" : "#fff", fontSize: 12,
                        border: "none", cursor: downloading === file.id ? "default" : "pointer",
                      }}
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
              if (newExpiry) {
                next.set(expiryModal.id, newExpiry);
              } else {
                next.delete(expiryModal.id);
              }
              return next;
            });
            setExpiryModal(null);
          }}
        />
      )}
    </div>
  );
}
