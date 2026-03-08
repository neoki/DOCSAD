"use client";

import { useState, useEffect, useRef } from "react";
import { DOC_TYPES, CATEGORIAS, getDocType } from "@/lib/doctypes";

interface Comunidad {
  id: string;
  nombre: string;
}

const STEP_LABELS = ["Seleccionar", "Análisis IA", "Confirmar"];

const ACCEPTED_TYPES = ".pdf,.docx,.jpg,.jpeg,.png";
const MAX_SIZE_MB = 50;

function randomDocSuggestion() {
  const idx = Math.floor(Math.random() * DOC_TYPES.length);
  const dt = DOC_TYPES[idx];
  const confianza = Math.floor(Math.random() * 20) + 78;
  return { docType: dt, confianza };
}

export default function SubirPage() {
  const [step, setStep] = useState(0);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [selectedComunidad, setSelectedComunidad] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const [suggestion, setSuggestion] = useState<{ docType: typeof DOC_TYPES[0]; confianza: number } | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/comunidades?pageSize=100")
      .then((r) => r.json())
      .then((data) => {
        if (data.comunidades) setComunidades(data.comunidades);
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`El archivo supera ${MAX_SIZE_MB}MB`);
      return;
    }
    setFileName(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const startSimulation = () => {
    setStep(1);
    const sug = randomDocSuggestion();
    setTimeout(() => {
      setSuggestion(sug);
      setSelectedDocType(sug.docType.id);
      setStep(2);
    }, 2200);
  };

  const handleConfirm = async () => {
    if (!selectedComunidad || !selectedDocType) return;
    setSaving(true);
    try {
      await fetch(`/api/comunidades/${selectedComunidad}/checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            docTypeId: selectedDocType,
            estado: "COMPLETADO",
            fecha: new Date().toISOString(),
          },
        ]),
      });
      setSuccess(true);
    } catch {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedComunidad("");
    setFileName("");
    setSuggestion(null);
    setSelectedDocType("");
    setSuccess(false);
  };

  const catForDoc = (catId: string) => CATEGORIAS[catId];

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Documento guardado correctamente</h2>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          El checklist de la comunidad ha sido actualizado.
        </p>
        <button className="btn-primary" onClick={handleReset}>
          Subir otro documento
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>Subir Documentos</h1>
      <p className="page-subtitle" style={{ marginBottom: 32 }}>
        Sube documentos y deja que la IA los clasifique automáticamente
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 40 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                  background: step >= i ? "#4F7CFF" : "#e2e8f0",
                  color: step >= i ? "#fff" : "#94a3b8",
                  transition: "all 0.3s",
                }}
              >
                {step > i ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: step >= i ? "#0f172a" : "#94a3b8" }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                style={{
                  width: 80,
                  height: 2,
                  background: step > i ? "#4F7CFF" : "#e2e8f0",
                  margin: "0 8px",
                  marginBottom: 22,
                  transition: "background 0.3s",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Comunidad
          </label>
          <select
            className="input-field"
            value={selectedComunidad}
            onChange={(e) => setSelectedComunidad(e.target.value)}
            style={{ marginBottom: 20 }}
          >
            <option value="">Selecciona una comunidad…</option>
            {comunidades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Documento
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#4F7CFF" : "#cbd5e1"}`,
              borderRadius: 12,
              padding: "40px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "rgba(79,124,255,0.04)" : "#fafbfc",
              transition: "all 0.2s",
              marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ margin: "0 auto 12px" }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {fileName ? (
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{fileName}</p>
            ) : (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                  Arrastra un archivo aquí o haz clic para seleccionar
                </p>
                <p style={{ fontSize: 13, color: "#94a3b8" }}>
                  PDF, DOCX, JPG, PNG — máx. {MAX_SIZE_MB}MB
                </p>
              </>
            )}
          </div>

          <button
            className="btn-primary"
            disabled={!selectedComunidad}
            onClick={startSimulation}
            style={{ width: "100%" }}
          >
            Simular subida (demo)
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 12 }}>
            Analizando documento…
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#4F7CFF",
                  animation: `bounce 1.4s infinite ease-in-out both`,
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes bounce {
              0%, 80%, 100% { transform: scale(0); }
              40% { transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {step === 2 && suggestion && (
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)",
              border: "1px solid #bfdbfe",
              borderRadius: 14,
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>🧠</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f" }}>
                  Sugerencia IA — {suggestion.confianza}% confianza
                </p>
                <p style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>
                  El sistema ha analizado el contenido del documento y sugiere la siguiente clasificación
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 12px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: catForDoc(suggestion.docType.categoria)?.color + "20",
                  color: catForDoc(suggestion.docType.categoria)?.color,
                }}
              >
                {catForDoc(suggestion.docType.categoria)?.label}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 12px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#f1f5f9",
                  color: "#334155",
                }}
              >
                {suggestion.docType.label}
              </span>
            </div>
          </div>

          <div className="card">
            <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Tipo de documento
            </label>
            <select
              className="input-field"
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              style={{ marginBottom: 24 }}
            >
              <option value="">Selecciona tipo…</option>
              {Object.entries(CATEGORIAS).map(([catId, cat]) => (
                <optgroup key={catId} label={cat.label}>
                  {DOC_TYPES.filter((dt) => dt.categoria === catId).map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn-success"
                disabled={!selectedDocType || saving}
                onClick={handleConfirm}
                style={{ flex: 1 }}
              >
                {saving ? "Guardando…" : "Confirmar y guardar"}
              </button>
              <button
                className="btn-secondary"
                onClick={handleReset}
                style={{ flex: 0 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
