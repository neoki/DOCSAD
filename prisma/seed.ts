import { PrismaClient, EstadoChecklist } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DOC_TYPE_IDS = [
  "escritura_division",
  "nota_simple",
  "cif_comunidad",
  "estatutos",
  "reglamento_interno",
  "acta_ordinaria",
  "acta_extraordinaria",
  "libro_actas",
  "nombramiento_presidente",
  "poder_administrador",
  "presupuesto_anual",
  "liquidacion_ejercicio",
  "certificado_cuenta",
  "extractos_bancarios",
  "poliza_multirriesgo",
  "poliza_rc",
  "expedientes_siniestros",
  "resoluciones_siniestros",
  "contrato_ascensor",
  "contrato_limpieza",
  "contrato_jardineria",
  "contrato_luz",
  "contrato_agua",
  "evaluacion_riesgos",
  "plan_emergencia",
  "certificados_prl",
  "fichas_seguridad",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function genChecklist(communityIndex: number) {
  const rng = seededRandom(communityIndex * 31337 + 42);
  return DOC_TYPE_IDS.map((docTypeId) => {
    const r = rng();
    let estado: EstadoChecklist;
    let fecha: Date | null = null;
    if (r < 0.45) {
      estado = EstadoChecklist.COMPLETADO;
      const daysAgo = Math.floor(rng() * 365);
      fecha = new Date(Date.now() - daysAgo * 86400000);
    } else if (r < 0.60) {
      estado = EstadoChecklist.NO_APLICA;
    } else {
      estado = EstadoChecklist.PENDIENTE;
    }
    return {
      docTypeId,
      estado,
      fecha,
      observaciones: "",
      justificacion: "",
    };
  });
}

const COMUNIDADES_INIT = [
  {
    nombre: "C.P. Las Magnolias",
    nif: "H28111001",
    direccion: "C/ Las Magnolias 14, Madrid 28036",
    pisos: 32,
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
    nombre: "C.P. Torre Blanca",
    nif: "H28111002",
    direccion: "Avda. Torre Blanca 7, Madrid 28020",
    pisos: 48,
    operativa: {
      usaAgreGasfincas: true,
      somosCorredorSeguro: false,
      corredorSeguroNombre: null,
      numeroPolizaSeguro: null,
      usaNuevoSistemaIncidencias: true,
      tieneAppTuComunidad: true,
      tienePortero: true,
      tieneConserje: true,
      tieneGarajista: false,
      tieneLimpiadora: true,
      tieneOtroPersonal: false,
      descripcionOtroPersonal: null,
      tieneVideovigilancia: true,
      actuaComoArrendadora: true,
      activoArrendadoDescripcion: "Local comercial planta baja",
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
    nombre: "C.P. El Rosal",
    nif: "H28111003",
    direccion: "C/ El Rosal 22, Pozuelo de Alarcón 28224",
    pisos: 16,
    operativa: {
      usaAgreGasfincas: false,
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
    nombre: "C.P. Residencial Norte",
    nif: "H28111004",
    direccion: "Paseo del Norte 45, Alcobendas 28100",
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
  {
    nombre: "C.P. Los Pinos",
    nif: "H28111005",
    direccion: "Avda. de los Pinos 3, Madrid 28045",
    pisos: 24,
    operativa: {
      usaAgreGasfincas: true,
      somosCorredorSeguro: true,
      corredorSeguroNombre: "Mapfre Intermediación",
      numeroPolizaSeguro: "POL-2023-445",
      usaNuevoSistemaIncidencias: false,
      tieneAppTuComunidad: false,
      tienePortero: false,
      tieneConserje: true,
      tieneGarajista: true,
      tieneLimpiadora: true,
      tieneOtroPersonal: true,
      descripcionOtroPersonal: "Jardinero externo",
      tieneVideovigilancia: true,
      actuaComoArrendadora: false,
      activoArrendadoDescripcion: null,
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
];

const DOCS_SUBIDOS = [
  {
    comunidadIdx: 0,
    docTypeId: "estatutos",
    nombre: "Estatutos_CP_Las_Magnolias.pdf",
    rutaArchivo: null,
    sizeBytes: 245760,
    aiConfianza: 95,
  },
  {
    comunidadIdx: 0,
    docTypeId: "poliza_multirriesgo",
    nombre: "Poliza_Seguro_Magnolias_2024.pdf",
    rutaArchivo: null,
    sizeBytes: 512000,
    aiConfianza: 88,
  },
  {
    comunidadIdx: 1,
    docTypeId: "acta_ordinaria",
    nombre: "Acta_Junta_Ordinaria_TorreBlanca_2024.pdf",
    rutaArchivo: null,
    sizeBytes: 921600,
    aiConfianza: 98,
  },
  {
    comunidadIdx: 3,
    docTypeId: "presupuesto_anual",
    nombre: "Presupuesto_Residencial_Norte_2024.xlsx",
    rutaArchivo: null,
    sizeBytes: 98304,
    aiConfianza: null,
  },
  {
    comunidadIdx: 4,
    docTypeId: "libro_actas",
    nombre: "Libro_Actas_Los_Pinos_2024.pdf",
    rutaArchivo: null,
    sizeBytes: 1048576,
    aiConfianza: 79,
  },
];

async function main() {
  console.log("Seeding database...");

  console.log("Wiping existing data...");
  await prisma.documento.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.alerta.deleteMany();
  await prisma.operativa.deleteMany();
  await prisma.comunidad.deleteMany();
  await prisma.user.deleteMany();
  console.log("Existing data wiped.");

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

  const createdComunidades: { id: string }[] = [];

  for (let i = 0; i < COMUNIDADES_INIT.length; i++) {
    const comunidadData = COMUNIDADES_INIT[i];
    const { operativa, ...comunidad } = comunidadData;
    const checklistItems = genChecklist(i);

    const created = await prisma.comunidad.create({
      data: {
        ...comunidad,
        operativa: {
          create: operativa,
        },
        checklists: {
          createMany: {
            data: checklistItems,
          },
        },
      },
    });

    createdComunidades.push(created);
    console.log(`Created comunidad: ${created.id} - ${comunidad.nombre}`);
  }

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
