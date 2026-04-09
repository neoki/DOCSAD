import { prisma } from "./prisma";
import { DOC_TYPES, CATEGORIAS } from "./doctypes";
import { readRelevantDocuments } from "./document-reader";

export type AiConfig = {
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  deploymentName?: string;
  apiVersion?: string;
};

type ProviderEntry = {
  apiKey?: string;
  model?: string;
  active?: boolean;
  endpoint?: string;
  deploymentName?: string;
  apiVersion?: string;
};

type AiConfigData = {
  providers?: Record<string, ProviderEntry>;
};

export async function getActiveAiConfig(): Promise<AiConfig | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "ai_config" } });
  if (!setting) return null;

  let config: AiConfigData;
  try {
    config = JSON.parse(setting.value) as AiConfigData;
  } catch {
    return null;
  }

  const providers = config.providers;
  if (!providers) return null;

  for (const [id, cfg] of Object.entries(providers)) {
    const hasModel = id === "azure_openai"
      ? !!(cfg.apiKey && cfg.endpoint && cfg.deploymentName)
      : !!(cfg.apiKey && cfg.model);
    if (cfg.active && hasModel) {
      return {
        provider: id,
        model: cfg.model ?? "",
        apiKey: cfg.apiKey!,
        endpoint: cfg.endpoint,
        deploymentName: cfg.deploymentName,
        apiVersion: cfg.apiVersion,
      };
    }
  }
  return null;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CHAR_BUDGET = 40000;

function truncate(sections: string[][], budget: number): string {
  let total = 0;
  const kept: string[] = [];
  for (const section of sections) {
    const joined = section.join("\n");
    if (total + joined.length <= budget) {
      kept.push(joined);
      total += joined.length;
    } else {
      const remaining = budget - total;
      if (remaining > 80) {
        kept.push(joined.slice(0, remaining) + "\n[...truncado por límite de contexto]");
      }
      break;
    }
  }
  return kept.join("\n\n");
}

export async function buildSystemContext(lastUserMessage: string): Promise<string> {
  const header = [
    `Eres el asistente de DocFincas, un sistema de gestión documental para comunidades de propietarios gestionadas por Asesoría Díaz.`,
    `Tienes acceso a los metadatos del sistema (nombres de archivos, subcarpetas, fechas, checklists, vencimientos y notas) y también al CONTENIDO REAL de los documentos Word y Excel de SharePoint cuando se menciona una comunidad concreta.`,
    `Cuando se incluya contenido de documentos en el contexto, úsalo para dar respuestas detalladas y precisas sobre lo que dicen esos documentos.`,
    `Responde siempre en español, de forma concisa y útil. Hoy es ${fmtDate(new Date())}.`,
  ];

  const [comunidades, expiriesRaw, recentFiles] = await Promise.all([
    prisma.comunidad.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        sharePointFolderId: true,
        checklists: { select: { docTypeId: true, estado: true } },
        _count: { select: { fileCache: true, notas: true } },
      },
      orderBy: { codigo: "asc" },
    }),
    prisma.documentExpiry.findMany({
      where: {
        expiresAt: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: { comunidad: { select: { codigo: true, nombre: true } } },
      orderBy: { expiresAt: "asc" },
      take: 50,
    }),
    prisma.fileCache.findMany({
      where: { isFolder: false },
      select: { name: true, comunidadId: true, subfolder: true, sharePointModified: true },
      orderBy: { sharePointModified: "desc" },
      take: 80,
    }),
  ]);

  const comunidadSummary: string[] = [
    "=== LISTADO DE COMUNIDADES ===",
    "código | nombre | SP | archivos | notas | completitud",
  ];

  const catIds = Object.keys(CATEGORIAS);

  for (const c of comunidades) {
    const total = c.checklists.length;
    const completados = c.checklists.filter((ch) => ch.estado === "COMPLETADO").length;
    const noAplica = c.checklists.filter((ch) => ch.estado === "NO_APLICA").length;
    const aplicables = total - noAplica;
    const pct = aplicables > 0 ? Math.round((completados / aplicables) * 100) : 0;
    const spStatus = c.sharePointFolderId ? "SP✓" : "sin_SP";

    const catSummary = catIds.map((catId) => {
      const relevant = DOC_TYPES.filter((dt) => dt.categoria === catId).map((dt) => dt.id);
      const catItems = c.checklists.filter((ch) => relevant.includes(ch.docTypeId));
      const catComp = catItems.filter((ch) => ch.estado === "COMPLETADO").length;
      const catNA = catItems.filter((ch) => ch.estado === "NO_APLICA").length;
      const catApl = catItems.length - catNA;
      return `${CATEGORIAS[catId].label}:${catComp}/${catApl}`;
    }).join(" ");

    comunidadSummary.push(
      `${c.codigo} | ${c.nombre} | ${spStatus} | ${c._count.fileCache} arch | ${c._count.notas} notas | ${pct}% [${catSummary}]`
    );
  }

  const expiriesSection: string[] = [];
  if (expiriesRaw.length > 0) {
    expiriesSection.push("=== VENCIMIENTOS PRÓXIMOS (30 días) ===");
    for (const e of expiriesRaw) {
      expiriesSection.push(
        `${e.comunidad.codigo} (${e.comunidad.nombre}) — ${e.fileName} — ${e.label} — vence: ${fmtDate(e.expiresAt)}`
      );
    }
  }

  const recentSection: string[] = ["=== ARCHIVOS RECIENTES EN EL SISTEMA (últimos 80) ==="];
  const comMap = new Map(comunidades.map((c) => [c.id, `${c.codigo} ${c.nombre}`]));
  for (const f of recentFiles) {
    const comLabel = f.comunidadId ? comMap.get(f.comunidadId) ?? "?" : "sin comunidad";
    recentSection.push(
      `[${comLabel}] ${f.subfolder ?? "raiz"} / ${f.name} (${fmtDate(f.sharePointModified)})`
    );
  }

  const detectedComunidad = await detectComunidad(lastUserMessage, comunidades);
  const detailSection: string[] = [];
  const docContentSection: string[] = [];
  if (detectedComunidad) {
    detailSection.push(`=== DETALLE COMUNIDAD: ${detectedComunidad.codigo} — ${detectedComunidad.nombre} ===`);
    const [detail, docContent] = await Promise.all([
      buildComunidadDetail(detectedComunidad.id, detectedComunidad.checklists),
      readRelevantDocuments(detectedComunidad.id, lastUserMessage),
    ]);
    detailSection.push(detail);
    if (docContent) docContentSection.push(docContent);
  }

  const sections: string[][] = [
    header,
    comunidadSummary,
    expiriesSection.length > 1 ? expiriesSection : [],
    recentSection,
    detailSection.length > 1 ? detailSection : [],
    docContentSection.length > 0 ? docContentSection : [],
  ].filter((s) => s.length > 0);

  return truncate(sections, CHAR_BUDGET);
}

async function detectComunidad(
  text: string,
  comunidades: { id: string; codigo: string; nombre: string; checklists: { docTypeId: string; estado: string }[] }[]
): Promise<{ id: string; codigo: string; nombre: string; checklists: { docTypeId: string; estado: string }[] } | null> {
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
      .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
      .replace(/[úùü]/g, "u").replace(/ñ/g, "n");

  const normalizedText = norm(text);

  const codeMatch = text.match(/\b(\d{3,6})\b/);
  if (codeMatch) {
    const code = codeMatch[1].padStart(6, "0");
    const found = comunidades.find((c) => c.codigo === code);
    if (found) return found;
  }

  for (const c of comunidades) {
    const words = norm(c.nombre).split(/\s+/).filter((w) => w.length > 3);
    const matchCount = words.filter((w) => normalizedText.includes(w)).length;
    if (matchCount >= 2 || (words.length === 1 && matchCount === 1)) {
      return c;
    }
  }
  return null;
}

async function buildComunidadDetail(
  comunidadId: string,
  checklistItems: { docTypeId: string; estado: string }[]
): Promise<string> {
  const [files, notas, expiries, syncLogs, operativa] = await Promise.all([
    prisma.fileCache.findMany({
      where: { comunidadId, isFolder: false },
      select: { name: true, subfolder: true, sharePointModified: true },
      orderBy: { sharePointModified: "desc" },
      take: 60,
    }),
    prisma.nota.findMany({
      where: { comunidadId },
      select: { texto: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.documentExpiry.findMany({
      where: { comunidadId },
      select: { fileName: true, label: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.syncLog.findMany({
      where: { comunidadId, status: { not: "success" } },
      select: { operation: true, status: true, fileName: true, details: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.operativa.findUnique({ where: { comunidadId } }),
  ]);

  const lines: string[] = [];

  if (files.length > 0) {
    lines.push(`Archivos (${files.length} recientes):`);
    for (const f of files) {
      lines.push(`  [${f.subfolder ?? "raiz"}] ${f.name} — ${fmtDate(f.sharePointModified ?? null)}`);
    }
  }

  if (notas.length > 0) {
    lines.push(`Notas (${notas.length}):`);
    for (const n of notas) {
      lines.push(`  ${fmtDate(n.createdAt)}: ${n.texto.slice(0, 200)}`);
    }
  }

  if (checklistItems.length > 0) {
    const catIds = Object.keys(CATEGORIAS);
    lines.push("Checklist por categoría:");
    for (const catId of catIds) {
      const relevant = DOC_TYPES.filter((dt) => dt.categoria === catId).map((dt) => dt.id);
      const catItems = checklistItems.filter((ch) => relevant.includes(ch.docTypeId));
      const comp = catItems.filter((ch) => ch.estado === "COMPLETADO").length;
      const pend = catItems.filter((ch) => ch.estado === "PENDIENTE").length;
      const na = catItems.filter((ch) => ch.estado === "NO_APLICA").length;
      lines.push(`  ${CATEGORIAS[catId].label}: ${comp} completados, ${pend} pendientes, ${na} no aplica`);
    }
    const pendingTypes = checklistItems
      .filter((ch) => ch.estado === "PENDIENTE")
      .map((ch) => DOC_TYPES.find((dt) => dt.id === ch.docTypeId)?.label ?? ch.docTypeId)
      .slice(0, 15);
    if (pendingTypes.length > 0) {
      lines.push(`  Pendientes: ${pendingTypes.join(", ")}`);
    }
  }

  if (expiries.length > 0) {
    lines.push("Vencimientos registrados:");
    for (const e of expiries) {
      lines.push(`  ${e.label} — ${e.fileName} — vence: ${fmtDate(e.expiresAt)}`);
    }
  }

  if (syncLogs.length > 0) {
    lines.push(`Historial sync (errores/avisos recientes):`);
    for (const s of syncLogs) {
      lines.push(`  ${fmtDate(s.createdAt)} ${s.status} ${s.operation} ${s.fileName ?? ""} ${s.details ?? ""}`.trim());
    }
  }

  if (operativa) {
    const tags: string[] = [];
    if (operativa.usaAgreGasfincas) tags.push("GESFINCAS");
    if (operativa.somosCorredorSeguro) tags.push(`Corredor: ${operativa.corredorSeguroNombre ?? "propio"}`);
    if (operativa.tieneVideovigilancia) tags.push("Videovigilancia");
    if (operativa.obligadaITE) tags.push(`ITE: ${fmtDate(operativa.fechaProximaITE)}`);
    if (operativa.tienePortero || operativa.tieneConserje) tags.push("Personal en edificio");
    if (operativa.gestionaConsumos) tags.push(`Consumos: ${operativa.empresaGestionConsumos ?? "sí"}`);
    if (tags.length > 0) lines.push(`Operativa: ${tags.join(", ")}`);
  }

  return lines.join("\n");
}
