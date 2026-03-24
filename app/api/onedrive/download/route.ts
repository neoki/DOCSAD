import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFileDownloadUrl } from "@/lib/microsoft-graph";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driveId = searchParams.get("driveId");
  const itemId = searchParams.get("id");

  if (!driveId || !itemId) {
    return NextResponse.json({ error: "Missing driveId or id" }, { status: 400 });
  }

  try {
    const downloadUrl = await getFileDownloadUrl(driveId, itemId);
    return NextResponse.json({ downloadUrl });
  } catch (err) {
    console.error("Download URL error:", err);
    return NextResponse.json({ error: "Failed to get download URL" }, { status: 500 });
  }
}
