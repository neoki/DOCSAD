"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "./Sidebar";

const IDLE_MS = 14 * 60 * 1000;
const WARN_SECONDS = 60;

function InactivityWarning({ secondsLeft, onStay }: { secondsLeft: number; onStay: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.7)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "32px 36px",
          maxWidth: 380,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏱️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          Sesión a punto de expirar
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
          Por inactividad, la sesión se cerrará en
        </p>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: secondsLeft <= 10 ? "#dc2626" : "#4F7CFF",
            marginBottom: 24,
            fontVariantNumeric: "tabular-nums",
            transition: "color 0.3s",
          }}
        >
          {secondsLeft}s
        </div>
        <button
          onClick={onStay}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 10,
            background: "linear-gradient(135deg, #4F7CFF, #8B5CF6)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
          }}
        >
          Seguir conectado
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARN_SECONDS);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(WARN_SECONDS);

  const isLoginPage = pathname === "/login" || pathname === "/";

  const stopCountdown = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
  };

  const startCountdown = useCallback(() => {
    secondsRef.current = WARN_SECONDS;
    setSecondsLeft(WARN_SECONDS);
    setShowWarning(true);
    stopCountdown();
    countdownInterval.current = setInterval(() => {
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current);
      if (secondsRef.current <= 0) {
        stopCountdown();
        signOut({ callbackUrl: "/login" });
      }
    }, 1000);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (showWarning) return;
    idleTimer.current = setTimeout(() => {
      startCountdown();
    }, IDLE_MS);
  }, [showWarning, startCountdown]);

  const handleStay = useCallback(() => {
    setShowWarning(false);
    stopCountdown();
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      startCountdown();
    }, IDLE_MS);
  }, [startCountdown]);

  useEffect(() => {
    if (isLoginPage || status !== "authenticated") return;

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const handler = () => {
      if (!showWarning) resetIdleTimer();
    };

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      stopCountdown();
    };
  }, [isLoginPage, status, showWarning, resetIdleTimer]);

  useEffect(() => {
    if (status === "unauthenticated" && !isLoginPage) {
      router.push("/login");
    }
  }, [status, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>Cargando...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {showWarning && <InactivityWarning secondsLeft={secondsLeft} onStay={handleStay} />}
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "28px 36px", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
