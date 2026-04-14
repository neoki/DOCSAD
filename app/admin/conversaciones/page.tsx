"use client";

import { useState, useEffect } from "react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  user: UserInfo;
  _count: { messages: number };
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  user: UserInfo;
  messages: ChatMessage[];
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = ["#4F7CFF", "#8B5CF6", "#10b981", "#f59e0b", "#ef4444"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminConversacionesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/conversations")
      .then((r) => r.json())
      .then((data) => {
        setConversations(data.conversations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    fetch(`/api/admin/conversations/${selectedId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data.conversation || null); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [selectedId]);

  const users: UserInfo[] = Array.from(
    new Map(conversations.map((c) => [c.user.id, c.user])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = selectedUser === "all"
    ? conversations
    : conversations.filter((c) => c.user.id === selectedUser);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">Conversaciones del Asistente</h1>
          <p className="page-subtitle">
            {conversations.length} conversaciones de {users.length} usuario{users.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left panel: user filter + conversation list */}
        <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* User filter */}
          <div className="card" style={{ padding: "12px 14px" }}>
            <div className="section-label mb-2">Filtrar por usuario</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button
                onClick={() => setSelectedUser("all")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: selectedUser === "all" ? "#eff6ff" : "transparent",
                  fontWeight: selectedUser === "all" ? 600 : 400,
                  color: selectedUser === "all" ? "#2563eb" : "#374151",
                  fontSize: 13,
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 28, height: 28, borderRadius: "50%", background: "#e2e8f0",
                  fontSize: 12, fontWeight: 700, color: "#64748b",
                }}>T</span>
                <span className="flex-1">Todos los usuarios</span>
                <span style={{
                  background: "#e2e8f0", color: "#64748b", borderRadius: 10,
                  padding: "1px 7px", fontSize: 11, fontWeight: 600,
                }}>
                  {conversations.length}
                </span>
              </button>
              {users.map((u) => {
                const count = conversations.filter((c) => c.user.id === u.id).length;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      background: selectedUser === u.id ? "#eff6ff" : "transparent",
                      fontWeight: selectedUser === u.id ? 600 : 400,
                      color: selectedUser === u.id ? "#2563eb" : "#374151",
                      fontSize: 13,
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <UserAvatar name={u.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                    </div>
                    <span style={{
                      background: selectedUser === u.id ? "#dbeafe" : "#e2e8f0",
                      color: selectedUser === u.id ? "#2563eb" : "#64748b",
                      borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 600,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation list */}
          <div className="card" style={{ flex: 1, overflowY: "auto", padding: 0 }}>
            {loading ? (
              <div className="text-sm text-gray-400 text-center py-8">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">Sin conversaciones</div>
            ) : (
              <div>
                {filtered.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      width: "100%",
                      padding: "12px 14px",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                      border: "none",
                      cursor: "pointer",
                      background: selectedId === c.id ? "#eff6ff" : "transparent",
                      textAlign: "left",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedUser === "all" && <UserAvatar name={c.user.name} />}
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: selectedId === c.id ? "#2563eb" : "#1e293b",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {c.title || "Conversación sin título"}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                        {c._count.messages} msg
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: selectedUser === "all" ? 36 : 0 }}>
                      {selectedUser === "all" && (
                        <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 500 }}>{c.user.name}</span>
                      )}
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {new Date(c.updatedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: conversation messages */}
        <div className="card" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selectedId ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#94a3b8" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a9 9 0 0 1 9 9c0 3.4-1.9 6.4-4.7 8L12 22l-4.3-3C4.9 17.4 3 14.4 3 11a9 9 0 0 1 9-9z" />
                <circle cx="9" cy="11" r="1" fill="currentColor" />
                <circle cx="12" cy="11" r="1" fill="currentColor" />
                <circle cx="15" cy="11" r="1" fill="currentColor" />
              </svg>
              <span style={{ fontSize: 14 }}>Selecciona una conversación para leerla</span>
            </div>
          ) : detailLoading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
              Cargando conversación...
            </div>
          ) : detail ? (
            <>
              {/* Header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <UserAvatar name={detail.user.name} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{detail.title || "Conversación sin título"}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {detail.user.name} · {detail.user.email} · {formatDate(detail.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                {detail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: msg.role === "user" ? "row-reverse" : "row",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: msg.role === "user" ? "#4F7CFF" : "#f1f5f9",
                      color: msg.role === "user" ? "#fff" : "#64748b",
                      fontSize: 12,
                      fontWeight: 700,
                    }}>
                      {msg.role === "user"
                        ? detail.user.name.charAt(0).toUpperCase()
                        : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a9 9 0 0 1 9 9c0 3.4-1.9 6.4-4.7 8L12 22l-4.3-3C4.9 17.4 3 14.4 3 11a9 9 0 0 1 9-9z" />
                          </svg>
                        )}
                    </div>
                    <div style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                      background: msg.role === "user" ? "#4F7CFF" : "#f8fafc",
                      color: msg.role === "user" ? "#fff" : "#1e293b",
                      fontSize: 13,
                      lineHeight: 1.6,
                      border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 14 }}>
              No se pudo cargar la conversación
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
