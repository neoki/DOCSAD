import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type GesfincasEntry = {
  codigo: string;
  id_persona: string;
  nif: string;
  nombre: string;
  direccion: string;
  cp: string;
  carpeta_onedrive: string | null;
};

async function main() {
  const hashedPassword = await bcrypt.hash("Admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@asesoriadiaz.com" },
    update: {},
    create: {
      email: "admin@asesoriadiaz.com",
      name: "Administrador",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user created/verified");

  const rawData = readFileSync(join(__dirname, "comunidades-gesfincas.json"), "utf8");
  const comunidades: GesfincasEntry[] = JSON.parse(rawData);

  console.log(`Importing ${comunidades.length} communities from Gesfincas...`);

  let created = 0;
  let skipped = 0;

  for (const c of comunidades) {
    const existing = await prisma.comunidad.findUnique({
      where: { codigo: c.codigo },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.comunidad.create({
      data: {
        codigo: c.codigo,
        idPersona: c.id_persona,
        nombre: c.nombre,
        nif: c.nif,
        direccion: c.direccion,
        cp: c.cp,
        pisos: 0,
        sharePointFolderName: c.carpeta_onedrive || null,
      },
    });
    created++;
  }

  console.log(`Done: ${created} created, ${skipped} skipped (already existed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
