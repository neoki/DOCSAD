import { PrismaClient, EstadoChecklist } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DOC_TYPES = [
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
];

function genChecklist(comunidadId: string) {
  return DOC_TYPES.map((dt) => ({
    comunidadId,
    docTypeId: dt.id,
    estado: EstadoChecklist.PENDIENTE as EstadoChecklist,
    fecha: null,
    observaciones: "",
    justificacion: "",
  }));
}

const COMUNIDADES_INIT = [
  {
    nombre: "Comunidad Calle Mayor 12",
    nif: "H28123456",
    direccion: "Calle Mayor 12, Madrid 28001",
    pisos: 24,
    operativa: {
      usaAgreGasfincas: true,
      somosCorredorSeguro: true,
      corredorSeguroNombre: "Aseguradora Nacional",
      numeroPolizaSeguro: "POL-2024-001",
      usaNuevoSistemaIncidencias: true,
      tieneAppTuComunidad: true,
      tienePortero: true,
      tieneConserje: false,
      tieneGarajista: false,
      tieneLimpiadora: true,
      tieneOtroPersonal: false,
      descripcionOtroPersonal: null,
      tieneVideovigilancia: true,
      actuaComoArrendadora: false,
      activoArrendadoDescripcion: null,
      gestionaConsumos: true,
      empresaGestionConsumos: "Endesa Gestión",
      gestionaPermisosGasoleo: false,
      reformaFontaneria: true,
      fechaReformaFontaneria: new Date("2021-03-15"),
      reformaSaneamiento: false,
      fechaReformaSaneamiento: null,
      reformaElectricidad: true,
      fechaReformaElectricidad: new Date("2022-06-20"),
      obligadaITE: true,
      fechaProximaITE: new Date("2025-12-31"),
    },
  },
  {
    nombre: "Residencial Los Pinos",
    nif: "H28234567",
    direccion: "Avda. de los Pinos 45, Madrid 28020",
    pisos: 36,
    operativa: {
      usaAgreGasfincas: true,
      somosCorredorSeguro: false,
      corredorSeguroNombre: null,
      numeroPolizaSeguro: null,
      usaNuevoSistemaIncidencias: false,
      tieneAppTuComunidad: false,
      tienePortero: false,
      tieneConserje: true,
      tieneGarajista: true,
      tieneLimpiadora: true,
      tieneOtroPersonal: true,
      descripcionOtroPersonal: "Jardinero externo",
      tieneVideovigilancia: true,
      actuaComoArrendadora: true,
      activoArrendadoDescripcion: "Local comercial planta baja",
      gestionaConsumos: false,
      empresaGestionConsumos: null,
      gestionaPermisosGasoleo: true,
      reformaFontaneria: false,
      fechaReformaFontaneria: null,
      reformaSaneamiento: true,
      fechaReformaSaneamiento: new Date("2018-09-10"),
      reformaElectricidad: false,
      fechaReformaElectricidad: null,
      obligadaITE: true,
      fechaProximaITE: new Date("2024-06-30"),
    },
  },
  {
    nombre: "Edificio Gran Vía 88",
    nif: "H28345678",
    direccion: "Gran Vía 88, Madrid 28013",
    pisos: 48,
    operativa: {
      usaAgreGasfincas: false,
      somosCorredorSeguro: true,
      corredorSeguroNombre: "Mapfre Intermediación",
      numeroPolizaSeguro: "POL-2023-445",
      usaNuevoSistemaIncidencias: true,
      tieneAppTuComunidad: true,
      tienePortero: true,
      tieneConserje: true,
      tieneGarajista: false,
      tieneLimpiadora: true,
      tieneOtroPersonal: false,
      descripcionOtroPersonal: null,
      tieneVideovigilancia: false,
      actuaComoArrendadora: false,
      activoArrendadoDescripcion: null,
      gestionaConsumos: true,
      empresaGestionConsumos: "Iberdrola Clientes",
      gestionaPermisosGasoleo: false,
      reformaFontaneria: true,
      fechaReformaFontaneria: new Date("2019-11-05"),
      reformaSaneamiento: true,
      fechaReformaSaneamiento: new Date("2020-02-28"),
      reformaElectricidad: true,
      fechaReformaElectricidad: new Date("2023-08-15"),
      obligadaITE: true,
      fechaProximaITE: new Date("2026-03-15"),
    },
  },
  {
    nombre: "Urbanización El Roble",
    nif: "H28456789",
    direccion: "C/ El Roble 7, Pozuelo de Alarcón 28224",
    pisos: 16,
    operativa: {
      usaAgreGasfincas: true,
      somosCorredorSeguro: true,
      corredorSeguroNombre: "AXA Seguros",
      numeroPolizaSeguro: "POL-2024-789",
      usaNuevoSistemaIncidencias: false,
      tieneAppTuComunidad: false,
      tienePortero: false,
      tieneConserje: false,
      tieneGarajista: false,
      tieneLimpiadora: true,
      tieneOtroPersonal: false,
      descripcionOtroPersonal: null,
      tieneVideovigilancia: false,
      actuaComoArrendadora: false,
      activoArrendadoDescripcion: null,
      gestionaConsumos: false,
      empresaGestionConsumos: null,
      gestionaPermisosGasoleo: false,
      reformaFontaneria: false,
      fechaReformaFontaneria: null,
      reformaSaneamiento: false,
      fechaReformaSaneamiento: null,
      reformaElectricidad: false,
      fechaReformaElectricidad: null,
      obligadaITE: false,
      fechaProximaITE: null,
    },
  },
  {
    nombre: "Complejo Residencial Alameda",
    nif: "H28567890",
    direccion: "Paseo de la Alameda 23, Alcobendas 28100",
    pisos: 60,
    operativa: {
      usaAgreGasfincas: true,
      somosCorredorSeguro: false,
      corredorSeguroNombre: null,
      numeroPolizaSeguro: "POL-2022-112",
      usaNuevoSistemaIncidencias: true,
      tieneAppTuComunidad: true,
      tienePortero: true,
      tieneConserje: true,
      tieneGarajista: true,
      tieneLimpiadora: true,
      tieneOtroPersonal: true,
      descripcionOtroPersonal: "Socorrista piscina (temporada verano)",
      tieneVideovigilancia: true,
      actuaComoArrendadora: true,
      activoArrendadoDescripcion: "Pistas de pádel arrendadas a club deportivo",
      gestionaConsumos: true,
      empresaGestionConsumos: "Gas Natural Fenosa",
      gestionaPermisosGasoleo: true,
      reformaFontaneria: true,
      fechaReformaFontaneria: new Date("2020-05-20"),
      reformaSaneamiento: true,
      fechaReformaSaneamiento: new Date("2021-10-15"),
      reformaElectricidad: true,
      fechaReformaElectricidad: new Date("2022-12-01"),
      obligadaITE: true,
      fechaProximaITE: new Date("2025-09-30"),
    },
  },
];

const DOCS_SUBIDOS = [
  {
    comunidadIdx: 0,
    docTypeId: "estatutos",
    nombre: "Estatutos Comunidad Calle Mayor 12.pdf",
    rutaArchivo: null,
    sizeBytes: 245760,
    aiConfianza: 95,
  },
  {
    comunidadIdx: 0,
    docTypeId: "seguro_comunidad",
    nombre: "Poliza_Seguro_2024.pdf",
    rutaArchivo: null,
    sizeBytes: 512000,
    aiConfianza: 88,
  },
  {
    comunidadIdx: 1,
    docTypeId: "ite_certificado",
    nombre: "ITE_Los_Pinos_2023.pdf",
    rutaArchivo: null,
    sizeBytes: 189440,
    aiConfianza: 92,
  },
  {
    comunidadIdx: 2,
    docTypeId: "libro_actas",
    nombre: "Libro_Actas_Gran_Via_2024.pdf",
    rutaArchivo: null,
    sizeBytes: 1048576,
    aiConfianza: 79,
  },
  {
    comunidadIdx: 4,
    docTypeId: "presupuesto_anual",
    nombre: "Presupuesto_Alameda_2024.xlsx",
    rutaArchivo: null,
    sizeBytes: 98304,
    aiConfianza: null,
  },
];

async function main() {
  console.log("Seeding database...");

  // Check if already seeded
  const existingUser = await prisma.user.findUnique({
    where: { email: "admin@asesoriadiaz.com" },
  });

  if (existingUser) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash("Admin1234", 12);
  await prisma.user.create({
    data: {
      email: "admin@asesoriadiaz.com",
      passwordHash,
      name: "Administrador",
      role: "ADMIN",
    },
  });
  console.log("Admin user created");

  // Create communities with their operativas and checklists
  const createdComunidades: { id: string }[] = [];

  for (const comunidadData of COMUNIDADES_INIT) {
    const { operativa, ...comunidad } = comunidadData;

    const created = await prisma.comunidad.create({
      data: {
        ...comunidad,
        operativa: {
          create: operativa,
        },
        checklists: {
          createMany: {
            data: genChecklist("placeholder").map((c) => ({
              docTypeId: c.docTypeId,
              estado: c.estado,
              fecha: c.fecha,
              observaciones: c.observaciones,
              justificacion: c.justificacion,
            })),
          },
        },
      },
    });

    createdComunidades.push(created);
    console.log(`Created comunidad: ${created.id} - ${comunidad.nombre}`);
  }

  // Create sample documents
  for (const doc of DOCS_SUBIDOS) {
    const comunidad = createdComunidades[doc.comunidadIdx];
    if (!comunidad) continue;

    await prisma.documento.create({
      data: {
        comunidadId: comunidad.id,
        docTypeId: doc.docTypeId,
        nombre: doc.nombre,
        rutaArchivo: doc.rutaArchivo,
        sizeBytes: doc.sizeBytes,
        aiConfianza: doc.aiConfianza,
      },
    });
  }
  console.log("Sample documents created");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
