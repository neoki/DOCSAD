import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWeeklyVencimientosEmail, VencimientoItem } from "@/lib/email";

const CONFIG_KEY = "email_alerts_config";
const LAST_SENT_KEY = "email_alerts_last_sent";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface AlertConfig {
  recipients: string[];
  daysAhead: number;
}

async function getAlertConfig(): Promise<AlertConfig> {
  const setting = await prisma.setting.findUnique({ where: { key: CONFIG_KEY } });
  if (!setting) return { recipients: [], daysAhead: 30 };
  try {
    return JSON.parse(setting.value) as AlertConfig;
  } catch {
    return { recipients: [], daysAhead: 30 };
  }
}

async function getLastSent(): Promise<Date | null> {
  const setting = await prisma.setting.findUnique({ where: { key: LAST_SENT_KEY } });
  if (!setting) return null;
  const d = new Date(setting.value);
  return isNaN(d.getTime()) ? null : d;
}

async function setLastSent(date: Date): Promise<void> {
  await prisma.setting.upsert({
    where: { key: LAST_SENT_KEY },
    update: { value: date.toISOString() },
    create: { key: LAST_SENT_KEY, value: date.toISOString() },
  });
}

async function buildVencimientoItems(daysAhead: number): Promise<VencimientoItem[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  const expiries = await prisma.documentExpiry.findMany({
    where: { expiresAt: { lte: cutoff } },
    include: { comunidad: { select: { codigo: true, nombre: true } } },
    orderBy: { expiresAt: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiries.map((e) => {
    const expDate = new Date(e.expiresAt);
    expDate.setHours(0, 0, 0, 0);
    const diasRestantes = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      comunidadCodigo: e.comunidad.codigo,
      comunidadNombre: e.comunidad.nombre,
      fileName: e.fileName,
      label: e.label,
      expiresAt: e.expiresAt,
      diasRestantes,
    };
  });
}

async function markNotificado(items: VencimientoItem[]): Promise<void> {
  if (items.length === 0) return;
  const codes = new Set(items.map((i) => i.comunidadCodigo));
  await prisma.documentExpiry.updateMany({
    where: {
      comunidad: { codigo: { in: Array.from(codes) } },
      notificado: false,
    },
    data: { notificado: true },
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = req.nextUrl.searchParams.get("check");

  try {
    const config = await getAlertConfig();
    const lastSent = await getLastSent();

    if (check === "true") {
      if (!lastSent || Date.now() - lastSent.getTime() >= SEVEN_DAYS_MS) {
        if (config.recipients.length > 0) {
          const items = await buildVencimientoItems(config.daysAhead);
          if (items.length > 0) {
            const result = await sendWeeklyVencimientosEmail(config.recipients, items, config.daysAhead);
            if (result.ok) {
              await setLastSent(new Date());
              await markNotificado(items);
            }
          } else {
            await setLastSent(new Date());
          }
        }
      }
      return NextResponse.json({ ok: true, checked: true });
    }

    const items = await buildVencimientoItems(config.daysAhead);
    return NextResponse.json({
      config,
      lastSent: lastSent?.toISOString() ?? null,
      pendingCount: items.length,
      nextCheckDue: lastSent ? new Date(lastSent.getTime() + SEVEN_DAYS_MS).toISOString() : null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const action = req.nextUrl.searchParams.get("action");

  try {
    if (action === "save-config") {
      const body = await req.json();
      const { recipients, daysAhead } = body as AlertConfig;

      if (!Array.isArray(recipients)) {
        return NextResponse.json({ error: "recipients debe ser un array" }, { status: 400 });
      }
      const validDays = [7, 15, 30];
      const days = validDays.includes(Number(daysAhead)) ? Number(daysAhead) : 30;

      const config: AlertConfig = {
        recipients: recipients.filter((r) => typeof r === "string" && r.includes("@")),
        daysAhead: days,
      };

      await prisma.setting.upsert({
        where: { key: CONFIG_KEY },
        update: { value: JSON.stringify(config) },
        create: { key: CONFIG_KEY, value: JSON.stringify(config) },
      });

      return NextResponse.json({ ok: true, config });
    }

    if (action === "send-now") {
      const config = await getAlertConfig();
      const items = await buildVencimientoItems(config.daysAhead);
      const result = await sendWeeklyVencimientosEmail(config.recipients, items, config.daysAhead);

      if (result.ok) {
        await setLastSent(new Date());
        if (result.messageId !== "no-items") {
          await markNotificado(items);
        }
      }

      return NextResponse.json({
        ok: result.ok,
        error: result.error,
        messageId: result.messageId,
        sentCount: items.length,
      });
    }

    return NextResponse.json({ error: "action no reconocida" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
