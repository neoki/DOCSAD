import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: {
    provider?: string;
    apiKey?: string;
    model?: string;
    endpoint?: string;
    deploymentName?: string;
    apiVersion?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Formato inválido" }, { status: 400 });
  }

  let { provider, apiKey, model, endpoint, deploymentName, apiVersion } = body;

  if (!provider) {
    return NextResponse.json({ ok: false, error: "Falta el proveedor" });
  }

  if (!apiKey) {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: "ai_config" } });
      if (setting) {
        const cfg = JSON.parse(setting.value);
        apiKey = cfg?.providers?.[provider]?.apiKey ?? "";
      }
    } catch {
      apiKey = "";
    }
  }

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Falta la clave API — guarda la configuración primero" });
  }

  const testMessages = [{ role: "user", content: "Di ok" }];

  try {
    if (provider === "openai") {
      if (!model) return NextResponse.json({ ok: false, error: "Falta el modelo" });
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: testMessages, max_tokens: 5 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err?.error?.message ?? `Error ${res.status}` });
      }
      return NextResponse.json({ ok: true });

    } else if (provider === "anthropic") {
      if (!model) return NextResponse.json({ ok: false, error: "Falta el modelo" });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, messages: testMessages, max_tokens: 5 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err?.error?.message ?? `Error ${res.status}` });
      }
      return NextResponse.json({ ok: true });

    } else if (provider === "gemini") {
      if (!model) return NextResponse.json({ ok: false, error: "Falta el modelo" });
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Di ok" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err?.error?.message ?? `Error ${res.status}` });
      }
      return NextResponse.json({ ok: true });

    } else if (provider === "kimi") {
      if (!model) return NextResponse.json({ ok: false, error: "Falta el modelo" });
      const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: testMessages, max_tokens: 5 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ ok: false, error: err?.error?.message ?? `Error ${res.status}` });
      }
      return NextResponse.json({ ok: true });

    } else if (provider === "azure_openai") {
      if (!endpoint) return NextResponse.json({ ok: false, error: "Falta el Endpoint URL" });
      if (!deploymentName) return NextResponse.json({ ok: false, error: "Falta el Nombre de despliegue" });
      if (!isValidAzureEndpoint(endpoint)) {
        return NextResponse.json({ ok: false, error: "El Endpoint debe ser HTTPS de un dominio Azure" });
      }
      const userVersion = apiVersion ?? "2025-01-01-preview";
      const base = endpoint.replace(/\/$/, "");
      const enc = encodeURIComponent;
      const hostname = new URL(base).hostname;
      const isFoundryProject = hostname.endsWith(".services.ai.azure.com");

      // Build candidates ordered by likelihood of success
      const urlCandidates: string[] = isFoundryProject
        ? [
            // Azure AI Foundry project endpoint — correct API version
            `${base}/models/${enc(deploymentName)}/chat/completions?api-version=2024-05-01-preview`,
            `${base}/models/${enc(deploymentName)}/chat/completions?api-version=2024-12-01-preview`,
            `${base}/models/${enc(deploymentName)}/chat/completions?api-version=${enc(userVersion)}`,
          ]
        : [
            // cognitiveservices / openai.azure.com — try both paths with user version
            `${base}/models/${enc(deploymentName)}/chat/completions?api-version=${enc(userVersion)}`,
            `${base}/openai/deployments/${enc(deploymentName)}/chat/completions?api-version=${enc(userVersion)}`,
          ];

      let lastError = "";
      for (const url of urlCandidates) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": apiKey },
          body: JSON.stringify({ messages: testMessages, max_tokens: 5 }),
        });
        if (res.ok) {
          const workedVersion = new URL(url).searchParams.get("api-version") ?? "";
          const pathType = url.includes("/models/") ? "Azure AI Foundry" : "Azure OpenAI clásico";
          const hint = workedVersion ? `${pathType} · api-version: ${workedVersion}` : pathType;
          return NextResponse.json({ ok: true, hint, debugUrl: url });
        }
        const err = await res.json().catch(() => ({}));
        const code = err?.error?.code ?? "";
        const msg = err?.error?.message ?? `HTTP ${res.status}`;
        lastError = code ? `[${code}] ${msg}` : `HTTP ${res.status}: ${msg}`;
      }
      return NextResponse.json({ ok: false, error: lastError });

    } else {
      return NextResponse.json({ ok: false, error: "Proveedor no reconocido" });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err).slice(0, 200) });
  }
}
