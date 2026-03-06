import { Comunidad, Operativa } from "@prisma/client";

type ComunidadWithOperativa = Comunidad & {
  operativa: Operativa | null;
};

type AlertaGenerada = {
  comunidadId: string;
  tipo: string;
  urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAJA";
  titulo: string;
  descripcion: string;
};

export function generarAlertas(comunidades: ComunidadWithOperativa[]): AlertaGenerada[] {
  const alertas: AlertaGenerada[] = [];
  const today = new Date();
  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);
  const fiveYearsAgo = new Date(today);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  for (const comunidad of comunidades) {
    const op = comunidad.operativa;
    if (!op) continue;

    // ITE vencida
    if (op.obligadaITE && op.fechaProximaITE && op.fechaProximaITE < today) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "ITE",
        urgencia: "CRITICA",
        titulo: "ITE Vencida",
        descripcion: `La ITE de ${comunidad.nombre} venció el ${op.fechaProximaITE.toLocaleDateString("es-ES")}. Requiere acción inmediata.`,
      });
    }

    // ITE próxima (≤60 días)
    if (
      op.obligadaITE &&
      op.fechaProximaITE &&
      op.fechaProximaITE >= today &&
      op.fechaProximaITE <= in60Days
    ) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "ITE",
        urgencia: "ALTA",
        titulo: "ITE Próxima a Vencer",
        descripcion: `La ITE de ${comunidad.nombre} vence el ${op.fechaProximaITE.toLocaleDateString("es-ES")} (en menos de 60 días).`,
      });
    }

    // Reformas > 5 años
    if (op.reformaFontaneria && op.fechaReformaFontaneria && op.fechaReformaFontaneria < fiveYearsAgo) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "REFORMA",
        urgencia: "MEDIA",
        titulo: "Reforma de Fontanería Antigua",
        descripcion: `La reforma de fontanería de ${comunidad.nombre} se realizó hace más de 5 años (${op.fechaReformaFontaneria.toLocaleDateString("es-ES")}). Considerar revisión.`,
      });
    }

    if (op.reformaSaneamiento && op.fechaReformaSaneamiento && op.fechaReformaSaneamiento < fiveYearsAgo) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "REFORMA",
        urgencia: "MEDIA",
        titulo: "Reforma de Saneamiento Antigua",
        descripcion: `La reforma de saneamiento de ${comunidad.nombre} se realizó hace más de 5 años (${op.fechaReformaSaneamiento.toLocaleDateString("es-ES")}). Considerar revisión.`,
      });
    }

    if (op.reformaElectricidad && op.fechaReformaElectricidad && op.fechaReformaElectricidad < fiveYearsAgo) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "REFORMA",
        urgencia: "MEDIA",
        titulo: "Reforma Eléctrica Antigua",
        descripcion: `La reforma eléctrica de ${comunidad.nombre} se realizó hace más de 5 años (${op.fechaReformaElectricidad.toLocaleDateString("es-ES")}). Considerar revisión.`,
      });
    }

    // Seguro sin póliza
    if (!op.numeroPolizaSeguro && !op.somosCorredorSeguro) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "SEGURO",
        urgencia: "ALTA",
        titulo: "Sin Número de Póliza de Seguro",
        descripcion: `${comunidad.nombre} no tiene número de póliza registrado y no usa corredor de seguro propio.`,
      });
    }

    // Videovigilancia sin revisión RGPD
    if (op.tieneVideovigilancia) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "RGPD",
        urgencia: "MEDIA",
        titulo: "Videovigilancia: Revisar RGPD",
        descripcion: `${comunidad.nombre} tiene videovigilancia. Verificar que el registro de actividades RGPD esté actualizado.`,
      });
    }

    // Arrendadora sin descripción
    if (op.actuaComoArrendadora && !op.activoArrendadoDescripcion) {
      alertas.push({
        comunidadId: comunidad.id,
        tipo: "ARRENDAMIENTO",
        urgencia: "ALTA",
        titulo: "Arrendadora sin Descripción de Activo",
        descripcion: `${comunidad.nombre} actúa como arrendadora pero no tiene descripción del activo arrendado.`,
      });
    }
  }

  return alertas;
}
