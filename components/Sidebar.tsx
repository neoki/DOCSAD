"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="14" rx="1" />
        <rect x="17" y="3" width="4" height="18" rx="1" />
      </svg>
    ),
  },
  {
    label: "Comunidades",
    href: "/comunidades",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
      </svg>
    ),
  },
  {
    label: "Escáner",
    href: "/escaner",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        width: 240,
        minHeight: "100vh",
      }}
      className="fixed left-0 top-0 flex flex-col z-50"
    >
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
              padding: 6,
              boxShadow: "0 2px 8px rgba(79, 124, 255, 0.4)",
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(255,255,255,0.8)",
                  borderRadius: 1.5,
                }}
              />
            ))}
          </div>
          <span
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: "-0.02em",
            }}
          >
            DocFincas
          </span>
        </div>
        <span
          style={{
            color: "#475569",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginLeft: 48,
            display: "block",
            marginTop: -2,
          }}
        >
          GESTIÓN DOCUMENTAL
        </span>
      </div>

      <nav className="flex-1 px-3 mt-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                borderRadius: 12,
                marginBottom: 4,
                fontSize: 14,
                fontWeight: 600,
                color: isActive ? "#fff" : "#94a3b8",
                background: isActive ? "rgba(79,124,255,0.15)" : "transparent",
                borderLeft: isActive ? "3px solid #4F7CFF" : "3px solid transparent",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 mb-3">
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            marginTop: 8,
            paddingTop: 8,
          }}
        >
          <Link
            href="/ajustes"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              borderRadius: 12,
              marginBottom: 4,
              fontSize: 14,
              fontWeight: 600,
              color: pathname === "/ajustes" || pathname?.startsWith("/ajustes/") ? "#fff" : "#94a3b8",
              background: pathname === "/ajustes" || pathname?.startsWith("/ajustes/") ? "rgba(79,124,255,0.15)" : "transparent",
              borderLeft: pathname === "/ajustes" || pathname?.startsWith("/ajustes/") ? "3px solid #4F7CFF" : "3px solid transparent",
              transition: "all 0.2s",
              textDecoration: "none",
            }}
          >
            <span style={{ opacity: pathname === "/ajustes" || pathname?.startsWith("/ajustes/") ? 1 : 0.7 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            Ajustes
          </Link>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 16,
          }}
        >
          <p
            style={{
              color: "#475569",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            VERSIÓN PROTOTIPO
          </p>
          <p style={{ color: "#64748b", fontSize: 11 }}>
            IA pendiente de configurar clave API
          </p>
        </div>
      </div>
    </aside>
  );
}
