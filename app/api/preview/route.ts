import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/microsoft-graph";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driveId = searchParams.get("driveId");
  const itemId = searchParams.get("itemId");

  if (!driveId || !itemId) {
    return NextResponse.json({ error: "driveId and itemId required" }, { status: 400 });
  }

  const token = await getValidAccessToken();
  if (!token) return NextResponse.json({ error: "SharePoint not connected" }, { status: 401 });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
    {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "manual",
    }
  );

  if (res.status === 302) {
    const downloadUrl = res.headers.get("location");
    return NextResponse.json({ downloadUrl });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to get preview" }, { status: res.status });
  }

  const downloadUrl = res.url;
  return NextResponse.json({ downloadUrl });
}
