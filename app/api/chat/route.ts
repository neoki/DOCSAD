import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveAiConfig, buildSystemContext } from "@/lib/ai-context";

export const maxDuration = 60;

type Message = { role: "user" | "assistant"; content: string };

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const geminiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callKimi(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Kimi error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAzureOpenAI(
  apiKey: string,
  endpoint: string,
  deploymentName: string,
  apiVersion: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  const base = endpoint.replace(/\/$/, "");
  const url = `${base}/openai/deployments/${encodeURIComponent(deploymentName)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: Message[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const allMessages: Message[] = body.messages ?? [];
  if (!allMessages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }
  const MAX_HISTORY = 20;
  const messages: Message[] = allMessages.slice(-MAX_HISTORY);

  const aiConfig = await getActiveAiConfig();
  if (!aiConfig) {
    return NextResponse.json(
      { error: "no_provider", message: "No hay ningún proveedor de IA configurado. Configura una API key en Ajustes." },
      { status: 200 }
    );
  }

  const lastUserMsg = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
  let systemPrompt: string;
  try {
    systemPrompt = await buildSystemContext(lastUserMsg);
  } catch (err) {
    systemPrompt = `Eres el asistente de DocFincas, un sistema de gestión documental para comunidades de propietarios. Hoy es ${new Date().toLocaleDateString("es-ES")}. Responde siempre en español.`;
    console.error("Error building context:", err);
  }

  try {
    let reply: string;
    const { provider, model, apiKey, endpoint, apiVersion } = aiConfig;

    if (provider === "azure_openai") {
      const azureEndpoint = endpoint ?? "";
      const azureDeployment = aiConfig.deploymentName ?? "";
      const version = apiVersion ?? "2025-01-01-preview";
      if (!azureEndpoint || !azureDeployment) {
        return NextResponse.json(
          { error: "config_error", message: "Azure OpenAI requiere Endpoint URL y Nombre de despliegue. Configúralos en Ajustes." },
          { status: 200 }
        );
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(azureEndpoint);
      } catch {
        return NextResponse.json(
          { error: "config_error", message: "El Endpoint de Azure OpenAI no es una URL válida." },
          { status: 200 }
        );
      }
      const h = parsedUrl.hostname;
      const validHost =
        h.endsWith(".openai.azure.com") ||
        h.endsWith(".cognitiveservices.azure.com") ||
        h.endsWith(".services.ai.azure.com");
      if (parsedUrl.protocol !== "https:" || !validHost) {
        return NextResponse.json(
          { error: "config_error", message: "El Endpoint de Azure OpenAI debe ser una URL HTTPS de un dominio de Microsoft Azure." },
          { status: 200 }
        );
      }
      reply = await callAzureOpenAI(apiKey, azureEndpoint, azureDeployment, version, systemPrompt, messages);
    } else if (provider === "openai") {
      reply = await callOpenAI(apiKey, model, systemPrompt, messages);
    } else if (provider === "anthropic") {
      reply = await callAnthropic(apiKey, model, systemPrompt, messages);
    } else if (provider === "gemini") {
      reply = await callGemini(apiKey, model, systemPrompt, messages);
    } else if (provider === "kimi") {
      reply = await callKimi(apiKey, model, systemPrompt, messages);
    } else {
      reply = await callOpenAI(apiKey, model, systemPrompt, messages);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json(
      { error: "api_error", message: `Error al llamar a la IA: ${msg.slice(0, 300)}` },
      { status: 200 }
    );
  }
}
