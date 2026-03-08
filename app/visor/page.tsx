"use client";

import { useState } from "react";

export default function VisorPage() {
  const [zoom, setZoom] = useState(100);

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 50));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", margin: "-24px -32px" }}>
      <div
        style={{
          background: "#1e293b",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
            acta_junta_ordinaria_2024.pdf
          </span>
          <span
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: 6,
            }}
          >
            0.9 MB
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={zoomOut}
            disabled={zoom <= 50}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: zoom <= 50 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              opacity: zoom <= 50 ? 0.4 : 1,
            }}
          >
            −
          </button>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, minWidth: 44, textAlign: "center" }}>
            {zoom}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoom >= 200}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              width: 32,
              height: 32,
              borderRadius: 6,
              cursor: zoom >= 200 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              opacity: zoom >= 200 ? 0.4 : 1,
            }}
          >
            +
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          background: "#475569",
          overflow: "auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "32px 16px",
        }}
      >
        <div
          style={{
            background: "#fff",
            width: 595,
            minHeight: 842,
            borderRadius: 4,
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
            padding: "48px 56px",
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.2s ease",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Comunidad de Propietarios
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "8px 0 4px" }}>
              C.P. Las Magnolias
            </h1>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>
              CIF H-12345678 · Av. de las Magnolias 12, Madrid
            </p>
          </div>

          <div style={{ borderBottom: "2px solid #4F7CFF", marginBottom: 24 }} />

          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", textAlign: "center", marginBottom: 20 }}>
            ACTA DE JUNTA GENERAL ORDINARIA
          </h2>

          <p style={{ fontSize: 12, color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
            En Madrid, a 15 de marzo de 2024, siendo las 18:00 horas, se reúnen en primera
            convocatoria los propietarios de la Comunidad C.P. Las Magnolias.
          </p>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Asistentes:</p>
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
              Asisten 18 propietarios de un total de 24, representando el 72,5% de las cuotas
              de participación. Quórum suficiente para la celebración de la junta.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Orden del día:</p>
            <ol style={{ fontSize: 12, color: "#475569", lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
              <li>Lectura y aprobación del acta anterior</li>
              <li>Aprobación de las cuentas del ejercicio 2023</li>
              <li>Aprobación del presupuesto para el ejercicio 2024</li>
              <li>Renovación del contrato de mantenimiento del ascensor</li>
              <li>Obras de reforma en la fachada principal</li>
              <li>Ruegos y preguntas</li>
            </ol>
          </div>

          <div style={{ borderBottom: "1px solid #e2e8f0", margin: "20px 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div
                  style={{
                    height: 8,
                    background: "#e2e8f0",
                    borderRadius: 4,
                    width: `${85 + (i % 3) * 5}%`,
                  }}
                />
                <div
                  style={{
                    height: 8,
                    background: "#e2e8f0",
                    borderRadius: 4,
                    width: `${70 + (i % 4) * 8}%`,
                  }}
                />
                <div
                  style={{
                    height: 8,
                    background: "#e2e8f0",
                    borderRadius: 4,
                    width: `${60 + (i % 2) * 15}%`,
                  }}
                />
                {i < 6 && <div style={{ height: 6 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#1e293b",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18 }}>🧠</span>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>
          IA clasificó este documento como:
        </span>
        <span
          style={{
            background: "rgba(79,124,255,0.15)",
            color: "#4F7CFF",
            fontSize: 13,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 9999,
          }}
        >
          Acta junta ordinaria
        </span>
        <span
          style={{
            background: "rgba(34,197,94,0.15)",
            color: "#22C55E",
            fontSize: 13,
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: 9999,
          }}
        >
          98% confianza
        </span>
        <span style={{ color: "#64748b", fontSize: 13 }}>
          Confirmada por usuario
        </span>
      </div>
    </div>
  );
}
