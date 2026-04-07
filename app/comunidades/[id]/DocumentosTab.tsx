"use client";

import { useState, useEffect, useCallback } from "react";

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

const ALL_KEY = "__all__";
const ROOT_KEY = "__root__";

export default function DocumentosTab({ comunidadId }: { comunidadId: string }) {
  const [subfolders, setSubfolders] = useState<SubfolderGroup[]>([]);
  const [files, setFiles] = useState<CachedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(true);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(ALL_KEY);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchFiles = useCallback(async (subfolder: string, searchTerm: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (subfolder !== ALL_KEY) params.set("subfolder", subfolder);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/comunidades/${comunidadId}/files?${params}`);
      const data = await res.json();
      if (!res.ok || !data.linked) {
        setLinked(false);
        setFiles([]);
        setSubfolders([]);
      } else {
        setLinked(true);
        setFiles(data.files || []);
        if (subfolder === ALL_KEY && !searchTerm) {
          setSubfolders(data.subfolders || []);
          setFolderName(data.folderName || null);
        }
      }
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [comunidadId]);

  useEffect(() => {
    fetchFiles(ALL_KEY, "");
  }, [fetchFiles]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearch("");
    fetchFiles(tab, "");
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    fetchFiles(ALL_KEY, val);
    if (val) setActiveTab(ALL_KEY);
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
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{formatSize(file.sizeBytes)}</span>
                      <span>·</span>
                      <span>{formatDate(file.lastModified)}</span>
                      {file.subfolder && activeTab === ALL_KEY && !search && (
                        <>
                          <span>·</span>
                          <span style={{ color: "#4F7CFF" }}>{file.subfolder}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
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
    </div>
  );
}
