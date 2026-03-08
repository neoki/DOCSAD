"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email o contraseña incorrectos");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #2563eb 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              borderRadius: 20,
              marginBottom: 20,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "linear-gradient(135deg, #fff 0%, #e2e8f0 100%)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
                padding: 7,
              }}
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#4F7CFF",
                    borderRadius: 1.5,
                    opacity: [0.7, 0.85, 0.9, 0.75, 1, 0.8, 0.95, 0.7, 0.85][i],
                  }}
                />
              ))}
            </div>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            DocFincas
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>
            Gestión documental de comunidades
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 28 }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@asesoriadiaz.com"
                className="input-field"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#dc2626",
                  fontSize: 14,
                  marginBottom: 20,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", padding: "14px 20px", fontSize: 15 }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
            Asesoría Díaz · Sistema interno de gestión
          </p>
        </div>
      </div>
    </div>
  );
}
