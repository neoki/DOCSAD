import { Resend } from "resend";

export interface VencimientoItem {
  sharePointItemId: string;
  comunidadCodigo: string;
  comunidadNombre: string;
  fileName: string;
  label: string;
  expiresAt: Date;
  diasRestantes: number;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function urgencyColor(dias: number): string {
  if (dias < 0) return "#dc2626";
  if (dias <= 7) return "#ea580c";
  if (dias <= 30) return "#ca8a04";
  return "#16a34a";
}

function urgencyLabel(dias: number): string {
  if (dias < 0) return `VENCIDO`;
  if (dias <= 7) return "URGENTE";
  if (dias <= 30) return "PRONTO";
  return "OK";
}

function formatDiasRestantes(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)}d vencido`;
  if (dias === 0) return "Hoy";
  return `${dias}d`;
}

function buildHtmlEmail(items: VencimientoItem[], daysAhead: number): string {
  const expiredItems = items.filter((i) => i.diasRestantes < 0);
  const upcomingItems = items.filter((i) => i.diasRestantes >= 0);

  const rowsHtml = items
    .map((item) => {
      const color = urgencyColor(item.diasRestantes);
      const diasText = formatDiasRestantes(item.diasRestantes);
      const rowStyle = item.diasRestantes < 0 ? "background:#fef2f2;" : "";
      return `
      <tr style="border-bottom: 1px solid #f1f5f9; ${rowStyle}">
        <td style="padding: 10px 12px; font-size: 13px; color: #1e293b; white-space: nowrap;"><span style="font-family:monospace;color:#64748b;">${item.comunidadCodigo}</span> ${item.comunidadNombre}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #475569; max-width: 180px;">${item.fileName}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #475569; max-width: 160px; font-style: italic;">${item.label}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; color: #475569; white-space: nowrap;">${formatDate(item.expiresAt)}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; font-weight: 700; color: ${color}; text-align: right; white-space: nowrap;">${diasText}</td>
      </tr>`;
    })
    .join("");

  const summary =
    expiredItems.length > 0
      ? `<span style="color: #dc2626; font-weight: 700;">${expiredItems.length} vencido${expiredItems.length !== 1 ? "s" : ""}</span> · `
      : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resumen semanal de vencimientos — DocFincas</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 760px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%); padding: 28px 32px;">
      <div style="color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DocFincas</div>
      <div style="color: rgba(255,255,255,0.85); font-size: 15px; margin-top: 4px;">Resumen semanal de vencimientos</div>
    </div>

    <!-- Summary banner -->
    <div style="padding: 20px 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 14px; color: #475569;">
        ${summary}<strong>${upcomingItems.length} documento${upcomingItems.length !== 1 ? "s" : ""}</strong> con vencimiento en los próximos <strong>${daysAhead} días</strong>.
      </p>
    </div>

    <!-- Table -->
    <div style="padding: 24px 32px;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Comunidad</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Documento</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Etiqueta</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Vence</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Días restantes</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">
        Este mensaje se genera automáticamente cada semana desde DocFincas · Asesoría Díaz<br>
        Para gestionar alertas accede a <strong>Ajustes → Alertas por email</strong>.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildTextEmail(items: VencimientoItem[], daysAhead: number): string {
  const lines = [
    "DOCFINCAS — RESUMEN SEMANAL DE VENCIMIENTOS",
    "=".repeat(50),
    `Documentos con vencimiento en los próximos ${daysAhead} días`,
    "",
  ];

  for (const item of items) {
    const label = urgencyLabel(item.diasRestantes);
    const diasText = formatDiasRestantes(item.diasRestantes);
    lines.push(`[${label}] ${item.comunidadCodigo} — ${item.comunidadNombre}`);
    lines.push(`  Documento: ${item.label || item.fileName}`);
    lines.push(`  Vence: ${formatDate(item.expiresAt)} · Días restantes: ${diasText}`);
    lines.push("");
  }

  lines.push("Este mensaje se genera automáticamente desde DocFincas.");
  return lines.join("\n");
}

export async function sendWeeklyVencimientosEmail(
  recipients: string[],
  items: VencimientoItem[],
  daysAhead: number
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurada. Añade la clave en los secrets del servidor." };
  }

  if (recipients.length === 0) {
    return { ok: false, error: "No hay destinatarios configurados." };
  }

  if (items.length === 0) {
    return { ok: true, messageId: "no-items" };
  }

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || "DocFincas <onboarding@resend.dev>";

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: `DocFincas — ${items.length} vencimiento${items.length !== 1 ? "s" : ""} próximos`,
      html: buildHtmlEmail(items, daysAhead),
      text: buildTextEmail(items, daysAhead),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, messageId: data?.id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
