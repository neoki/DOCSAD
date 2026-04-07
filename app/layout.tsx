import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { unstable_after as after } from "next/server";
import { maybeAutoSync } from "@/lib/auto-sync";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "DocFincas",
  description: "Gestión documental de comunidades de propietarios",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  after(maybeAutoSync);

  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
