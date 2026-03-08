"use client";

import { useState, useEffect } from "react";

interface ProviderConfig {
  apiKey: string;
  model: string;
  active: boolean;
}

interface ProviderDef {
  id: string;
  name: string;
  description: string;
  color: string;
  initial: string;
  models: string[];
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "openai",
    name: "OpenAI GPT",
    description: "Modelos de lenguaje avanzados de OpenAI",
    color: "#10a37f",
    initial: "O",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "IA segura y fiable de Anthropic",
    color: "#d97706",
    initial: "A",
    models: ["claude-sonnet-4", "claude-3.5-haiku", "claude-3-opus"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Modelos multimodales de Google DeepMind",
    color: "#4285f4",
    initial: "G",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  },
  {
    id: "copilot",
    name: "Microsoft Copilot",
    description: "IA integrada en el ecosistema Microsoft",
    color: "#0078d4",
    initial: "C",
    models: ["copilot-gpt4", "copilot-gpt3.5"],
  },
  {
    id: "kimi",
    name: "Moonshot Kimi K2",
    description: "Modelo de lenguaje de Moonshot AI",
    color: "#7c3aed",
    initial: "K",
    models: ["kimi-k2", "kimi-k1.5"],
  },
];

function defaultProviders(): Record<string, ProviderConfig> {
  const result: Record<string, ProviderConfig> = {};
  PROVIDERS.forEach((p, i) => {
    result[p.id] = { apiKey: "", model: p.models[0], active: i === 0 };
  });
  return result;
}

export default function AjustesPage() {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>(defaultProviders);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ajustes")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) {
          setProviders((prev) => {
            const merged = { ...prev };
            for (const key of Object.keys(data.providers)) {
              if (merged[key]) {
                merged[key] = {
                  ...merged[key],
                  model: data.providers[key].model || merged[key].model,
                  active: data.providers[key].active ?? merged[key].active,
                  apiKey: data.providers[key].hasKey ? data.providers[key].apiKeyMasked : "",
                };
              }
            }
            return merged;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateProvider = (id: string, field: keyof ProviderConfig, value: string | boolean) => {
    setProviders((prev) => {
      const next = { ...prev };
      if (field === "active" && value === true) {
        for (const key of Object.keys(next)) {
          next[key] = { ...next[key], active: key === id };
        }
      } else {
        next[id] = { ...next[id], [field]: value };
      }
      return next;
    });
  };

  const testConnection = (id: string) => {
    setTesting((prev) => ({ ...prev, [id]: true }));
    setTestResult((prev) => ({ ...prev, [id]: "" }));
    setTimeout(() => {
      const hasKey = providers[id]?.apiKey?.trim().length > 0;
      setTestResult((prev) => ({
        ...prev,
        [id]: hasKey ? "Conexión simulada correctamente" : "Sin clave API configurada",
      }));
      setTesting((prev) => ({ ...prev, [id]: false }));
    }, 1500);
  };

  const saveAll = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const toSend: Record<string, ProviderConfig> = {};
      for (const [id, cfg] of Object.entries(providers)) {
        toSend[id] = {
          ...cfg,
          apiKey: cfg.apiKey.includes("****") ? "" : cfg.apiKey,
        };
      }
      const res = await fetch("/api/ajustes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: toSend }),
      });
      if (res.ok) {
        setSaveMsg("Configuración guardada correctamente");
      } else {
        setSaveMsg("Error al guardar la configuración");
      }
    } catch {
      setSaveMsg("Error al guardar la configuración");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "60vh" }}>
        <p className="text-sm text-slate-400">Cargando configuración...</p>
      </div>
    );
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://tu-app.replit.app";

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: 4 }}>Ajustes</h1>
      <p className="page-subtitle" style={{ marginBottom: 28 }}>
        Configuración de modelos de IA y conexiones externas
      </p>

      <h2 className="section-title">Modelos de IA</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {PROVIDERS.map((prov) => {
          const cfg = providers[prov.id];
          const isActive = cfg?.active;
          return (
            <div
              key={prov.id}
              className="card"
              style={{
                border: isActive ? `2px solid ${prov.color}` : "2px solid transparent",
                position: "relative",
              }}
            >
              <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: prov.color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {prov.initial}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{prov.name}</div>
                  <div style={{ color: "#64748b", fontSize: 14 }}>{prov.description}</div>
                </div>
                <button
                  onClick={() => updateProvider(prov.id, "active", true)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: `2px solid ${isActive ? prov.color : "#cbd5e1"}`,
                    background: isActive ? prov.color : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title={isActive ? "Modelo activo" : "Activar este modelo"}
                >
                  {isActive && (
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff" }} />
                  )}
                </button>
              </div>

              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                API Key
              </label>
              <div className="flex gap-2" style={{ marginBottom: 12 }}>
                <input
                  type={showKeys[prov.id] ? "text" : "password"}
                  className="input-field"
                  placeholder="sk-..."
                  value={cfg?.apiKey || ""}
                  onChange={(e) => updateProvider(prov.id, "apiKey", e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn-secondary"
                  style={{ padding: "8px 12px" }}
                  onClick={() => setShowKeys((prev) => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                >
                  {showKeys[prov.id] ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Modelo
              </label>
              <select
                className="input-field"
                value={cfg?.model || prov.models[0]}
                onChange={(e) => updateProvider(prov.id, "model", e.target.value)}
                style={{ marginBottom: 12 }}
              >
                {prov.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary"
                  style={{ padding: "8px 16px" }}
                  onClick={() => testConnection(prov.id)}
                  disabled={testing[prov.id]}
                >
                  {testing[prov.id] ? (
                    <span className="inline-flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeLinecap="round" />
                      </svg>
                      Probando...
                    </span>
                  ) : (
                    "Probar conexión"
                  )}
                </button>
                {testResult[prov.id] && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: testResult[prov.id].includes("correctamente") ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {testResult[prov.id]}
                  </span>
                )}
              </div>

              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 16,
                    background: prov.color,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 12px",
                    borderRadius: "0 0 6px 6px",
                  }}
                >
                  ACTIVO
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3" style={{ marginBottom: 40 }}>
        <button className="btn-primary" onClick={saveAll} disabled={saving} style={{ minWidth: 180 }}>
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
        {saveMsg && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: saveMsg.includes("correctamente") ? "#16a34a" : "#dc2626",
            }}
          >
            {saveMsg}
          </span>
        )}
      </div>

      <h2 className="section-title">Conexión OneDrive</h2>
      <div
        className="card-static"
        style={{ borderLeft: "4px solid #3b82f6", maxWidth: 720 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Configuración de OneDrive</h3>
        <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>
          Para conectar una carpeta de OneDrive, necesitas registrar una aplicación en Azure Active Directory.
        </p>

        <ol style={{ paddingLeft: 20, fontSize: 14, color: "#334155", lineHeight: 1.8, marginBottom: 16 }}>
          <li>
            Accede a{" "}
            <strong>portal.azure.com</strong> → Azure Active Directory → App registrations
          </li>
          <li>
            Registra una nueva aplicación con redirect URI:{" "}
            <code
              style={{
                background: "#f1f5f9",
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: "monospace",
              }}
            >
              {appUrl}/api/onedrive/callback
            </code>
          </li>
          <li>
            En &quot;API permissions&quot;, añade <strong>Microsoft Graph → Files.Read.All</strong>
          </li>
          <li>
            Crea un Client Secret en &quot;Certificates &amp; secrets&quot;
          </li>
          <li>
            Configura las siguientes variables de entorno en Replit Secrets:
            <div className="flex flex-wrap gap-2" style={{ marginTop: 8 }}>
              {[
                "MICROSOFT_CLIENT_ID",
                "MICROSOFT_CLIENT_SECRET",
                "MICROSOFT_TENANT_ID",
                "ONEDRIVE_FOLDER_PATH",
              ].map((v) => (
                <span
                  key={v}
                  style={{
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: 6,
                    padding: "4px 12px",
                    fontSize: 13,
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: "#4338ca",
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
              (ruta de la carpeta a sincronizar, ej: /DocFincas)
            </div>
          </li>
        </ol>

        <p style={{ fontSize: 14, color: "#3b82f6", fontWeight: 600, marginTop: 12 }}>
          Una vez configuradas las credenciales, la página de OneDrive se activará automáticamente.
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
