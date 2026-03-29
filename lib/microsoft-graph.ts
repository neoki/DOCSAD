import { prisma } from "./prisma";

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const TENANT_ID = process.env.MICROSOFT_TENANT_ID!;
const SCOPES = "Files.ReadWrite.All Sites.Read.All User.Read offline_access";

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
  size: number;
  modified: string;
  type: string;
  downloadUrl?: string;
  webUrl?: string;
  lastModified?: string;
  mimeType?: string;
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
    const sizeNum = (item.size as number) || 0;
    const file = item.file as Record<string, unknown> | undefined;

    return {
      id: item.id as string,
      name: item.name as string,
      size: sizeNum,
      modified: lastModified,
      lastModified: item.lastModifiedDateTime as string | undefined,
      type: isFolder ? "folder" : getFileExtension(item.name as string),
      downloadUrl: (item as Record<string, unknown>)["@microsoft.graph.downloadUrl"] as string | undefined,
      webUrl: item.webUrl as string | undefined,
      mimeType: file?.mimeType as string | undefined,
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

export const STANDARD_SUBFOLDERS = [
  "01_Actas",
  "02_Presupuestos_y_Cuentas",
  "03_Contratos",
  "04_Facturas",
  "05_Seguros",
  "06_Certificados_e_Informes",
  "07_Recibos",
  "08_Correspondencia",
  "09_Documentacion_Legal",
  "10_Mantenimiento",
  "11_Otros",
];

async function graphPost(path: string, accessToken: string, body: unknown) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API POST error: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function createFolder(driveId: string, parentId: string | null, name: string) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const parent = parentId ? `items/${parentId}` : "root";
  return graphPost(`/drives/${driveId}/${parent}/children`, accessToken, {
    name,
    folder: {},
    "@microsoft.graph.conflictBehavior": "fail",
  });
}

export async function createCommunityFolderStructure(
  driveId: string,
  folderName: string,
  parentId?: string,
) {
  const mainFolder = await createFolder(driveId, parentId || null, folderName);

  const results: { name: string; id: string; error?: string }[] = [];
  for (const sub of STANDARD_SUBFOLDERS) {
    try {
      const f = await createFolder(driveId, mainFolder.id, sub);
      results.push({ name: sub, id: f.id });
    } catch (err) {
      results.push({ name: sub, id: "", error: String(err) });
    }
  }

  return { mainFolder, subfolders: results };
}

export async function normalizeSubfolders(driveId: string, folderId: string) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const existing = await listFiles(driveId, folderId);
  const existingNames = new Set(existing.filter((f) => f.isFolder).map((f) => f.name));

  const created: string[] = [];
  for (const sub of STANDARD_SUBFOLDERS) {
    if (!existingNames.has(sub)) {
      try {
        await createFolder(driveId, folderId, sub);
        created.push(sub);
      } catch {
        // skip if conflict
      }
    }
  }
  return created;
}

export async function searchDriveForFolder(driveId: string, searchQuery: string) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const data = await graphGet(
    `/drives/${driveId}/root/search(q='${encodeURIComponent(searchQuery)}')?$filter=folder ne null&$top=20&$select=id,name,folder,parentReference`,
    accessToken,
  );
  return (data.value || [])
    .filter((item: Record<string, unknown>) => !!(item.folder))
    .map((item: Record<string, unknown>) => ({
      id: item.id as string,
      name: item.name as string,
    }));
}

export async function isDescendantFolder(
  driveId: string,
  folderId: string,
  ancestorFolderId: string,
): Promise<boolean> {
  if (folderId === ancestorFolderId) return true;

  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  let currentId = folderId;
  const visited = new Set<string>();

  while (currentId && currentId !== ancestorFolderId) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${currentId}?$select=id,parentReference`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) return false;

      const item = await res.json();
      const parentId = item.parentReference?.id;
      if (!parentId) return false;
      if (parentId === ancestorFolderId) return true;
      currentId = parentId;
    } catch {
      return false;
    }
  }

  return currentId === ancestorFolderId;
}

export async function uploadFileToFolder(
  driveId: string,
  folderId: string,
  fileName: string,
  content: ArrayBuffer,
) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}:/${encodeURIComponent(fileName)}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload error: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function listAllFilesRecursive(
  driveId: string,
  folderId: string,
  maxItems: number = 5000,
): Promise<{ id: string; name: string; path: string; size: number; isFolder: boolean }[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const results: { id: string; name: string; path: string; size: number; isFolder: boolean }[] = [];

  async function fetchChildren(parentId: string, parentPath: string) {
    if (results.length >= maxItems) return;

    let url: string | null = `/drives/${driveId}/items/${parentId}/children?$top=200&$select=id,name,size,folder,parentReference`;

    while (url && results.length < maxItems) {
      const data = await graphGet(url, accessToken!);

      for (const item of data.value || []) {
        const isFolder = !!item.folder;
        const itemPath = parentPath ? `${parentPath}/${item.name}` : item.name;

        results.push({
          id: item.id,
          name: item.name,
          path: itemPath,
          size: item.size || 0,
          isFolder,
        });

        if (isFolder && results.length < maxItems) {
          await fetchChildren(item.id, itemPath);
        }
      }

      url = data["@odata.nextLink"]
        ? data["@odata.nextLink"].replace("https://graph.microsoft.com/v1.0", "")
        : null;
    }
  }

  await fetchChildren(folderId, "");
  return results;
}

export async function moveFile(
  driveId: string,
  itemId: string,
  destinationFolderId: string,
  newName?: string,
): Promise<{ id: string; name: string; webUrl: string }> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const body: Record<string, unknown> = {
    parentReference: { driveId, id: destinationFolderId },
  };
  if (newName) body.name = newName;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Move error: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function getOrCreateSubfolder(
  driveId: string,
  parentFolderId: string,
  subfolderName: string,
): Promise<string> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Not connected");

  const children = await graphGet(
    `/drives/${driveId}/items/${parentFolderId}/children?$filter=folder ne null&$select=id,name`,
    accessToken,
  );

  const existing = (children.value || []).find(
    (item: Record<string, unknown>) => item.name === subfolderName,
  );
  if (existing) return existing.id as string;

  const created = await graphPost(
    `/drives/${driveId}/items/${parentFolderId}/children`,
    accessToken,
    {
      name: subfolderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    },
  );
  return created.id;
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
