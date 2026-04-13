import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveAiConfig, buildSystemContext } from "@/lib/ai-context";
import { prisma } from "@/lib/prisma";

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
  const enc = encodeURIComponent;
  const payload = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: 1024,
    temperature: 0.3,
  };

  const parsedUrl = new URL(base);
  const isFoundryDomain = parsedUrl.hostname.endsWith(".services.ai.azure.com");
  const hubBase = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const foundryVersions = ["2024-05-01-preview", "2024-07-01-preview", "2024-09-01-preview", "2024-10-01-preview"];

  type AzureCandidate = { url: string; body: Record<string, unknown>; authHeader: Record<string, string> };

  const apiKeyHeader = { "api-key": apiKey };
  const bearerHeader = { "Authorization": `Bearer ${apiKey}` };

  const candidates: AzureCandidate[] = isFoundryDomain
    ? [
        // Azure AI Foundry /v1 — NO api-version (Azure rejects it on /v1 paths), model in body
        { url: `${base}/openai/v1/chat/completions`, body: { ...payload, model: deploymentName }, authHeader: apiKeyHeader },
        // Hub-level models inference fallback
        ...foundryVersions.map(v => ({ url: `${hubBase}/models/${enc(deploymentName)}/chat/completions?api-version=${v}`, body: payload, authHeader: apiKeyHeader })),
      ]
    : [
        { url: `${base}/models/${enc(deploymentName)}/chat/completions?api-version=${enc(apiVersion)}`, body: payload, authHeader: apiKeyHeader },
        { url: `${base}/openai/deployments/${enc(deploymentName)}/chat/completions?api-version=${enc(apiVersion)}`, body: payload, authHeader: apiKeyHeader },
      ];

  let lastErr = "";
  for (const c of candidates) {
    console.log(`[chat-azure] trying: ${c.url}`);
    const res = await fetch(c.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...c.authHeader },
      body: JSON.stringify(c.body),
    });
    if (res.ok) {
      console.log(`[chat-azure] success: ${c.url}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    }
    const errText = await res.text();
    lastErr = `Azure error ${res.status}: ${errText.slice(0, 200)}`;
    console.log(`[chat-azure] failed ${res.status}: ${c.url} — ${errText.slice(0, 150)}`);
  }
  throw new Error(lastErr);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { messages?: Message[]; conversationId?: string };
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

    const conversationId = await saveConversation(session.user?.email ?? "", body.conversationId, lastUserMsg, reply);

    return NextResponse.json({ reply, conversationId });
  } catch (err) {
    const msg = String(err);
    return NextResponse.json(
      { error: "api_error", message: `Error al llamar a la IA: ${msg.slice(0, 300)}` },
      { status: 200 }
    );
  }
}

async function saveConversation(
  email: string,
  existingConversationId: string | undefined,
  userMessage: string,
  assistantReply: string
): Promise<string> {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return existingConversationId ?? "";

    let conversationId = existingConversationId;

    if (!conversationId) {
      const title = userMessage.slice(0, 80).replace(/\s+/g, " ").trim() || "Nueva conversación";
      const conversation = await prisma.conversation.create({
        data: { userId: user.id, title },
      });
      conversationId = conversation.id;
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    await prisma.chatMessage.createMany({
      data: [
        { conversationId, role: "user", content: userMessage },
        { conversationId, role: "assistant", content: assistantReply },
      ],
    });

    return conversationId;
  } catch (err) {
    console.error("Error saving conversation:", err);
    return existingConversationId ?? "";
  }
}
