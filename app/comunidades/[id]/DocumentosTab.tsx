"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DOC_TYPES, getDocTypeLabel } from "@/lib/doctypes";

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
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ docTypeId: "", nombre: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("docTypeId", uploadForm.docTypeId);
    formData.append("nombre", uploadForm.nombre || selectedFile.name);

    const res = await fetch(`/api/comunidades/${comunidadId}/documentos`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (!res.ok) {
      const data = await res.json();
      setUploadError(data.error ?? "Error al subir el archivo");
      return;
    }

    setUploadForm({ docTypeId: "", nombre: "" });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchDocumentos();
  }

  if (loading) return <div className="text-gray-500 text-sm">Cargando documentos...</div>;

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Subir documento</h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de documento
              </label>
              <select
                value={uploadForm.docTypeId}
                onChange={(e) => setUploadForm((f) => ({ ...f, docTypeId: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Seleccionar tipo...</option>
                {DOC_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre (opcional)
              </label>
              <input
                type="text"
                value={uploadForm.nombre}
                onChange={(e) => setUploadForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre descriptivo del documento"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivo (máx. 50MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>

          {uploadError && (
            <div className="text-red-600 text-sm">{uploadError}</div>
          )}

          <button type="submit" disabled={uploading || !selectedFile} className="btn-primary">
            {uploading ? "Subiendo..." : "Subir documento"}
          </button>
        </form>
      </div>

      {/* Document list */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">
            Documentos ({documentos.length})
          </h3>
        </div>
        {documentos.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No hay documentos subidos aún.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tamaño
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IA
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subido
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documentos.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 text-sm">{doc.nombre}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getDocTypeLabel(doc.docTypeId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatSize(doc.sizeBytes)}
                  </td>
                  <td className="px-4 py-3">
                    {doc.aiConfianza != null ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          doc.aiConfianza >= 90
                            ? "bg-green-100 text-green-800"
                            : doc.aiConfianza >= 70
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {doc.aiConfianza}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {doc.rutaArchivo ? (
                      <a
                        href={`/api/files${doc.rutaArchivo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver →
                      </a>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin archivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
