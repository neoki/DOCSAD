import { STANDARD_SUBFOLDERS } from "./microsoft-graph";

export type ClassificationResult = {
  communityCode: string | null;
  subfolder: string;
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
};

const SUBFOLDER_KEYWORDS: { folder: string; keywords: string[] }[] = [
  {
    folder: "01_Actas",
    keywords: ["acta", "actas", "junta", "juntas", "asamblea", "reunion", "convocatoria"],
  },
  {
    folder: "02_Presupuestos_y_Cuentas",
    keywords: [
      "presupuesto", "presupuestos", "balance", "balances", "liquidacion", "liquidación",
      "cuenta", "cuentas", "derramas", "derrama", "gastos", "gasto", "consumo", "consumos",
      "listado recibos", "relacion recibos", "relación recibos",
    ],
  },
  {
    folder: "03_Contratos",
    keywords: ["contrato", "contratos", "mandato", "sepa"],
  },
  {
    folder: "04_Facturas",
    keywords: ["factura", "facturas", "abono", "albaran", "albarán", "pago"],
  },
  {
    folder: "05_Seguros",
    keywords: [
      "seguro", "seguros", "poliza", "póliza", "siniestro", "fiatc", "mutua",
      "zurich", "mapfre", "axa", "allianz", "generali",
    ],
  },
  {
    folder: "06_Certificados_e_Informes",
    keywords: [
      "certificado", "certificados", "informe", "informes", "ite",
      "evaluacion", "evaluación", "inspeccion", "inspección",
      "eficiencia energetica", "eficiencia energética",
    ],
  },
  {
    folder: "07_Recibos",
    keywords: ["recibo", "recibos", "devueltos", "remesa"],
  },
  {
    folder: "08_Correspondencia",
    keywords: [
      "carta", "cartas", "circular", "circulares", "notificacion", "notificación",
      "burofax", "buzon", "buzón", "correspondencia", "nota",
    ],
  },
  {
    folder: "09_Documentacion_Legal",
    keywords: [
      "escritura", "division horizontal", "división horizontal", "estatuto", "estatutos",
      "demanda", "sentencia", "legal", "juzgado", "comunidad hereditaria",
      "propiedad horizontal", "registro", "subvencion", "subvención",
    ],
  },
  {
    folder: "10_Mantenimiento",
    keywords: [
      "mantenimiento", "reparacion", "reparación", "averia", "avería",
      "ascensor", "ascensores", "caldera", "calderas", "fontaneria", "fontanería",
      "electricidad", "obra", "obras", "reforma", "gasoleo", "gasóleo",
      "descarga", "instalacion", "instalación", "telecomunicaciones", "antena",
      "cubierta", "fachada", "tejado", "plano", "planos", "proyecto",
      "thyssen", "schindler", "otis", "kone", "saltoki",
    ],
  },
  {
    folder: "11_Otros",
    keywords: [],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[¢ó]/g, "o")
    .replace(/[¤ñ]/g, "n")
    .replace(/[§º]/g, "")
    .replace(/[àá]/g, "a")
    .replace(/[èé]/g, "e")
    .replace(/[ìí]/g, "i")
    .replace(/[ùú]/g, "u");
}

function classifySubfolder(fileName: string): string {
  const normalized = normalize(fileName);

  for (const entry of SUBFOLDER_KEYWORDS) {
    if (entry.keywords.length === 0) continue;
    for (const kw of entry.keywords) {
      if (normalized.includes(normalize(kw))) {
        return entry.folder;
      }
    }
  }

  return "11_Otros";
}

export function classifyFile(filePath: string): ClassificationResult {
  const fileName = filePath.replace(/^.*[\\/]/, "");

  const codeMatch = fileName.match(/^(\d{3})\./);
  if (codeMatch) {
    const rawCode = codeMatch[1];
    const communityCode = rawCode.padStart(6, "0");
    const restOfName = fileName.substring(codeMatch[0].length);
    const subfolder = classifySubfolder(restOfName);

    return {
      communityCode,
      subfolder,
      confidence: "high",
      reason: `Código ${rawCode} detectado en nombre de archivo`,
    };
  }

  const fourDigitMatch = fileName.match(/^0(\d{3})\./);
  if (fourDigitMatch) {
    const rawCode = fourDigitMatch[1];
    const communityCode = rawCode.padStart(6, "0");
    const restOfName = fileName.substring(fourDigitMatch[0].length);
    const subfolder = classifySubfolder(restOfName);

    return {
      communityCode,
      subfolder,
      confidence: "medium",
      reason: `Código 0${rawCode} (posible ${rawCode}) detectado`,
    };
  }

  const parenMatch = fileName.match(/^\((\d{3})\)/);
  if (parenMatch) {
    const rawCode = parenMatch[1];
    const communityCode = rawCode.padStart(6, "0");
    const restOfName = fileName.substring(parenMatch[0].length);
    const subfolder = classifySubfolder(restOfName);

    return {
      communityCode,
      subfolder,
      confidence: "medium",
      reason: `Código (${rawCode}) entre paréntesis detectado`,
    };
  }

  return {
    communityCode: null,
    subfolder: "11_Otros",
    confidence: "none",
    reason: "No se detectó código de comunidad",
  };
}

export function classifyFiles(filePaths: string[]): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();
  for (const path of filePaths) {
    results.set(path, classifyFile(path));
  }
  return results;
}

export function getSubfolderForName(fileName: string): string {
  return classifySubfolder(fileName);
}

export { STANDARD_SUBFOLDERS };
