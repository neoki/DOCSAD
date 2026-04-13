"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = { role: "user" | "assistant"; content: string };

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#6b7280",
            display: "inline-block",
            animation: "bounce 1.2s infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function BotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M7 13.5A7 7 0 0 0 5 18h14a7 7 0 0 0-2-4.5" />
      <line x1="12" y1="3" x2="12" y2="1" />
      <circle cx="12" cy="1" r="0.5" />
      <circle cx="9.5" cy="8" r="0.8" fill="currentColor" />
      <circle cx="14.5" cy="8" r="0.8" fill="currentColor" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const SUGGESTIONS = [
  "¿Qué comunidades tienen el checklist incompleto?",
  "¿Cuáles son los vencimientos más próximos?",
  "¿Qué documentos tiene la comunidad 000123?",
  "¿Qué comunidades no están vinculadas a SharePoint?",
  "¿Cuántas comunidades tienen más de 50 archivos?",
  "Dame un resumen de las notas más recientes",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function AsistentePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProvider, setNoProvider] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  async function loadConversation(id: string) {
    setLoadingHistory(true);
    setError(null);
    setNoProvider(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = (data.conversation.messages ?? []).map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );
        setMessages(msgs);
        setActiveConversationId(id);
      } else {
        setError("No se pudo cargar la conversación.");
      }
    } catch {
      setError("No se pudo cargar la conversación. Comprueba tu conexión.");
    }
    setLoadingHistory(false);
  }

  function startNewConversation() {
    setMessages([]);
    setActiveConversationId(null);
    setError(null);
    setNoProvider(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function deleteConversation(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          startNewConversation();
        }
      } else {
        setError("No se pudo eliminar la conversación.");
      }
    } catch {
      setError("No se pudo eliminar la conversación. Comprueba tu conexión.");
    }
    setDeletingId(null);
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setNoProvider(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          conversationId: activeConversationId ?? undefined,
        }),
      });

      const data = await res.json();

      if (data.error === "no_provider") {
        setNoProvider(true);
        setLoading(false);
        return;
      }

      if (data.error === "api_error" || data.error === "config_error") {
        setError(data.message ?? "Error al llamar a la IA");
        setLoading(false);
        return;
      }

      if (data.reply) {
        const withReply = [...newMessages, { role: "assistant" as const, content: data.reply }];
        setMessages(withReply);

        if (data.persistenceWarning) {
          setError(data.persistenceWarning);
        }

        if (data.conversationId) {
          const isNew = !activeConversationId;
          setActiveConversationId(data.conversationId);
          if (isNew) {
            await loadConversations();
          } else {
            setConversations((prev) => {
              const updated = prev.map((c) =>
                c.id === data.conversationId
                  ? { ...c, updatedAt: new Date().toISOString(), _count: { messages: c._count.messages + 2 } }
                  : c
              );
              return [...updated].sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            });
          }
        }
      }
    } catch (err) {
      setError(`Error de red: ${String(err)}`);
    }

    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", gap: 0, overflow: "hidden" }}>

      {sidebarOpen && (
        <div
          style={{
            width: 260,
            flexShrink: 0,
            background: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 12px 12px", borderBottom: "1px solid #e2e8f0" }}>
            <button
              onClick={startNewConversation}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 7,
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nueva conversación
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
            {conversations.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "20px 8px" }}>
                Aún no hay conversaciones guardadas
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 8,
                    marginBottom: 2,
                    background: activeConversationId === conv.id ? "#e0e7ff" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (activeConversationId !== conv.id)
                      (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                  }}
                  onMouseLeave={(e) => {
                    if (activeConversationId !== conv.id)
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <button
                    onClick={() => loadConversation(conv.id)}
                    style={{
                      flex: 1,
                      background: "none",
                      border: "none",
                      padding: "8px 10px",
                      textAlign: "left",
                      cursor: "pointer",
                      borderRadius: 8,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: activeConversationId === conv.id ? 600 : 400,
                        color: activeConversationId === conv.id ? "#3730a3" : "#374151",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.4,
                      }}
                    >
                      {conv.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {formatDate(conv.updatedAt)}
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    disabled={deletingId === conv.id}
                    title="Eliminar conversación"
                    style={{
                      background: "none",
                      border: "none",
                      padding: "6px 8px",
                      cursor: "pointer",
                      color: "#cbd5e1",
                      borderRadius: 6,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, padding: "0 0 0 0" }}>
        <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Ocultar historial" : "Mostrar historial"}
            style={{
              background: "none",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "5px 8px",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>Asistente IA</h1>
            <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>
              Consulta información sobre comunidades, documentos, vencimientos y más.
            </p>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 20px 16px", minHeight: 0 }}>
          {noProvider && (
            <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 10, padding: "14px 18px", marginTop: 12, color: "#92400e", fontSize: 14 }}>
              <strong>Sin proveedor de IA configurado.</strong> Ve a{" "}
              <a href="/ajustes" style={{ color: "#b45309", textDecoration: "underline" }}>Ajustes</a>{" "}
              y añade una API key de OpenAI, Anthropic, Gemini u otro proveedor compatible.
            </div>
          )}

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginTop: 12, color: "#991b1b", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              borderRadius: 16,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: 20,
              marginTop: 12,
              marginBottom: 12,
              minHeight: 0,
            }}
          >
            {loadingHistory ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 40, color: "#94a3b8", fontSize: 14 }}>
                Cargando conversación...
              </div>
            ) : isEmpty ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 30 }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    boxShadow: "0 4px 20px rgba(79,124,255,0.3)",
                  }}
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a9 9 0 0 1 9 9c0 3.4-1.9 6.4-4.7 8L12 22l-4.3-3C4.9 17.4 3 14.4 3 11a9 9 0 0 1 9-9z" />
                    <circle cx="9" cy="11" r="1" fill="white" />
                    <circle cx="12" cy="11" r="1" fill="white" />
                    <circle cx="15" cy="11" r="1" fill="white" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>¿En qué te puedo ayudar?</h2>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 24px", textAlign: "center", maxWidth: 380 }}>
                  Puedo consultar información sobre comunidades, documentos, vencimientos, checklists y notas del sistema.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 580 }}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      style={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 20,
                        padding: "7px 14px",
                        fontSize: 12,
                        color: "#475569",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#4F7CFF";
                        (e.currentTarget as HTMLButtonElement).style.color = "#4F7CFF";
                        (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
                        (e.currentTarget as HTMLButtonElement).style.color = "#475569";
                        (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      flexDirection: m.role === "user" ? "row-reverse" : "row",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        flexShrink: 0,
                        background: m.role === "user"
                          ? "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)"
                          : "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: m.role === "user" ? "#fff" : "#64748b",
                      }}
                    >
                      {m.role === "user" ? <UserIcon /> : <BotIcon />}
                    </div>
                    <div
                      style={{
                        maxWidth: "75%",
                        background: m.role === "user" ? "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)" : "#fff",
                        color: m.role === "user" ? "#fff" : "#1e293b",
                        borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: "10px 14px",
                        fontSize: 14,
                        lineHeight: 1.65,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                        border: m.role === "assistant" ? "1px solid #e2e8f0" : "none",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                      <BotIcon />
                    </div>
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <LoadingDots />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta sobre cualquier comunidad..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#1e293b",
                background: "transparent",
                fontFamily: "inherit",
                maxHeight: 140,
                overflowY: "auto",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 140) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)"
                  : "#e2e8f0",
                color: input.trim() && !loading ? "#fff" : "#94a3b8",
                border: "none",
                borderRadius: 10,
                width: 38,
                height: 38,
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
