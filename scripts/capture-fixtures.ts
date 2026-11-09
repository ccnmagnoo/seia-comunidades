import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadAppConfig, ensureWorkspaceDirs, resolveWorkspacePaths } from '../src/app/config';
import { createLogger } from '../src/shared/logger';
import { HttpCache } from '../src/infrastructure/seia/http-cache';
import { SeiaHttpClient } from '../src/infrastructure/seia/http-client';
import { buildSearchBody } from '../src/infrastructure/seia/seia-gateway';
import { parseSearchResponse } from '../src/infrastructure/seia/parsers/search-parser';
import { parsePacDocuments } from '../src/infrastructure/seia/parsers/pac-parser';
import { parseCatalog } from '../src/infrastructure/seia/parsers/catalog-parser';
import { CatalogRepository } from '../src/infrastructure/repositories/catalog-repository';
import { TomlStore } from '../src/infrastructure/repositories/toml-store';

const root = process.cwd();
const fixturesDir = join(root, 'tests', 'fixtures', 'seia');

async function main(): Promise<void> {
  const config = loadAppConfig(root);
  const paths = resolveWorkspacePaths(root);
  ensureWorkspaceDirs(paths);
  await mkdir(fixturesDir, { recursive: true });

  const logger = createLogger({ level: 'info' });
  const client = new SeiaHttpClient({
    baseUrl: config.seia.baseUrl,
    userAgent: config.seia.userAgent,
    timeoutMs: config.seia.timeoutMs,
    maxRetries: config.seia.maxRetries,
    delayMs: config.seia.delayMs,
    cache: new HttpCache(paths.cache),
    logger,
  });

  console.log('→ Descargando catálogos…');
  const catalogPage = await client.request(config.seia.endpoints.searchPage, {
    category: 'catalogs',
    ttlHours: 24 * 7,
    forceRefresh: true,
  });
  await save('catalog-search.html', catalogPage.text);
  const catalog = parseCatalog(catalogPage.text);
  await new CatalogRepository(paths, new TomlStore()).save(catalog);
  console.log(
    `  catálogo: ${catalog.regions.length} regiones, ${catalog.communes.length} comunas, ${catalog.sectors.length} sectores`,
  );

  console.log('→ Buscando expedientes de energía en Valparaíso…');
  const search = await client.request(config.seia.endpoints.projects, {
    method: 'POST',
    body: buildSearchBody({
      regionIds: ['5'],
      sectorIds: ['7'],
      statusIds: ['3'],
      limit: 10,
      offset: 1,
    }),
    category: 'projects',
    ttlHours: 24,
    forceRefresh: true,
    accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  });
  await save('search-valparaiso-energy.json', search.text);
  const page = parseSearchResponse(search.text, config.seia.baseUrl);
  const project = page.results[0];
  if (!project) {
    console.warn('No se encontraron proyectos para el fixture.');
    return;
  }
  console.log(`  proyecto: ${project.expedienteId} · ${project.name}`);

  console.log('→ Descargando ficha…');
  const sheet = await client.request(project.sheetUrl, {
    category: 'documents',
    ttlHours: 24,
    forceRefresh: true,
  });
  await save(`ficha-${project.expedienteId}.html`, sheet.text);

  console.log('→ Descargando documentos PAC…');
  const pac = await client.request(
    `${config.seia.baseUrl}/expediente/xhr_documentos_pac.php?incluyePac=2&id_expediente=${project.expedienteId}`,
    { category: 'pac', ttlHours: 6, forceRefresh: true },
  );
  await save(`pac-${project.expedienteId}.html`, pac.text);
  const documents = parsePacDocuments(pac.text, config.seia.baseUrl);
  console.log(`  ${documents.length} documentos PAC`);

  const htmlDocument = documents.find((document) => document.contentType === 'html');
  if (htmlDocument) {
    console.log(`→ Descargando contenido de ${htmlDocument.id}…`);
    const content = await client.request(htmlDocument.link, {
      category: 'documents',
      ttlHours: 12,
      forceRefresh: true,
    });
    await save(`document-${htmlDocument.id}.html`, content.text);
  }

  const recipientDocument = documents.find((document) => document.recipientsUrl);
  if (recipientDocument?.recipientsUrl) {
    console.log(`→ Descargando destinatarios de ${recipientDocument.id}…`);
    const recipients = await client.request(recipientDocument.recipientsUrl, {
      category: 'documents',
      ttlHours: 12,
      forceRefresh: true,
    });
    await save(`recipients-${recipientDocument.id}.html`, recipients.text);
  }

  await save(
    'manifest.json',
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        projectId: project.expedienteId,
        projectName: project.name,
        documents: documents.length,
        htmlDocumentId: htmlDocument?.id,
        recipientDocumentId: recipientDocument?.id,
        catalog: {
          regions: catalog.regions.length,
          communes: catalog.communes.length,
          sectors: catalog.sectors.length,
        },
      },
      null,
      2,
    ),
  );

  console.log(`✓ Fixtures guardados en ${fixturesDir}`);
}

async function save(name: string, content: string): Promise<void> {
  await writeFile(join(fixturesDir, name), content, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
