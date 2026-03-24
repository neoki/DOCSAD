import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isOneDriveConnected, listSharePointSites, listDrives, listFiles } from "@/lib/microsoft-graph";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  if (searchParams.get("status") === "true") {
    const connected = await isOneDriveConnected();
    return NextResponse.json({ connected });
  }

  const connected = await isOneDriveConnected();
  if (!connected) {
    return NextResponse.json({ files: [], connected: false });
  }

  try {
    const action = searchParams.get("action");

    if (action === "sites") {
      const sites = await listSharePointSites();
      return NextResponse.json({ sites, connected: true });
    }

    if (action === "drives") {
      const siteId = searchParams.get("siteId");
      if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });
      const drives = await listDrives(siteId);
      return NextResponse.json({ drives, connected: true });
    }

    if (action === "files") {
      const driveId = searchParams.get("driveId");
      if (!driveId) return NextResponse.json({ error: "Missing driveId" }, { status: 400 });
      const folderId = searchParams.get("folderId") || undefined;
      const files = await listFiles(driveId, folderId);
      return NextResponse.json({ files, connected: true });
    }

    const sites = await listSharePointSites();
    return NextResponse.json({ sites, connected: true });
  } catch (err) {
    console.error("OneDrive/SharePoint error:", err);
    return NextResponse.json(
      { error: "Error al acceder a SharePoint. Puede ser necesario reconectar.", files: [], connected: false },
      { status: 500 }
    );
  }
}
