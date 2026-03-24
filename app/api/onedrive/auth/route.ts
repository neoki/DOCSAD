import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthUrl } from "@/lib/microsoft-graph";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("onedrive_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = getAuthUrl(state);
  return NextResponse.json({ authUrl });
}
