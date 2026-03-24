import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFileDownloadUrl } from "@/lib/microsoft-graph";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const itemId = new URL(req.url).searchParams.get("id");
  if (!itemId) return NextResponse.json({ error: "Missing file id" }, { status: 400 });

  try {
    const downloadUrl = await getFileDownloadUrl(itemId);
    return NextResponse.json({ downloadUrl });
  } catch (err) {
    console.error("Download URL error:", err);
    return NextResponse.json({ error: "Failed to get download URL" }, { status: 500 });
  }
}
