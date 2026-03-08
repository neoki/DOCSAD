"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login" || pathname === "/";

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
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "28px 36px", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
