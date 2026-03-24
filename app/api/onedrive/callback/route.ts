import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForTokens, storeTokens } from "@/lib/microsoft-graph";
import { cookies } from "next/headers";

function getBaseUrl() {
  if (process.env.REPLIT_DEPLOYMENT_URL) return process.env.REPLIT_DEPLOYMENT_URL;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return process.env.NEXTAUTH_URL || "http://localhost:5000";
}

export async function GET(req: NextRequest) {
  const base = getBaseUrl();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(`${base}/login`);
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
    return NextResponse.redirect(`${base}/onedrive?error=state_mismatch`);
  }

  if (error) {
    const desc = searchParams.get("error_description") || error;
    console.error("OAuth error:", desc);
    return NextResponse.redirect(`${base}/onedrive?error=auth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${base}/onedrive?error=no_code`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    return NextResponse.redirect(`${base}/onedrive?connected=true`);
  } catch (err) {
    console.error("Token exchange error:", err);
    return NextResponse.redirect(`${base}/onedrive?error=token_failed`);
  }
}
