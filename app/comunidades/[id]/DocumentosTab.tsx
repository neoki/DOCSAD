"use client";

import { useState, useEffect, useCallback } from "react";
import { getDocTypeLabel } from "@/lib/doctypes";

type Documento = {
  id: string;
  docTypeId: string;
  nombre: string;
  rutaArchivo: string | null;
  sizeBytes: number;
  aiConfianza: number | null;
  uploadedAt: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosTab({ comunidadId }: { comunidadId: string }) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocumentos = useCallback(async () => {
    const res = await fetch(`/api/comunidades/${comunidadId}/documentos`);
    if (res.ok) {
      setDocumentos(await res.json());
    }
    setLoading(false);
  }, [comunidadId]);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  if (loading)
    return (
      <div className="text-gray-500" style={{ fontSize: 12 }}>
        Cargando documentos...
      </div>
    );

  if (documentos.length === 0) {
    return (
      <div className="card py-16 text-center">
        <div className="text-gray-400 mb-2" style={{ fontSize: 32 }}>
          📄
        </div>
        <p className="text-gray-500" style={{ fontSize: 13 }}>
          No hay documentos subidos aún
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documentos.map((doc) => (
        <div
          key={doc.id}
          className="card flex items-center gap-3"
          style={{ padding: "10px 14px" }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#fef2f2", color: "#ef4444" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate" style={{ fontSize: 13 }}>
              {doc.nombre}
            </div>
            <div className="text-gray-500 truncate" style={{ fontSize: 11 }}>
              {getDocTypeLabel(doc.docTypeId)} ·{" "}
              {new Date(doc.uploadedAt).toLocaleDateString("es-ES")} ·{" "}
              {formatSize(doc.sizeBytes)}
            </div>
          </div>

          {doc.aiConfianza != null && (
            <span
              className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "#dcfce7", color: "#166534" }}
            >
              IA {doc.aiConfianza}%
            </span>
          )}

          {doc.rutaArchivo ? (
            <a
              href="/visor"
              className="flex-shrink-0 font-semibold text-blue-600 hover:text-blue-800"
              style={{ fontSize: 12 }}
            >
              Ver →
            </a>
          ) : (
            <span className="flex-shrink-0 text-gray-400" style={{ fontSize: 12 }}>
              Sin archivo
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
