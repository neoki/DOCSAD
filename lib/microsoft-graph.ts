import { prisma } from "./prisma";

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID!;
const SCOPES = "Files.Read.All Sites.Read.All User.Read offline_access";

export function getRedirectUri() {
  const base =
    process.env.REPLIT_DEPLOYMENT_URL ||
    (process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.NEXTAUTH_URL || "http://localhost:5000");
  return `${base}/api/onedrive/callback`;
}

export function getAuthUrl(state: string) {
  const redirectUri = getRedirectUri();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_mode: "query",
    state,
  });
  return `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const redirectUri = getRedirectUri();
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    scope: SCOPES,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: SCOPES,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function storeTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const entries = [
    { key: "onedrive_access_token", value: accessToken },
    { key: "onedrive_refresh_token", value: refreshToken },
    { key: "onedrive_token_expires_at", value: expiresAt },
  ];

  for (const entry of entries) {
    await prisma.setting.upsert({
      where: { key: entry.key },
      create: { key: entry.key, value: entry.value },
      update: { value: entry.value },
    });
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["onedrive_access_token", "onedrive_refresh_token", "onedrive_token_expires_at"],
      },
    },
  });

  const tokenMap: Record<string, string> = {};
  for (const s of settings) {
    tokenMap[s.key] = s.value;
  }

  const accessToken = tokenMap["onedrive_access_token"];
  const refreshToken = tokenMap["onedrive_refresh_token"];
  const expiresAt = tokenMap["onedrive_token_expires_at"];

  if (!accessToken || !refreshToken) return null;

  if (expiresAt && new Date(expiresAt) > new Date(Date.now() + 60000)) {
    return accessToken;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function isOneDriveConnected(): Promise<boolean> {
  const token = await prisma.setting.findUnique({
    where: { key: "onedrive_refresh_token" },
  });
  return !!token?.value;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileExtension(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext;
}

export interface OneDriveFile {
  id: string;
  name: string;
  size: string;
  modified: string;
  type: string;
  downloadUrl?: string;
  isFolder: boolean;
  driveId?: string;
}

export interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
}

export interface SharePointDrive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
}

async function graphGet(path: string, accessToken: string) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function listSharePointSites(): Promise<SharePointSite[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const data = await graphGet("/sites?search=*&$top=100&$select=id,name,displayName,webUrl", accessToken);
  return (data.value || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: (s.displayName || s.name || "Sin nombre") as string,
    webUrl: s.webUrl as string,
  }));
}

export async function listDrives(siteId: string): Promise<SharePointDrive[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const data = await graphGet(`/sites/${siteId}/drives?$select=id,name,driveType,webUrl`, accessToken);
  return (data.value || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: (d.name || "Sin nombre") as string,
    driveType: (d.driveType || "") as string,
    webUrl: (d.webUrl || "") as string,
  }));
}

export async function listFiles(driveId: string, folderId?: string): Promise<OneDriveFile[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const parentRef = folderId && folderId !== "root" ? `items/${folderId}` : "root";
  const url = `/drives/${driveId}/${parentRef}/children?$top=200&$orderby=name`;

  const data = await graphGet(url, accessToken);
  const items: OneDriveFile[] = (data.value || []).map((item: Record<string, unknown>) => {
    const lastModified = item.lastModifiedDateTime
      ? new Date(item.lastModifiedDateTime as string).toLocaleDateString("es-ES")
      : "";
    const isFolder = !!(item.folder);
    const size = item.size ? formatFileSize(item.size as number) : "";

    return {
      id: item.id as string,
      name: item.name as string,
      size,
      modified: lastModified,
      type: isFolder ? "folder" : getFileExtension(item.name as string),
      downloadUrl: (item as Record<string, unknown>)["@microsoft.graph.downloadUrl"] as string | undefined,
      isFolder,
      driveId,
    };
  });

  return items;
}

export async function getFileDownloadUrl(driveId: string, itemId: string): Promise<string> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const data = await graphGet(
    `/drives/${driveId}/items/${itemId}?select=id,@microsoft.graph.downloadUrl`,
    accessToken,
  );
  return data["@microsoft.graph.downloadUrl"];
}

export async function disconnectOneDrive() {
  await prisma.setting.deleteMany({
    where: {
      key: {
        in: ["onedrive_access_token", "onedrive_refresh_token", "onedrive_token_expires_at"],
      },
    },
  });
}
