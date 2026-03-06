-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "EstadoChecklist" AS ENUM ('COMPLETADO', 'PENDIENTE', 'NO_APLICA');

-- CreateEnum
CREATE TYPE "Urgencia" AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAJA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunidades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "pisos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comunidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operativas" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "usaAgreGasfincas" BOOLEAN NOT NULL DEFAULT false,
    "somosCorredorSeguro" BOOLEAN NOT NULL DEFAULT false,
    "corredorSeguroNombre" TEXT,
    "numeroPolizaSeguro" TEXT,
    "usaNuevoSistemaIncidencias" BOOLEAN NOT NULL DEFAULT false,
    "tieneAppTuComunidad" BOOLEAN NOT NULL DEFAULT false,
    "tienePortero" BOOLEAN NOT NULL DEFAULT false,
    "tieneConserje" BOOLEAN NOT NULL DEFAULT false,
    "tieneGarajista" BOOLEAN NOT NULL DEFAULT false,
    "tieneLimpiadora" BOOLEAN NOT NULL DEFAULT false,
    "tieneOtroPersonal" BOOLEAN NOT NULL DEFAULT false,
    "descripcionOtroPersonal" TEXT,
    "tieneVideovigilancia" BOOLEAN NOT NULL DEFAULT false,
    "actuaComoArrendadora" BOOLEAN NOT NULL DEFAULT false,
    "activoArrendadoDescripcion" TEXT,
    "gestionaConsumos" BOOLEAN NOT NULL DEFAULT false,
    "empresaGestionConsumos" TEXT,
    "gestionaPermisosGasoleo" BOOLEAN NOT NULL DEFAULT false,
    "reformaFontaneria" BOOLEAN NOT NULL DEFAULT false,
    "fechaReformaFontaneria" TIMESTAMP(3),
    "reformaSaneamiento" BOOLEAN NOT NULL DEFAULT false,
    "fechaReformaSaneamiento" TIMESTAMP(3),
    "reformaElectricidad" BOOLEAN NOT NULL DEFAULT false,
    "fechaReformaElectricidad" TIMESTAMP(3),
    "obligadaITE" BOOLEAN NOT NULL DEFAULT false,
    "fechaProximaITE" TIMESTAMP(3),

    CONSTRAINT "operativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "docTypeId" TEXT NOT NULL,
    "estado" "EstadoChecklist" NOT NULL DEFAULT 'PENDIENTE',
    "fecha" TIMESTAMP(3),
    "observaciones" TEXT NOT NULL DEFAULT '',
    "justificacion" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "docTypeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rutaArchivo" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "aiConfianza" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "urgencia" "Urgencia" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "descartada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "operativas_comunidadId_key" ON "operativas"("comunidadId");

-- CreateIndex
CREATE UNIQUE INDEX "checklists_comunidadId_docTypeId_key" ON "checklists"("comunidadId", "docTypeId");

-- AddForeignKey
ALTER TABLE "operativas" ADD CONSTRAINT "operativas_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "comunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
