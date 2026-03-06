export const DOC_TYPES = [
  { id: "estatutos", label: "Estatutos de la Comunidad", categoria: "juridico" },
  { id: "acta_constitucion", label: "Acta de Constitución", categoria: "juridico" },
  { id: "libro_actas", label: "Libro de Actas", categoria: "juridico" },
  { id: "cif_comunidad", label: "CIF de la Comunidad", categoria: "juridico" },
  { id: "escrituras", label: "Escrituras del Edificio", categoria: "juridico" },
  { id: "seguro_comunidad", label: "Póliza de Seguro", categoria: "seguros" },
  { id: "seguro_certificado", label: "Último Recibo Seguro", categoria: "seguros" },
  { id: "ite_certificado", label: "Certificado ITE", categoria: "tecnico" },
  { id: "boletin_electrico", label: "Boletín Eléctrico", categoria: "tecnico" },
  { id: "certificado_ascensor", label: "Certificado Ascensor", categoria: "tecnico" },
  { id: "rgpd_registro", label: "Registro Actividades RGPD", categoria: "legal" },
  { id: "rgpd_politica", label: "Política de Privacidad", categoria: "legal" },
  { id: "contrato_limpieza", label: "Contrato Limpieza", categoria: "contratos" },
  { id: "contrato_mantenimiento", label: "Contrato Mantenimiento", categoria: "contratos" },
  { id: "contrato_jardineria", label: "Contrato Jardinería", categoria: "contratos" },
  { id: "presupuesto_anual", label: "Presupuesto Anual", categoria: "financiero" },
  { id: "liquidacion_anual", label: "Liquidación Anual", categoria: "financiero" },
  { id: "cuenta_corriente", label: "Cuenta Corriente", categoria: "financiero" },
] as const;

export type DocTypeId = (typeof DOC_TYPES)[number]["id"];

export const CATEGORIAS = {
  juridico: "Jurídico",
  seguros: "Seguros",
  tecnico: "Técnico",
  legal: "Legal",
  contratos: "Contratos",
  financiero: "Financiero",
} as const;

export function getDocTypeLabel(id: string): string {
  return DOC_TYPES.find((dt) => dt.id === id)?.label ?? id;
}
