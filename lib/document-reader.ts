import { prisma } from "./prisma";
import { getValidAccessToken, getFileDownloadUrl } from "./microsoft-graph";

const SUBFOLDERS_PRIORITY: Record<string, number> = {
  "01_Actas": 10, "Actas": 10, "Acta": 9,
  "02_Presupuestos_y_Cuentas": 9, "04_Contabilidad": 9,
  "03_Contratos": 9, "Contratos": 9, "Contrato": 8, "Mantenimiento": 7,
  "05_Seguros": 9, "02_Seguros": 9,
  "05_Juridico": 8, "09_Documentacion_Legal": 8, "Documentación": 8, "Estatutos": 7,
  "06_Gobierno": 7, "07_PRL": 6,
  "04_Facturas": 5, "06_Certificados_e_Informes": 5,
};

const READABLE_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".xml", ".htm", ".html"]);
const WORD_EXTENSIONS = new Set([".docx", ".doc"]);
const EXCEL_EXTENSIONS = new Set([".xlsx", ".xls"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

function getExt(name: string): string {
  const m = name.match(/\.[a-zA-Z0-9]+$/);
  return m ? m[0].toLowerCase() : "";
}

function scoreFile(name: string, subfolder: string | null, query: string): number {
  let score = SUBFOLDERS_PRIORITY[subfolder ?? ""] ?? 0;
  const ext = getExt(name);
  if (WORD_EXTENSIONS.has(ext)) score += 5;
  else if (PDF_EXTENSIONS.has(ext)) score += 5;
  else if (READABLE_EXTENSIONS.has(ext)) score += 4;
  else if (EXCEL_EXTENSIONS.has(ext)) score += 3;
  const qwords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const nameLow = name.toLowerCase();
  for (const w of qwords) {
    if (nameLow.includes(w)) score += 3;
    if ((subfolder ?? "").toLowerCase().includes(w)) score += 2;
  }
  return score;
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function extractTextFromWordBuffer(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const nodeBuffer = Buffer.from(buffer);
  const result = await mammoth.extractRawText({ buffer: nodeBuffer });
  return result.value.trim();
}

async function extractTextFromExcelBuffer(buffer: ArrayBuffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const lines: string[] = [];
  for (const sheetName of wb.SheetNames.slice(0, 3)) {
    const ws = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
    lines.push(`[Hoja: ${sheetName}]\n${csv.slice(0, 2000)}`);
  }
  return lines.join("\n\n");
}

async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (buf: Buffer, opts?: { max?: number }) => Promise<{ text: string }>;
  const nodeBuffer = Buffer.from(buffer);
  const data = await pdfParse(nodeBuffer, { max: 5 });
  return data.text.replace(/\s+/g, " ").trim();
}

async function fetchDocumentText(
  driveId: string,
  itemId: string,
  fileName: string,
  maxChars = 3000,
): Promise<string | null> {
  try {
    const token = await getValidAccessToken();
    if (!token) return null;

    const ext = getExt(fileName);

    const downloadUrl = await getFileDownloadUrl(driveId, itemId);
    if (!downloadUrl) return null;

    const fileRes = await fetchWithTimeout(downloadUrl, 10000);
    if (!fileRes.ok) return null;
    const buffer = await fileRes.arrayBuffer();

    let text = "";

    if (READABLE_EXTENSIONS.has(ext)) {
      text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    } else if (WORD_EXTENSIONS.has(ext)) {
      text = await extractTextFromWordBuffer(buffer);
    } else if (EXCEL_EXTENSIONS.has(ext)) {
      text = await extractTextFromExcelBuffer(buffer);
    } else if (PDF_EXTENSIONS.has(ext)) {
      text = await extractTextFromPdfBuffer(buffer);
    } else {
      return null;
    }

    text = text.replace(/\s+/g, " ").trim();
    return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
  } catch {
    return null;
  }
}

async function readRelevantDocumentsImpl(
  comunidadId: string,
  userQuery: string,
  maxDocs: number,
  maxCharsPerDoc: number,
): Promise<string> {
  const files = await prisma.fileCache.findMany({
    where: {
      comunidadId,
      isFolder: false,
      sharePointItemId: { not: "" },
      driveId: { not: "" },
    },
    select: {
      name: true,
      subfolder: true,
      driveId: true,
      sharePointItemId: true,
    },
  });

  const readable = files.filter((f) => {
    const ext = getExt(f.name);
    return (
      READABLE_EXTENSIONS.has(ext) ||
      WORD_EXTENSIONS.has(ext) ||
      EXCEL_EXTENSIONS.has(ext) ||
      PDF_EXTENSIONS.has(ext)
    );
  });

  if (readable.length === 0) return "";

  const scored = readable.map((f) => ({
    ...f,
    score: scoreFile(f.name, f.subfolder, userQuery),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, maxDocs);

  const results: string[] = [];
  await Promise.allSettled(
    top.map(async (f) => {
      const text = await fetchDocumentText(f.driveId, f.sharePointItemId, f.name, maxCharsPerDoc);
      if (text && text.length > 30) {
        results.push(
          `--- ${f.subfolder ? `[${f.subfolder}] ` : ""}${f.name} ---\n${text}`,
        );
      }
    }),
  );

  return results.length > 0
    ? `=== CONTENIDO DE DOCUMENTOS ===\n${results.join("\n\n")}`
    : "";
}

export async function readRelevantDocuments(
  comunidadId: string,
  userQuery: string,
  maxDocs = 4,
  maxCharsPerDoc = 2500,
): Promise<string> {
  const GLOBAL_TIMEOUT_MS = 15000;
  try {
    return await Promise.race([
      readRelevantDocumentsImpl(comunidadId, userQuery, maxDocs, maxCharsPerDoc),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve(""), GLOBAL_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return "";
  }
}
