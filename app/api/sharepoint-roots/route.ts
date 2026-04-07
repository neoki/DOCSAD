import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRootsStatus, rediscoverRoots } from "@/lib/sharepoint-roots";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void req;
  try {
    const status = await getRootsStatus();
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void req;
  try {
    const roots = await rediscoverRoots();
    return NextResponse.json(roots);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
