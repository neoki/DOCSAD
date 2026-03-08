export interface DocType {
  id: string;
  label: string;
  categoria: string;
  subcategoria: string;
}

export const DOC_TYPES: DocType[] = [
  { id: "escritura_division", label: "Escritura de división horizontal", categoria: "juridica", subcategoria: "Escrituras y Títulos" },
  { id: "nota_simple", label: "Nota simple registral", categoria: "juridica", subcategoria: "Escrituras y Títulos" },
  { id: "cif_comunidad", label: "CIF comunidad", categoria: "juridica", subcategoria: "Escrituras y Títulos" },
  { id: "estatutos", label: "Estatutos de la comunidad", categoria: "juridica", subcategoria: "Estatutos y Reglamentos" },
  { id: "reglamento_interno", label: "Reglamento de régimen interno", categoria: "juridica", subcategoria: "Estatutos y Reglamentos" },

  { id: "acta_ordinaria", label: "Acta junta ordinaria", categoria: "gobierno", subcategoria: "Actas de Juntas" },
  { id: "acta_extraordinaria", label: "Acta junta extraordinaria", categoria: "gobierno", subcategoria: "Actas de Juntas" },
  { id: "libro_actas", label: "Libro de actas", categoria: "gobierno", subcategoria: "Actas de Juntas" },
  { id: "nombramiento_presidente", label: "Nombramiento presidente", categoria: "gobierno", subcategoria: "Cargos y Representación" },
  { id: "poder_administrador", label: "Poder administrador", categoria: "gobierno", subcategoria: "Cargos y Representación" },

  { id: "presupuesto_anual", label: "Presupuesto anual aprobado", categoria: "contabilidad", subcategoria: "Presupuestos" },
  { id: "liquidacion_ejercicio", label: "Liquidación ejercicio anterior", categoria: "contabilidad", subcategoria: "Presupuestos" },
  { id: "certificado_cuenta", label: "Certificado titularidad cuenta", categoria: "contabilidad", subcategoria: "Cuentas Bancarias" },
  { id: "extractos_bancarios", label: "Extractos bancarios", categoria: "contabilidad", subcategoria: "Cuentas Bancarias" },

  { id: "poliza_multirriesgo", label: "Póliza seguro multirriesgo", categoria: "seguros", subcategoria: "Pólizas" },
  { id: "poliza_rc", label: "Póliza responsabilidad civil", categoria: "seguros", subcategoria: "Pólizas" },
  { id: "expedientes_siniestros", label: "Expedientes siniestros abiertos", categoria: "seguros", subcategoria: "Siniestros" },
  { id: "resoluciones_siniestros", label: "Resoluciones siniestros", categoria: "seguros", subcategoria: "Siniestros" },

  { id: "contrato_ascensor", label: "Contrato ascensor", categoria: "contratos", subcategoria: "Mantenimiento" },
  { id: "contrato_limpieza", label: "Contrato limpieza", categoria: "contratos", subcategoria: "Mantenimiento" },
  { id: "contrato_jardineria", label: "Contrato jardinería", categoria: "contratos", subcategoria: "Mantenimiento" },
  { id: "contrato_luz", label: "Contrato luz zonas comunes", categoria: "contratos", subcategoria: "Suministros" },
  { id: "contrato_agua", label: "Contrato agua", categoria: "contratos", subcategoria: "Suministros" },

  { id: "evaluacion_riesgos", label: "Evaluación riesgos laborales", categoria: "prevencion", subcategoria: "Evaluaciones" },
  { id: "plan_emergencia", label: "Plan emergencia evacuación", categoria: "prevencion", subcategoria: "Evaluaciones" },
  { id: "certificados_prl", label: "Certificados formación PRL", categoria: "prevencion", subcategoria: "Formación" },
  { id: "fichas_seguridad", label: "Fichas de seguridad", categoria: "prevencion", subcategoria: "Formación" },
];

export type DocTypeId = string;

export interface Categoria {
  label: string;
  color: string;
  subcategorias: string[];
}

export const CATEGORIAS: Record<string, Categoria> = {
  juridica: { label: "Documentación Jurídica", color: "#4F7CFF", subcategorias: ["Escrituras y Títulos", "Estatutos y Reglamentos"] },
  gobierno: { label: "Órganos de Gobierno", color: "#22C55E", subcategorias: ["Actas de Juntas", "Cargos y Representación"] },
  contabilidad: { label: "Contabilidad", color: "#F59E0B", subcategorias: ["Presupuestos", "Cuentas Bancarias"] },
  seguros: { label: "Seguros", color: "#EC4899", subcategorias: ["Pólizas", "Siniestros"] },
  contratos: { label: "Contratos y Proveedores", color: "#8B5CF6", subcategorias: ["Mantenimiento", "Suministros"] },
  prevencion: { label: "Prevención de Riesgos", color: "#EF4444", subcategorias: ["Evaluaciones", "Formación"] },
};

export function getDocTypeLabel(id: string): string {
  return DOC_TYPES.find((dt) => dt.id === id)?.label ?? id;
}

export function getDocType(id: string): DocType | undefined {
  return DOC_TYPES.find((dt) => dt.id === id);
}

export function getDocTypesByCategoria(catId: string): DocType[] {
  return DOC_TYPES.filter((dt) => dt.categoria === catId);
}
