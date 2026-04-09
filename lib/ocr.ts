import { prisma } from "./prisma";

type OcrConfig = {
  endpoint: string;
  apiKey: string;
};

export type InvoiceFields = {
  importe: number | null;
  moneda: string;
  proveedor: string | null;
  fechaFactura: Date | null;
  numeroFactura: string | null;
};

export async function getOcrConfig(): Promise<OcrConfig | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "azure_ocr_config" } });
  if (!setting || !setting.value) return null;
  try {
    const cfg = JSON.parse(setting.value) as { endpoint?: string; apiKey?: string };
    if (!cfg.endpoint || !cfg.apiKey) return null;
    return { endpoint: cfg.endpoint.replace(/\/$/, ""), apiKey: cfg.apiKey };
  } catch {
    return null;
  }
}

export function isInvoiceFolder(folderName: string | null | undefined): boolean {
  if (!folderName) return false;
  const lower = folderName.toLowerCase();
  return (
    lower.includes("factura") ||
    lower.includes("invoice") ||
    lower.includes("recibo") ||
    lower.includes("04_fact")
  );
}

async function analyzeDocument(
  config: OcrConfig,
  documentUrl: string
): Promise<{ fields: Record<string, unknown>; rawJson: unknown } | null> {
  const analyzeUrl = `${config.endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze?api-version=2024-11-30`;

  const submitRes = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urlSource: documentUrl }),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Azure OCR submit failed: ${submitRes.status} ${err.slice(0, 200)}`);
  }

  const operationLocation = submitRes.headers.get("Operation-Location");
  if (!operationLocation) {
    throw new Error("No Operation-Location header in Azure OCR response");
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": config.apiKey },
    });
    if (!pollRes.ok) continue;

    const pollData = await pollRes.json() as { status: string; analyzeResult?: { documents?: Array<{ fields?: Record<string, unknown> }> } };
    if (pollData.status === "succeeded") {
      const doc = pollData.analyzeResult?.documents?.[0];
      return { fields: doc?.fields ?? {}, rawJson: pollData.analyzeResult };
    }
    if (pollData.status === "failed") {
      throw new Error("Azure OCR analysis failed");
    }
  }
  throw new Error("Azure OCR timed out after 60 seconds");
}

function extractCurrencyField(field: unknown): { amount: number | null; currency: string } {
  if (!field || typeof field !== "object") return { amount: null, currency: "EUR" };
  const f = field as Record<string, unknown>;
  const val = f.valueCurrency as Record<string, unknown> | undefined;
  if (val) {
    return {
      amount: typeof val.amount === "number" ? val.amount : null,
      currency: typeof val.currencyCode === "string" ? val.currencyCode : "EUR",
    };
  }
  if (typeof f.valueNumber === "number") return { amount: f.valueNumber, currency: "EUR" };
  return { amount: null, currency: "EUR" };
}

function extractStringField(field: unknown): string | null {
  if (!field || typeof field !== "object") return null;
  const f = field as Record<string, unknown>;
  if (typeof f.valueString === "string") return f.valueString;
  if (typeof f.content === "string") return f.content;
  return null;
}

function extractDateField(field: unknown): Date | null {
  if (!field || typeof field !== "object") return null;
  const f = field as Record<string, unknown>;
  if (typeof f.valueDate === "string") {
    const d = new Date(f.valueDate);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseFields(fields: Record<string, unknown>): InvoiceFields {
  const total = extractCurrencyField(fields.InvoiceTotal);
  const subtotal = extractCurrencyField(fields.SubTotal);
  const amount = total.amount ?? subtotal.amount;

  return {
    importe: amount,
    moneda: total.currency || "EUR",
    proveedor: extractStringField(fields.VendorName),
    fechaFactura: extractDateField(fields.InvoiceDate),
    numeroFactura: extractStringField(fields.InvoiceId),
  };
}

export async function extractInvoiceData(
  sharePointItemId: string,
  comunidadId: string,
  fileName: string,
  documentUrl: string
): Promise<void> {
  await prisma.extractedInvoiceData.upsert({
    where: { sharePointItemId },
    create: {
      sharePointItemId,
      comunidadId,
      fileName,
      status: "pending",
    },
    update: {
      status: "pending",
      errorMessage: null,
    },
  });

  const config = await getOcrConfig();
  if (!config) {
    await prisma.extractedInvoiceData.update({
      where: { sharePointItemId },
      data: { status: "no_config", processedAt: new Date() },
    });
    return;
  }

  try {
    const result = await analyzeDocument(config, documentUrl);
    if (!result) {
      await prisma.extractedInvoiceData.update({
        where: { sharePointItemId },
        data: { status: "error", errorMessage: "No results from Azure OCR", processedAt: new Date() },
      });
      return;
    }

    const parsed = parseFields(result.fields);
    await prisma.extractedInvoiceData.update({
      where: { sharePointItemId },
      data: {
        importe: parsed.importe,
        moneda: parsed.moneda,
        proveedor: parsed.proveedor,
        fechaFactura: parsed.fechaFactura,
        numeroFactura: parsed.numeroFactura,
        rawJson: result.rawJson as object,
        status: "success",
        processedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.extractedInvoiceData.update({
      where: { sharePointItemId },
      data: {
        status: "error",
        errorMessage: String(err).slice(0, 500),
        processedAt: new Date(),
      },
    });
  }
}
