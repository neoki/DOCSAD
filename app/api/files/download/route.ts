import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFileDownloadUrl } from "@/lib/microsoft-graph";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driveId = searchParams.get("driveId");
  const itemId = searchParams.get("itemId");

  if (!driveId || !itemId) {
    return NextResponse.json({ error: "Missing driveId or itemId" }, { status: 400 });
  }

  try {
    const url = await getFileDownloadUrl(driveId, itemId);
    if (!url) return NextResponse.json({ error: "No download URL" }, { status: 404 });
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
