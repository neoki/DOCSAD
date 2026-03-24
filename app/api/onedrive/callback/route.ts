import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens, storeTokens } from "@/lib/microsoft-graph";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const returnedState = searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("onedrive_oauth_state")?.value;
  cookieStore.delete("onedrive_oauth_state");

  if (!savedState || !returnedState || savedState !== returnedState) {
    console.error("OAuth state mismatch — possible CSRF");
    return NextResponse.redirect(new URL("/onedrive?error=state_mismatch", req.url));
  }

  if (error) {
    const desc = searchParams.get("error_description") || error;
    console.error("OAuth error:", desc);
    return NextResponse.redirect(new URL("/onedrive?error=auth_failed", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/onedrive?error=no_code", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    return NextResponse.redirect(new URL("/onedrive?connected=true", req.url));
  } catch (err) {
    console.error("Token exchange error:", err);
    return NextResponse.redirect(new URL("/onedrive?error=token_failed", req.url));
  }
}
