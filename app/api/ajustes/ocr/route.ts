import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const setting = await prisma.setting.findUnique({ where: { key: "azure_ocr_config" } });
  if (!setting || !setting.value) return NextResponse.json({ endpoint: "", apiKeyMasked: "", hasKey: false });

  try {
    const cfg = JSON.parse(setting.value) as { endpoint?: string; apiKey?: string };
    return NextResponse.json({
      endpoint: cfg.endpoint ?? "",
      apiKeyMasked: cfg.apiKey ? maskKey(cfg.apiKey) : "",
      hasKey: !!cfg.apiKey,
    });
  } catch {
    return NextResponse.json({ endpoint: "", apiKeyMasked: "", hasKey: false });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const existing = await prisma.setting.findUnique({ where: { key: "azure_ocr_config" } });
  let existingKey: string | null = null;
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value) as { apiKey?: string };
      existingKey = parsed.apiKey ?? null;
    } catch {
      // ignore
    }
  }

  const apiKey =
    body.apiKey && body.apiKey.includes("****") && existingKey
      ? existingKey
      : (body.apiKey ?? "");

  await prisma.setting.upsert({
    where: { key: "azure_ocr_config" },
    update: { value: JSON.stringify({ endpoint: body.endpoint ?? "", apiKey }) },
    create: { key: "azure_ocr_config", value: JSON.stringify({ endpoint: body.endpoint ?? "", apiKey }) },
  });

  return NextResponse.json({ ok: true });
}
