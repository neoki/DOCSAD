"use client";

import { useState, useEffect, useCallback } from "react";

type ClassifiedFile = {
  id: string;
  name: string;
  path: string;
  size: number;
  communityCode: string | null;
  subfolder: string;
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
};

type Stats = {
  total: number;
  totalIncludingFolders: number;
  folders: number;
  high: number;
  medium: number;
  low: number;
  none: number;
  uniqueCommunities: number;
};

type MoveResult = {
  fileId: string;
  fileName: string;
  success: boolean;
  error?: string;
};

type ComunidadOption = {
  codigo: string;
  nombre: string;
};

const SUBFOLDERS = [
  "01_Actas",
  "02_Presupuestos_y_Cuentas",
  "03_Contratos",
  "04_Facturas",
  "05_Seguros",
  "06_Certificados_e_Informes",
  "07_Recibos",
  "08_Correspondencia",
  "09_Documentacion_Legal",
  "10_Mantenimiento",
  "11_Otros",
];

function formatSize(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function confidenceColor(c: string) {
  switch (c) {
    case "high": return { bg: "#dcfce7", color: "#16a34a", label: "Alta" };
    case "medium": return { bg: "#fef3c7", color: "#d97706", label: "Media" };
    case "low": return { bg: "#fee2e2", color: "#dc2626", label: "Baja" };
    default: return { bg: "#f1f5f9", color: "#64748b", label: "Sin clasificar" };
  }
}

export default function EscanerPage() {
  const [step, setStep] = useState<"find" | "scanning" | "review" | "moving" | "done">("find");
  const [files, setFiles] = useState<ClassifiedFile[]>([]);
  const [allFiles, setAllFiles] = useState<ClassifiedFile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moveResults, setMoveResults] = useState<MoveResult[]>([]);
  const [movingProgress, setMovingProgress] = useState({ current: 0, total: 0 });
  const [comunidades, setComunidades] = useState<ComunidadOption[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editSubfolder, setEditSubfolder] = useState("");
  const [page, setPage] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const PAGE_SIZE = 100;

  useEffect(() => {
    fetch("/api/comunidades?all=true&pageSize=1000")
      .then((r) => r.json())
      .then((data) => {
        setComunidades(
          (data.comunidades || []).map((c: { codigo: string; nombre: string }) => ({
            codigo: c.codigo,
            nombre: c.nombre,
          })),
        );
      });
  }, []);

  const scanFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    setStep("scanning");
    try {
      const res = await fetch("/api/escaner?action=scan&pageSize=10000");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setStep("find");
        return;
      }
      setAllFiles(data.files || []);
      setFiles(data.files || []);
      setStats(data.stats || null);
      setTotalFiltered(data.files?.length || 0);
      setStep("review");
    } catch (err) {
      setError(String(err));
      setStep("find");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = allFiles;
    if (filter !== "all") {
      filtered = filtered.filter((f) => f.confidence === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.path.toLowerCase().includes(q) ||
          (f.communityCode && f.communityCode.includes(q)),
      );
    }
    setTotalFiltered(filtered.length);
    setFiles(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
  }, [allFiles, filter, search, page]);

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const classifiable = files.filter((f) => f.communityCode);
    if (classifiable.every((f) => selectedFiles.has(f.id))) {
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        classifiable.forEach((f) => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        classifiable.forEach((f) => next.add(f.id));
        return next;
      });
    }
  };

  const selectAllClassified = () => {
    const classifiable = allFiles.filter((f) => f.communityCode);
    setSelectedFiles(new Set(classifiable.map((f) => f.id)));
  };

  const startEditFile = (file: ClassifiedFile) => {
    setEditingFile(file.id);
    setEditCode(file.communityCode || "");
    setEditSubfolder(file.subfolder);
  };

  const saveEdit = () => {
    if (!editingFile) return;
    setAllFiles((prev) =>
      prev.map((f) =>
        f.id === editingFile
          ? {
              ...f,
              communityCode: editCode.padStart(6, "0"),
              subfolder: editSubfolder,
              confidence: "high" as const,
              reason: "Clasificación manual",
            }
          : f,
      ),
    );
    setEditingFile(null);
  };

  const moveSelected = async () => {
    if (selectedFiles.size === 0) return;

    const filesToMove = allFiles
      .filter((f) => selectedFiles.has(f.id) && f.communityCode)
      .map((f) => ({
        fileId: f.id,
        fileName: f.name,
        communityCode: f.communityCode!,
        subfolder: f.subfolder,
      }));

    if (filesToMove.length === 0) return;

    setStep("moving");
    setMoveResults([]);
    setMovingProgress({ current: 0, total: filesToMove.length });

    const BATCH_SIZE = 20;
    const allResults: MoveResult[] = [];

    for (let i = 0; i < filesToMove.length; i += BATCH_SIZE) {
      const batch = filesToMove.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch("/api/escaner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "move-batch",
            files: batch,
          }),
        });
        const data = await res.json();
        allResults.push(...(data.results || []));
      } catch (err) {
        batch.forEach((f) =>
          allResults.push({ fileId: f.fileId, fileName: f.fileName, success: false, error: String(err) }),
        );
      }

      setMovingProgress({ current: Math.min(i + BATCH_SIZE, filesToMove.length), total: filesToMove.length });
      setMoveResults([...allResults]);
    }

    setStep("done");
  };

  const communityName = (code: string) => {
    const c = comunidades.find((c) => c.codigo === code);
    return c ? c.nombre : code;
  };

  if (step === "find") {
    return (
      <div>
        <div className="mb-6">
          <h1 className="page-title">Clasificador de Escáner</h1>
          <p className="page-subtitle">
            Clasifica y distribuye automáticamente los archivos del escáner a las carpetas de cada comunidad
          </p>
        </div>

        <div className="card-static py-16 text-center">
          <div style={{ fontSize: 48 }} className="mb-4">📂</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Paso 1: Localizar carpeta Escáner
          </h2>
          <p className="text-gray-500 text-sm mb-6 max-w-lg mx-auto">
            Sube la carpeta &quot;Escaner&quot; a tu sitio SharePoint de DocFincas (al mismo nivel que la carpeta de Comunidades). Luego pulsa el botón para buscarla.
          </p>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button onClick={scanFiles} disabled={loading} className="btn-primary">
            {loading ? "Buscando..." : "Buscar y analizar carpeta Escáner"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "scanning") {
    return (
      <div>
        <div className="mb-6">
          <h1 className="page-title">Clasificador de Escáner</h1>
        </div>
        <div className="card-static py-16 text-center">
          <div className="text-gray-400 mb-4" style={{ fontSize: 48 }}>⏳</div>
          <p className="text-gray-700 font-semibold">Analizando archivos del escáner...</p>
          <p className="text-gray-500 text-sm mt-2">Recorriendo todas las carpetas y archivos. Con ~97.000 archivos esto puede tardar varios minutos.</p>
          <p className="text-gray-400 text-xs mt-1">No cierres esta página.</p>
        </div>
      </div>
    );
  }

  if (step === "moving") {
    const pct = movingProgress.total > 0
      ? Math.round((movingProgress.current / movingProgress.total) * 100)
      : 0;
    return (
      <div>
        <div className="mb-6">
          <h1 className="page-title">Moviendo archivos...</h1>
        </div>
        <div className="card-static py-16 text-center">
          <div style={{ fontSize: 48 }} className="mb-4">📤</div>
          <p className="text-gray-700 font-semibold mb-4">
            {movingProgress.current} / {movingProgress.total} archivos procesados
          </p>
          <div className="w-64 h-3 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-4">
            No cierres esta página hasta que termine.
          </p>
        </div>
      </div>
    );
  }

  if (step === "done") {
    const succeeded = moveResults.filter((r) => r.success).length;
    const failed = moveResults.filter((r) => !r.success).length;

    return (
      <div>
        <div className="mb-6">
          <h1 className="page-title">Resultado</h1>
        </div>
        <div className="card-static py-10 text-center">
          <div style={{ fontSize: 48 }} className="mb-4">
            {failed === 0 ? "✅" : "⚠️"}
          </div>
          <p className="text-gray-900 font-bold text-lg mb-2">
            {succeeded} archivos movidos correctamente
          </p>
          {failed > 0 && (
            <p className="text-red-500 text-sm mb-4">{failed} archivos con errores</p>
          )}
          <div className="flex gap-3 justify-center mt-4">
            <button
              onClick={() => {
                setSelectedFiles(new Set());
                setMoveResults([]);
                scanFiles();
              }}
              className="btn-primary"
            >
              Volver a escanear
            </button>
          </div>
        </div>

        {failed > 0 && (
          <div className="card mt-4">
            <div className="section-label mb-3">Errores</div>
            <div className="flex flex-col gap-2" style={{ maxHeight: 300, overflowY: "auto" }}>
              {moveResults
                .filter((r) => !r.success)
                .map((r) => (
                  <div key={r.fileId} className="text-xs p-2 bg-red-50 rounded">
                    <span className="font-semibold text-red-700">{r.fileName}</span>
                    <span className="text-red-500 ml-2">{r.error}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Clasificador de Escáner</h1>
          <p className="page-subtitle">
            {stats?.total || 0} archivos analizados · {stats?.uniqueCommunities || 0} comunidades detectadas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={scanFiles}
            disabled={loading}
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            {loading ? "Escaneando..." : "Re-escanear"}
          </button>
          <button
            onClick={moveSelected}
            disabled={selectedFiles.size === 0}
            className="btn-primary"
          >
            Mover {selectedFiles.size} seleccionados
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-6 gap-3 mb-5">
          {[
            { label: "Archivos", value: stats.total, color: "#4F7CFF" },
            { label: "Carpetas", value: stats.folders, color: "#64748b" },
            { label: "Confianza alta", value: stats.high, color: "#22C55E" },
            { label: "Confianza media", value: stats.medium, color: "#F59E0B" },
            { label: "Sin clasificar", value: stats.none, color: "#94a3b8" },
            { label: "Comunidades", value: stats.uniqueCommunities, color: "#8B5CF6" },
          ].map((k) => (
            <div key={k.label} className="kpi-card">
              <div>
                <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
                <div className="kpi-label">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Buscar por nombre de archivo o código..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field flex-1"
            style={{ minWidth: 200 }}
          />
          <div className="flex gap-1">
            {[
              { key: "all", label: "Todos" },
              { key: "high", label: "Alta" },
              { key: "medium", label: "Media" },
              { key: "none", label: "Sin clasificar" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer border"
                style={{
                  background: filter === f.key ? "#EFF6FF" : "#fff",
                  borderColor: filter === f.key ? "#4F7CFF" : "#e2e8f0",
                  color: filter === f.key ? "#4F7CFF" : "#64748b",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={selectAllVisible}
            className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          >
            Sel. visibles
          </button>
          <button
            onClick={selectAllClassified}
            className="text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer border border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            Sel. todos clasificados ({allFiles.filter((f) => f.communityCode).length})
          </button>
        </div>
      </div>

      <div className="card-static p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header text-center" style={{ width: 40 }}></th>
                <th className="table-header text-left">Archivo</th>
                <th className="table-header text-left" style={{ width: 100 }}>Comunidad</th>
                <th className="table-header text-left" style={{ width: 180 }}>Carpeta destino</th>
                <th className="table-header text-center" style={{ width: 90 }}>Confianza</th>
                <th className="table-header text-right" style={{ width: 70 }}>Tamaño</th>
                <th className="table-header text-center" style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const conf = confidenceColor(f.confidence);
                const isEditing = editingFile === f.id;
                const isSelected = selectedFiles.has(f.id);

                return (
                  <tr key={f.id} className="table-row">
                    <td className="table-cell text-center">
                      {f.communityCode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(f.id)}
                          className="cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-medium text-gray-900 truncate" style={{ maxWidth: 350 }} title={f.path}>
                        {f.name}
                      </div>
                      {f.path !== f.name && (
                        <div className="text-xs text-gray-400 truncate" style={{ maxWidth: 350 }}>
                          {f.path}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="input-field text-xs"
                          style={{ width: 80, padding: "2px 6px" }}
                          placeholder="Código"
                        />
                      ) : f.communityCode ? (
                        <div>
                          <div className="text-xs font-mono text-gray-600">{f.communityCode}</div>
                          <div className="text-xs text-gray-400 truncate" style={{ maxWidth: 150 }}>
                            {communityName(f.communityCode)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {isEditing ? (
                        <select
                          value={editSubfolder}
                          onChange={(e) => setEditSubfolder(e.target.value)}
                          className="input-field text-xs"
                          style={{ padding: "2px 6px" }}
                        >
                          {SUBFOLDERS.map((sf) => (
                            <option key={sf} value={sf}>{sf}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-600">{f.subfolder}</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
                        style={{ background: conf.bg, color: conf.color }}
                      >
                        {conf.label}
                      </span>
                    </td>
                    <td className="table-cell text-right text-xs text-gray-500">
                      {formatSize(f.size)}
                    </td>
                    <td className="table-cell text-center">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            className="text-xs text-green-600 font-semibold cursor-pointer bg-transparent border-none"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingFile(null)}
                            className="text-xs text-gray-400 font-semibold cursor-pointer bg-transparent border-none"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditFile(f)}
                          className="text-xs text-blue-600 font-semibold cursor-pointer bg-transparent border-none hover:text-blue-800"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {totalFiltered} archivos · Página {page} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="text-xs px-3 py-1 rounded border border-gray-200 bg-white text-gray-600 cursor-pointer disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="text-xs px-3 py-1 rounded border border-gray-200 bg-white text-gray-600 cursor-pointer disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
