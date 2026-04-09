"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

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
      <line x1="9" y1="8" x2="9" y2="8" strokeWidth="1" />
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

export default function AsistentePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noProvider, setNoProvider] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (data.error === "no_provider") {
        setNoProvider(true);
        setMessages(messages);
        setLoading(false);
        return;
      }

      if (data.error === "api_error") {
        setError(data.message ?? "Error al llamar a la IA");
        setLoading(false);
        return;
      }

      if (data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ paddingBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Asistente IA
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
          Consulta información sobre comunidades, documentos, vencimientos y más.
        </p>
      </div>

      {noProvider && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fbbf24",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 16,
            color: "#92400e",
            fontSize: 14,
          }}
        >
          <strong>Sin proveedor de IA configurado.</strong> Ve a{" "}
          <a href="/ajustes" style={{ color: "#b45309", textDecoration: "underline" }}>
            Ajustes
          </a>{" "}
          y añade una API key de OpenAI, Anthropic, Gemini u otro proveedor compatible.
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            color: "#991b1b",
            fontSize: 13,
          }}
        >
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
          padding: 24,
          marginBottom: 16,
        }}
      >
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
                boxShadow: "0 4px 20px rgba(79,124,255,0.3)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a9 9 0 0 1 9 9c0 3.4-1.9 6.4-4.7 8L12 22l-4.3-3C4.9 17.4 3 14.4 3 11a9 9 0 0 1 9-9z" />
                <circle cx="9" cy="11" r="1" fill="white" />
                <circle cx="12" cy="11" r="1" fill="white" />
                <circle cx="15" cy="11" r="1" fill="white" />
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>
              ¿En qué te puedo ayudar?
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 32px", textAlign: "center", maxWidth: 400 }}>
              Puedo consultar información sobre comunidades, documentos, vencimientos, checklists y notas del sistema.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 640 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 20,
                    padding: "8px 16px",
                    fontSize: 13,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
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
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "12px 16px",
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
              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748b",
                  }}
                >
                  <BotIcon />
                </div>
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "12px 16px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
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
          borderRadius: 16,
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
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
            maxHeight: 160,
            overflowY: "auto",
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 160) + "px";
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
            borderRadius: 12,
            width: 40,
            height: 40,
            cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
