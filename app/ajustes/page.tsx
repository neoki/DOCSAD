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
  const [resetSyncResult, setResetSyncResult] = useState<string | null>(null);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailDaysAhead, setEmailDaysAhead] = useState<7 | 15 | 30>(30);
  const [emailLastSent, setEmailLastSent] = useState<string | null>(null);
  const [emailPendingCount, setEmailPendingCount] = useState<number | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaveMsg, setEmailSaveMsg] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendMsg, setEmailSendMsg] = useState("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [onedriveStatus, setOnedriveStatus] = useState<{ connected: boolean; email?: string; expiresAt?: string } | null>(null);
  const [onedriveLoading, setOnedriveLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [spRoots, setSpRoots] = useState<{
    comunidades: { siteId: string; driveId: string; folderId: string; folderName: string } | null;
    escaner: { siteId: string; driveId: string; folderId: string; folderName: string } | null;
  } | null>(null);
  const [spRootsLoading, setSpRootsLoading] = useState(true);
  const [rediscovering, setRediscovering] = useState(false);

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

    fetch("/api/onedrive")
      .then((r) => r.json())
      .then((data) => setOnedriveStatus({ connected: !!data.connected, email: data.email, expiresAt: data.expiresAt }))
      .catch(() => setOnedriveStatus({ connected: false }))
      .finally(() => setOnedriveLoading(false));

    fetch("/api/sharepoint-roots")
      .then((r) => r.json())
      .then((data) => setSpRoots(data))
      .catch(() => setSpRoots(null))
      .finally(() => setSpRootsLoading(false));

    fetch("/api/alerts/vencimientos")
      .then((r) => r.json())
      .then((data) => {
        if (data.config) {
          setEmailRecipients((data.config.recipients || []).join(", "));
          setEmailDaysAhead(data.config.daysAhead || 30);
        }
        setEmailLastSent(data.lastSent || null);
        setEmailPendingCount(data.pendingCount ?? null);
      })
      .catch(() => {})
      .finally(() => setEmailLoading(false));
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

  const saveEmailConfig = async () => {
    setEmailSaving(true);
    setEmailSaveMsg("");
    try {
      const recipients = emailRecipients
        .split(/[,;\s]+/)
        .map((r) => r.trim())
        .filter((r) => r.includes("@"));
      const res = await fetch("/api/alerts/vencimientos?action=save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, daysAhead: emailDaysAhead }),
      });
      const data = await res.json();
      if (data.ok) {
        setEmailSaveMsg("Configuración guardada correctamente");
        setEmailPendingCount(null);
      } else {
        setEmailSaveMsg(data.error || "Error al guardar");
      }
    } catch {
      setEmailSaveMsg("Error al guardar la configuración");
    } finally {
      setEmailSaving(false);
      setTimeout(() => setEmailSaveMsg(""), 3000);
    }
  };

  const sendEmailNow = async () => {
    setEmailSending(true);
    setEmailSendMsg("");
    try {
      const res = await fetch("/api/alerts/vencimientos?action=send-now", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const count = data.sentCount || 0;
        setEmailSendMsg(count === 0 ? "Sin vencimientos pendientes de notificar." : `Email enviado con ${count} documento${count !== 1 ? "s" : ""}.`);
        if (data.lastSent) setEmailLastSent(data.lastSent);
      } else {
        setEmailSendMsg(data.error || "Error al enviar el email");
      }
    } catch {
      setEmailSendMsg("Error al enviar el email");
    } finally {
      setEmailSending(false);
      setTimeout(() => setEmailSendMsg(""), 6000);
    }
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

      <h2 className="section-title">Conexión SharePoint</h2>
      <div
        className="card-static"
        style={{ borderLeft: `4px solid ${onedriveStatus?.connected ? "#22c55e" : "#dc2626"}`, maxWidth: 720 }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: onedriveStatus?.connected ? "#22c55e" : "#dc2626",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              Microsoft SharePoint — Conexión de aplicación
            </h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              {onedriveLoading
                ? "Verificando credenciales..."
                : onedriveStatus?.connected
                  ? "Conectado permanentemente — sin dependencia de cuenta personal"
                  : "Credenciales no configuradas o sin permisos"}
            </p>
          </div>
          {!onedriveLoading && (
            <div
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: onedriveStatus?.connected ? "#dcfce7" : "#fef2f2",
                color: onedriveStatus?.connected ? "#16a34a" : "#dc2626",
              }}
            >
              {onedriveStatus?.connected ? "ACTIVO" : "SIN CONEXIÓN"}
            </div>
          )}
        </div>

        {onedriveStatus?.connected ? (
          <div>
            <div style={{ padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#15803d", margin: 0 }}>
                La aplicación se autentica directamente en Microsoft Graph usando sus propias credenciales
                (Client ID + Secret). El token se renueva automáticamente cada hora sin intervención manual.
                No depende de ninguna cuenta personal de usuario.
              </p>
            </div>
            <button
              className="btn-secondary"
              onClick={async () => {
                setConnecting(true);
                try {
                  const res = await fetch("/api/onedrive");
                  const data = await res.json();
                  setOnedriveStatus({ connected: !!data.connected });
                  alert(data.connected ? "Conexión verificada correctamente." : "La verificación falló. Revisa los permisos en Azure Portal.");
                } catch {
                  alert("Error al verificar la conexión.");
                }
                setConnecting(false);
              }}
              disabled={connecting}
            >
              {connecting ? "Verificando..." : "Verificar conexión"}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 8px 0", fontWeight: 600 }}>
                La conexión no está funcionando. Causas posibles:
              </p>
              <ul style={{ fontSize: 13, color: "#7f1d1d", margin: 0, paddingLeft: 18 }}>
                <li>Las variables MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET o MICROSOFT_TENANT_ID no están configuradas</li>
                <li>La aplicación en Azure no tiene permisos de aplicación (Application permissions) para <code>Sites.Read.All</code> y <code>Files.ReadWrite.All</code></li>
                <li>No se ha concedido el &ldquo;Admin consent&rdquo; en Azure Portal para esos permisos</li>
              </ul>
            </div>
            <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 13, color: "#475569", margin: "0 0 4px 0", fontWeight: 600 }}>Cómo configurarlo en Azure Portal:</p>
              <ol style={{ fontSize: 13, color: "#64748b", margin: 0, paddingLeft: 18 }}>
                <li>Ve a Azure Portal → App registrations → tu aplicación</li>
                <li>Sección &ldquo;API permissions&rdquo; → Add permission → Microsoft Graph → Application permissions</li>
                <li>Añade: <code>Sites.Read.All</code> y <code>Files.ReadWrite.All</code></li>
                <li>Pulsa &ldquo;Grant admin consent&rdquo; para tu organización</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <h2 className="section-title" style={{ marginTop: 40 }}>Sincronización SharePoint</h2>
      <div
        className="card-static"
        style={{ borderLeft: "4px solid #8B5CF6", maxWidth: 720 }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sincronización automática</h3>
        <p style={{ color: "#475569", fontSize: 14, marginBottom: 16 }}>
          La sincronización con SharePoint se realiza automáticamente cada 5 minutos mientras el Dashboard está abierto. El estado y la última sincronización se muestran en el Dashboard.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn-secondary"
            onClick={async () => {
              if (!confirm("¿Resetear el estado de sincronización? Usa esto solo si el sync se ha quedado bloqueado indefinidamente.")) return;
              try {
                const res = await fetch("/api/sync", { method: "DELETE" });
                const data = await res.json();
                setResetSyncResult(data.success ? "Estado reseteado correctamente." : (data.error ?? "Error desconocido."));
                setTimeout(() => setResetSyncResult(null), 4000);
              } catch (err) {
                setResetSyncResult(String(err));
                setTimeout(() => setResetSyncResult(null), 4000);
              }
            }}
            style={{ minWidth: 160 }}
          >
            Resetear sync
          </button>
          {resetSyncResult && (
            <span style={{ fontSize: 13, color: "#475569" }}>{resetSyncResult}</span>
          )}
        </div>

        {/* SP Roots panel */}
        <div style={{ marginTop: 32, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>Carpetas permitidas</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Solo se accede a estas carpetas en SharePoint. El resto queda completamente aislado.</div>
            </div>
            <button
              onClick={async () => {
                setRediscovering(true);
                try {
                  const r = await fetch("/api/sharepoint-roots", { method: "POST" });
                  const data = await r.json();
                  setSpRoots(data);
                } catch {
                  // ignore
                } finally {
                  setRediscovering(false);
                }
              }}
              disabled={rediscovering}
              style={{ padding: "8px 16px", borderRadius: 8, background: "#4F7CFF", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: rediscovering ? 0.7 : 1 }}
            >
              {rediscovering ? "Redescubriendo..." : "Redescubrir"}
            </button>
          </div>

          {spRootsLoading ? (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Cargando...</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { label: "Comunidades", data: spRoots?.comunidades },
                { label: "Escáner", data: spRoots?.escaner },
              ].map(({ label, data }) => (
                <div key={label} style={{ background: "#fff", border: `1px solid ${data ? "#86efac" : "#fca5a5"}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{data ? "✅" : "❌"}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>{label}</span>
                  </div>
                  {data ? (
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                      <div><span style={{ color: "#94a3b8" }}>Carpeta:</span> {data.folderName}</div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, marginTop: 4, color: "#94a3b8", wordBreak: "break-all" }}>
                        Drive: {data.driveId.slice(0, 20)}...
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "#dc2626" }}>No encontrada. Verifica que la carpeta existe en SharePoint.</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <h2 className="section-title" style={{ marginTop: 40 }}>Alertas por email</h2>
      <div className="card-static" style={{ borderLeft: "4px solid #f59e0b", maxWidth: 720 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: "#f59e0b", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Resumen semanal de vencimientos</h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
              El sistema comprueba automáticamente cada lunes si hay documentos próximos a vencer y envía un resumen a los destinatarios configurados.
            </p>
          </div>
        </div>

        {emailLoading ? (
          <p style={{ fontSize: 13, color: "#94a3b8" }}>Cargando configuración...</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                Destinatarios (separados por coma o punto y coma)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="gestor@asesoriadiaz.com, otro@empresa.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                style={{ width: "100%" }}
              />
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Los gestores responsables de recibir el email semanal de vencimientos.
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Horizonte de alerta
              </label>
              <div className="flex gap-3">
                {([7, 15, 30] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setEmailDaysAhead(days)}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: `2px solid ${emailDaysAhead === days ? "#f59e0b" : "#e2e8f0"}`,
                      background: emailDaysAhead === days ? "#fef3c7" : "#fff",
                      color: emailDaysAhead === days ? "#92400e" : "#64748b",
                      fontWeight: emailDaysAhead === days ? 700 : 500,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    {days} días
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                El email incluirá todos los documentos que venzan dentro de este período.
              </p>
            </div>

            {emailLastSent && (
              <div style={{ padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", marginBottom: 16, fontSize: 13, color: "#15803d" }}>
                Último envío: <strong>{new Date(emailLastSent).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</strong>
              </div>
            )}

            {emailPendingCount !== null && emailPendingCount > 0 && (
              <div style={{ padding: "8px 12px", background: "#fff7ed", borderRadius: 8, border: "1px solid #fed7aa", marginBottom: 16, fontSize: 13, color: "#c2410c" }}>
                Hay <strong>{emailPendingCount} documento{emailPendingCount !== 1 ? "s" : ""}</strong> con vencimiento dentro del horizonte configurado.
              </div>
            )}

            <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
              <button
                className="btn-primary"
                onClick={saveEmailConfig}
                disabled={emailSaving}
                style={{ minWidth: 160, background: "#f59e0b" }}
              >
                {emailSaving ? "Guardando..." : "Guardar configuración"}
              </button>
              <button
                className="btn-secondary"
                onClick={sendEmailNow}
                disabled={emailSending}
                style={{ minWidth: 140 }}
              >
                {emailSending ? (
                  <span className="inline-flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeLinecap="round" />
                    </svg>
                    Enviando...
                  </span>
                ) : "Enviar ahora"}
              </button>
              {emailSaveMsg && (
                <span style={{ fontSize: 13, fontWeight: 600, color: emailSaveMsg.includes("correctamente") ? "#16a34a" : "#dc2626" }}>
                  {emailSaveMsg}
                </span>
              )}
              {emailSendMsg && (
                <span style={{ fontSize: 13, fontWeight: 600, color: ["error", "no configurada", "no hay destinatarios"].some((s) => emailSendMsg.toLowerCase().includes(s)) ? "#dc2626" : "#16a34a" }}>
                  {emailSendMsg}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <OcrConfigSection />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function OcrConfigSection() {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ajustes/ocr")
      .then((r) => r.json())
      .then((d) => {
        setEndpoint(d.endpoint ?? "");
        setApiKey(d.apiKeyMasked ?? "");
        setHasKey(d.hasKey ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ajustes/ocr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, apiKey }),
      });
      if (res.ok) {
        setMsg("Configuración guardada correctamente");
        const d = await fetch("/api/ajustes/ocr").then((r) => r.json());
        setApiKey(d.apiKeyMasked ?? "");
        setHasKey(d.hasKey ?? false);
      } else {
        setMsg("Error al guardar la configuración");
      }
    } catch {
      setMsg("Error al guardar la configuración");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="card-static" style={{ marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          🧾
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>OCR de Facturas (Azure)</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Extracción automática de datos de facturas mediante Azure Document Intelligence</div>
        </div>
        {hasKey && !loading && (
          <span style={{ marginLeft: "auto", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600 }}>
            Configurado
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Cargando configuración...</div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Endpoint de Azure Document Intelligence
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://tu-recurso.cognitiveservices.azure.com"
              className="form-input"
              style={{ width: "100%" }}
            />
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Puedes encontrarlo en el portal de Azure → tu recurso Document Intelligence → Claves y endpoint.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
              Clave de API (Ocp-Apim-Subscription-Key)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "••••••••••••••••" : "Pega aquí la clave de API"}
              className="form-input"
              style={{ width: "100%" }}
            />
            {hasKey && (
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                Hay una clave guardada. Introduce una nueva clave para reemplazarla.
              </p>
            )}
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>¿Cómo funciona?</div>
            <ul style={{ fontSize: 12, color: "#64748b", margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Cuando se sube un archivo a una carpeta de facturas en SharePoint, el sistema lo analiza automáticamente.</li>
              <li>El análisis extrae: <strong>importe total, proveedor, fecha y número de factura</strong>.</li>
              <li>Los datos extraídos aparecen como chips en la pestaña Documentos y en la pestaña Facturas de cada comunidad.</li>
              <li>El análisis se realiza en segundo plano usando el modelo <em>prebuilt-invoice</em> de Azure Document Intelligence.</li>
            </ul>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !endpoint || !apiKey}
              style={{ minWidth: 160, background: "#4F7CFF" }}
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
            {msg && (
              <span style={{ fontSize: 13, fontWeight: 600, color: msg.includes("correctamente") ? "#16a34a" : "#dc2626" }}>
                {msg}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
