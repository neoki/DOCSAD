import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEMO_FILES = [
  { id: "1", name: "estatutos_magnolias_2024.pdf", size: "2.4 MB", modified: "15/03/2024", type: "pdf" },
  { id: "2", name: "acta_junta_torre_blanca.pdf", size: "1.8 MB", modified: "01/04/2024", type: "pdf" },
  { id: "3", name: "poliza_seguro_rosal.pdf", size: "0.9 MB", modified: "10/02/2024", type: "pdf" },
  { id: "4", name: "presupuesto_norte_2024.xlsx", size: "0.5 MB", modified: "20/01/2024", type: "xlsx" },
  { id: "5", name: "contrato_limpieza_pinos.pdf", size: "0.3 MB", modified: "05/03/2024", type: "pdf" },
  { id: "6", name: "certificado_ite_magnolias.pdf", size: "1.2 MB", modified: "22/02/2024", type: "pdf" },
  { id: "7", name: "nombramiento_presidente_torre.pdf", size: "0.4 MB", modified: "15/01/2024", type: "pdf" },
  { id: "8", name: "extracto_bancario_rosal.pdf", size: "0.2 MB", modified: "28/02/2024", type: "pdf" },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  if (searchParams.get("status") === "true") {
    const connected = !!process.env.MICROSOFT_CLIENT_ID;
    return NextResponse.json({ connected });
  }

  // TODO: When connected to Microsoft Graph API, replace demo files with real data:
  // 1. Use MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID to get an access token
  //    via OAuth2 client credentials flow: POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
  // 2. Call Microsoft Graph API to list files:
  //    GET https://graph.microsoft.com/v1.0/me/drive/root:/{ONEDRIVE_FOLDER_PATH}:/children
  //    Headers: Authorization: Bearer {access_token}
  // 3. Map the response to the same shape as DEMO_FILES
  // 4. For downloading a file for import:
  //    GET https://graph.microsoft.com/v1.0/me/drive/items/{item-id}/content

  return NextResponse.json({ files: DEMO_FILES, demo: true });
}
