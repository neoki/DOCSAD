import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  isSharePointConfigured,
  getAppToken,
  listSharePointSites,
  listDrives,
  listFiles,
} from "@/lib/microsoft-graph";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const configured = isSharePointConfigured();

  if (searchParams.get("status") === "true") {
    return NextResponse.json({ connected: configured });
  }

  if (!configured) {
    return NextResponse.json({ files: [], connected: false });
  }

  // Verificar que el token de aplicación funciona realmente
  const appToken = await getAppToken();
  const connected = !!appToken;

  // Información del token de aplicación (expiry desde caché en BD)
  const appTokenExpiry = await prisma.setting.findUnique({
    where: { key: "app_token_expires_at" },
  });

  try {
    const action = searchParams.get("action");

    if (action === "sites") {
      const sites = await listSharePointSites();
      return NextResponse.json({ sites, connected, appTokenExpiry: appTokenExpiry?.value });
    }

    if (action === "drives") {
      const siteId = searchParams.get("siteId");
      if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
      const drives = await listDrives(siteId);
      return NextResponse.json({ drives, connected, appTokenExpiry: appTokenExpiry?.value });
    }

    if (action === "files") {
      const driveId = searchParams.get("driveId");
      if (!driveId) return NextResponse.json({ error: "Missing driveId" }, { status: 400 });
      const folderId = searchParams.get("folderId") || undefined;
      const files = await listFiles(driveId, folderId);
      return NextResponse.json({ files, connected, appTokenExpiry: appTokenExpiry?.value });
    }

    return NextResponse.json({ connected, appTokenExpiry: appTokenExpiry?.value });
  } catch (err) {
    console.error("SharePoint error:", err);
    return NextResponse.json(
      { error: "Error al acceder a SharePoint. Verifica los permisos de la aplicación en Azure.", files: [], connected: false },
      { status: 500 },
    );
  }
}
