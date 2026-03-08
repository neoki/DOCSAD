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
      <div className="text-gray-500 text-sm">
        Cargando documentos...
      </div>
    );

  if (documentos.length === 0) {
    return (
      <div className="card-static py-16 text-center">
        <div className="text-gray-400 mb-2" style={{ fontSize: 32 }}>
          📄
        </div>
        <p className="text-gray-500 text-sm">
          No hay documentos subidos aún
        </p>
      </div>
    );
  }

  return (
    <div className="card-static p-0 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr>
            <th className="table-header text-left">Documento</th>
            <th className="table-header text-left">Tipo</th>
            <th className="table-header text-left">Fecha</th>
            <th className="table-header text-left">Tamaño</th>
            <th className="table-header text-center">IA</th>
            <th className="table-header text-right">Acción</th>
          </tr>
        </thead>
        <tbody>
          {documentos.map((doc) => (
            <tr key={doc.id} className="table-row">
              <td className="table-cell">
                <div className="flex items-center gap-3">
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
                  <span className="font-semibold text-gray-900 truncate">{doc.nombre}</span>
                </div>
              </td>
              <td className="table-cell text-gray-600 text-sm">
                {getDocTypeLabel(doc.docTypeId)}
              </td>
              <td className="table-cell text-gray-500 text-sm">
                {new Date(doc.uploadedAt).toLocaleDateString("es-ES")}
              </td>
              <td className="table-cell text-gray-500 text-sm">
                {formatSize(doc.sizeBytes)}
              </td>
              <td className="table-cell text-center">
                {doc.aiConfianza != null && (
                  <span className="badge-completado">
                    IA {doc.aiConfianza}%
                  </span>
                )}
              </td>
              <td className="table-cell text-right">
                {doc.rutaArchivo ? (
                  <a
                    href="/visor"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Ver →
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">
                    Sin archivo
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
