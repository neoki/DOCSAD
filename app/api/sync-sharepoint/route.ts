import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  listSharePointSites,
  listDrives,
  listFiles,
} from "@/lib/microsoft-graph";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sites = await listSharePointSites();
  if (!sites.length) {
    return NextResponse.json({ error: "No SharePoint sites found" }, { status: 404 });
  }

  let comunidadesFolder: { siteId: string; driveId: string; folderId: string } | null = null;

  for (const site of sites) {
    const drives = await listDrives(site.id);
    for (const drive of drives) {
      const rootItems = await listFiles(drive.id, "root");
      const folder = rootItems.find(
        (item) => item.isFolder && item.name.toLowerCase().includes("comunidades"),
      );
      if (folder) {
        comunidadesFolder = { siteId: site.id, driveId: drive.id, folderId: folder.id };
        break;
      }
    }
    if (comunidadesFolder) break;
  }

  if (!comunidadesFolder) {
    return NextResponse.json({ error: "No se encontró la carpeta 'Comunidades'" }, { status: 404 });
  }

  const communityFolders = await listFiles(comunidadesFolder.driveId, comunidadesFolder.folderId);
  const folders = communityFolders.filter((f) => f.isFolder);

  const allComunidades = await prisma.comunidad.findMany({
    select: { id: true, codigo: true, nombre: true, sharePointFolderId: true },
  });

  let linked = 0;
  let alreadyLinked = 0;
  let unmatched = 0;
  const results: { folder: string; codigo: string | null; status: string }[] = [];

  for (const folder of folders) {
    const codeMatch = folder.name.match(/^0*(\d+)\.\s*/);
    if (!codeMatch) {
      results.push({ folder: folder.name, codigo: null, status: "no_code_in_name" });
      unmatched++;
      continue;
    }

    const rawCode = codeMatch[1];
    const paddedCode = rawCode.padStart(6, "0");

    const comunidad = allComunidades.find((c) => c.codigo === paddedCode);
    if (!comunidad) {
      results.push({ folder: folder.name, codigo: paddedCode, status: "no_community_match" });
      unmatched++;
      continue;
    }

    if (comunidad.sharePointFolderId === folder.id) {
      results.push({ folder: folder.name, codigo: paddedCode, status: "already_linked" });
      alreadyLinked++;
      continue;
    }

    await prisma.comunidad.update({
      where: { id: comunidad.id },
      data: {
        sharePointSiteId: comunidadesFolder.siteId,
        sharePointDriveId: comunidadesFolder.driveId,
        sharePointFolderId: folder.id,
        sharePointFolderName: folder.name,
        sharePointMatchMethod: "CODIGO",
        sharePointMatchScore: 100,
      },
    });

    results.push({ folder: folder.name, codigo: paddedCode, status: "linked" });
    linked++;
  }

  const notLinked = allComunidades.filter(
    (c) => !c.sharePointFolderId && !results.find((r) => r.codigo === c.codigo && r.status === "linked"),
  );

  return NextResponse.json({
    summary: {
      totalFolders: folders.length,
      linked,
      alreadyLinked,
      unmatched,
      communitiesWithoutFolder: notLinked.length,
    },
    siteId: comunidadesFolder.siteId,
    driveId: comunidadesFolder.driveId,
    results,
    notLinked: notLinked.map((c) => ({ codigo: c.codigo, nombre: c.nombre })),
  });
}
