import { prisma } from "./prisma";

export type AiConfig = {
  provider: string;
  model: string;
  apiKey: string;
};

export async function getActiveAiConfig(): Promise<AiConfig | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "ai_config" } });
  if (!setting) return null;

  let config: Record<string, { apiKey?: string; model?: string; active?: boolean }>;
  try {
    config = JSON.parse(setting.value);
  } catch {
    return null;
  }

  if (!config.providers) return null;

  for (const [id, cfg] of Object.entries(config.providers)) {
    if (cfg.active && cfg.apiKey && cfg.model) {
      return { provider: id, model: cfg.model, apiKey: cfg.apiKey };
    }
  }
  return null;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function buildSystemContext(lastUserMessage: string): Promise<string> {
  const parts: string[] = [];

  parts.push(
    `Eres el asistente de DocFincas, un sistema de gestión documental para comunidades de propietarios gestionadas por Asesoría Díaz.`,
    `Tienes acceso a los metadatos actualizados del sistema (nombres de archivos, subcarpetas, fechas, checklists, vencimientos y notas).`,
    `NO tienes acceso al contenido interno de los PDFs. Responde siempre en español, de forma concisa y útil.`,
    `Hoy es ${fmtDate(new Date())}.`,
    ``
  );

  const [comunidades, expiriesRaw] = await Promise.all([
    prisma.comunidad.findMany({
      select: {
        id: true,
        codigo: true,
        nombre: true,
        sharePointFolderId: true,
        checklists: { select: { estado: true } },
        _count: { select: { fileCache: true } },
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
  ]);

  parts.push("=== LISTADO DE COMUNIDADES ===");
  parts.push("código | nombre | carpeta_SP | archivos | completitud_checklist");
  for (const c of comunidades) {
    const total = c.checklists.length;
    const completados = c.checklists.filter((ch) => ch.estado === "COMPLETADO").length;
    const noAplica = c.checklists.filter((ch) => ch.estado === "NO_APLICA").length;
    const aplicables = total - noAplica;
    const pct = aplicables > 0 ? Math.round((completados / aplicables) * 100) : 0;
    const spStatus = c.sharePointFolderId ? "vinculada" : "sin_SP";
    parts.push(`${c.codigo} | ${c.nombre} | ${spStatus} | ${c._count.fileCache} archivos | ${pct}% completitud`);
  }
  parts.push("");

  if (expiriesRaw.length > 0) {
    parts.push("=== VENCIMIENTOS PRÓXIMOS (30 días) ===");
    for (const e of expiriesRaw) {
      parts.push(`${e.comunidad.codigo} (${e.comunidad.nombre}) — ${e.fileName} — ${e.label} — vence: ${fmtDate(e.expiresAt)}`);
    }
    parts.push("");
  }

  const detectedComunidad = await detectComunidad(lastUserMessage, comunidades);
  if (detectedComunidad) {
    const detail = await buildComunidadDetail(detectedComunidad.id, detectedComunidad.nombre);
    parts.push(`=== DETALLE COMUNIDAD: ${detectedComunidad.codigo} — ${detectedComunidad.nombre} ===`);
    parts.push(detail);
    parts.push("");
  }

  return parts.join("\n");
}

async function detectComunidad(
  text: string,
  comunidades: { id: string; codigo: string; nombre: string }[]
): Promise<{ id: string; codigo: string; nombre: string } | null> {
  const normalized = text.toLowerCase().replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");

  const codeMatch = text.match(/\b(\d{3,6})\b/);
  if (codeMatch) {
    const code = codeMatch[1].padStart(6, "0");
    const found = comunidades.find((c) => c.codigo === code);
    if (found) return found;
  }

  for (const c of comunidades) {
    const normNombre = c.nombre.toLowerCase()
      .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
      .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u").replace(/ñ/g, "n");
    const words = normNombre.split(/\s+/).filter((w) => w.length > 3);
    const matchCount = words.filter((w) => normalized.includes(w)).length;
    if (matchCount >= 2 || (words.length === 1 && matchCount === 1)) {
      return c;
    }
  }
  return null;
}

async function buildComunidadDetail(comunidadId: string, nombre: string): Promise<string> {
  const [files, notas, checklists, expiries, operativa] = await Promise.all([
    prisma.fileCache.findMany({
      where: { comunidadId, isFolder: false },
      select: { name: true, subfolder: true, sharePointModified: true, sizeBytes: true },
      orderBy: { sharePointModified: "desc" },
      take: 60,
    }),
    prisma.nota.findMany({
      where: { comunidadId },
      select: { texto: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.checklist.findMany({
      where: { comunidadId },
      select: { docTypeId: true, estado: true, fecha: true },
    }),
    prisma.documentExpiry.findMany({
      where: { comunidadId },
      select: { fileName: true, label: true, expiresAt: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.operativa.findUnique({ where: { comunidadId } }),
  ]);

  const lines: string[] = [];

  if (files.length > 0) {
    lines.push(`Archivos recientes (${files.length}):`);
    for (const f of files) {
      lines.push(`  [${f.subfolder || "raiz"}] ${f.name} — ${fmtDate(f.sharePointModified || null)}`);
    }
  }

  if (notas.length > 0) {
    lines.push(`Notas internas (${notas.length}):`);
    for (const n of notas) {
      lines.push(`  ${fmtDate(n.createdAt)}: ${n.texto.slice(0, 200)}`);
    }
  }

  if (checklists.length > 0) {
    const completados = checklists.filter((c) => c.estado === "COMPLETADO").length;
    const pendientes = checklists.filter((c) => c.estado === "PENDIENTE").length;
    const noAplica = checklists.filter((c) => c.estado === "NO_APLICA").length;
    lines.push(`Checklist: ${completados} completados, ${pendientes} pendientes, ${noAplica} no aplica`);
  }

  if (expiries.length > 0) {
    lines.push(`Vencimientos registrados:`);
    for (const e of expiries) {
      lines.push(`  ${e.label} — ${e.fileName} — vence: ${fmtDate(e.expiresAt)}`);
    }
  }

  if (operativa) {
    const tags: string[] = [];
    if (operativa.usaAgreGasfincas) tags.push("GESFINCAS");
    if (operativa.somosCorredorSeguro) tags.push("Corredor propio");
    if (operativa.tieneVideovigilancia) tags.push("Videovigilancia");
    if (operativa.obligadaITE) tags.push(`ITE próxima: ${fmtDate(operativa.fechaProximaITE)}`);
    if (operativa.tienePortero || operativa.tieneConserje) tags.push("Con personal");
    if (tags.length > 0) lines.push(`Operativa: ${tags.join(", ")}`);
  }

  return lines.join("\n");
}
