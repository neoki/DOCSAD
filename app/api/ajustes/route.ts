import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "****" : "";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function isValidAzureEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") return false;
    const h = url.hostname;
    return (
      h.endsWith(".openai.azure.com") ||
      h.endsWith(".cognitiveservices.azure.com") ||
      h.endsWith(".services.ai.azure.com")
    );
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "ai_config" },
    });

    if (!setting) {
      return NextResponse.json({});
    }

    const config = JSON.parse(setting.value);
    if (config.providers) {
      for (const id of Object.keys(config.providers)) {
        if (config.providers[id].apiKey) {
          config.providers[id].apiKeyMasked = maskKey(config.providers[id].apiKey);
          config.providers[id].hasKey = true;
          delete config.providers[id].apiKey;
        } else {
          config.providers[id].apiKeyMasked = "";
          config.providers[id].hasKey = false;
        }
      }
    }

    return NextResponse.json(config);
  } catch {
    return NextResponse.json({});
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (body.providers?.azure_openai) {
    const azureCfg = body.providers.azure_openai;
    if (azureCfg.endpoint && !isValidAzureEndpoint(azureCfg.endpoint)) {
      return NextResponse.json(
        { error: "El Endpoint de Azure OpenAI debe ser una URL HTTPS de un dominio de Microsoft Azure" },
        { status: 400 }
      );
    }
  }

  try {
    const existing = await prisma.setting.findUnique({
      where: { key: "ai_config" },
    });

    let mergedConfig = body;
    if (existing && body.providers) {
      const existingConfig = JSON.parse(existing.value);
      if (existingConfig.providers) {
        for (const id of Object.keys(body.providers)) {
          const incoming = body.providers[id];
          const stored = existingConfig.providers[id] ?? {};
          if (incoming.apiKey === "" && stored.apiKey) {
            incoming.apiKey = stored.apiKey;
          }
          if (id === "azure_openai") {
            if (incoming.endpoint === undefined) incoming.endpoint = stored.endpoint ?? "";
            if (incoming.deploymentName === undefined) incoming.deploymentName = stored.deploymentName ?? "";
            if (incoming.apiVersion === undefined) incoming.apiVersion = stored.apiVersion ?? "2025-01-01-preview";
          }
        }
      }
      mergedConfig = body;
    }

    await prisma.setting.upsert({
      where: { key: "ai_config" },
      update: { value: JSON.stringify(mergedConfig) },
      create: { key: "ai_config", value: JSON.stringify(mergedConfig) },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar la configuración" }, { status: 500 });
  }
}
