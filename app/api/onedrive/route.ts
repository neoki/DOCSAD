import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isOneDriveConnected, listFiles } from "@/lib/microsoft-graph";

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
    const folderPath = searchParams.get("path") || "/";
    const files = await listFiles(folderPath);
    return NextResponse.json({ files, connected: true });
  } catch (err) {
    console.error("OneDrive list error:", err);
    return NextResponse.json(
      { error: "Error al acceder a OneDrive. Puede ser necesario reconectar.", files: [], connected: false },
      { status: 500 }
    );
  }
}
