import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSearchResponse } from '../src/infrastructure/seia/parsers/search-parser';
import { parsePacDocuments } from '../src/infrastructure/seia/parsers/pac-parser';
import { parseCatalog } from '../src/infrastructure/seia/parsers/catalog-parser';
import { parseProjectSheet } from '../src/infrastructure/seia/parsers/ficha-parser';
import { parseDocumentContent } from '../src/infrastructure/seia/parsers/document-parser';
import { parseRecipients } from '../src/infrastructure/seia/parsers/recipients-parser';
import { parseSchedule } from '../src/infrastructure/seia/parsers/schedule-parser';
import { classifyDocumentTitle } from '../src/domain/pac/classify-document';
import { classifyObservation } from '../src/domain/observation/classify-observation';

const fixtures = join(process.cwd(), 'tests', 'fixtures', 'seia');
const baseUrl = 'https://seia.sea.gob.cl';

function fixture(name: string): string {
  return readFileSync(join(fixtures, name), 'utf8');
}

describe('parseSearchResponse', () => {
  it('mapea el JSON latin-1 del buscador', () => {
    const page = parseSearchResponse(fixture('search-valparaiso-energy.json'), baseUrl);

    expect(page.results).toHaveLength(10);
    expect(page.total).toBe(11);
    const first = page.results[0];
    expect(first?.expedienteId).toBe('2169365813');
    expect(first?.name).toContain('Versalles II');
    expect(first?.region).toContain('Valparaíso');
    expect(first?.workflow).toBe('DIA');
    expect(first?.presentationDate).toBe('2026-08-21');
    expect(first?.sheetUrl).toContain('modo=ficha');
    expect(first?.pacUrl).toContain('xhr_documentos_pac.php');
    expect(first?.investmentMM).toBeGreaterThan(0);
  });
});

describe('parsePacDocuments', () => {
  it('extrae la tabla de 8 celdas del portal actual', () => {
    const documents = parsePacDocuments(fixture('pac-2169365813.html'), baseUrl);

    expect(documents).toHaveLength(6);
    const first = documents[0];
    expect(first?.title).toBe('Notificación de documento');
    expect(first?.kind).toBe('notificacion');
    expect(first?.recipientsCount).toBe(3);
    expect(first?.contentType).toBe('html');
    expect(first?.recordDate).toBe('2026-08-21T15:57:44');
    expect(first?.link).toContain('documento.php?idDocumento=');
    expect(first?.id).toMatch(/^\d+$/);
  });
});

describe('parseCatalog', () => {
  it('extrae regiones, comunas y filtros', () => {
    const catalog = parseCatalog(fixture('catalog-search.html'));

    expect(catalog.regions.length).toBeGreaterThanOrEqual(16);
    expect(catalog.communes.length).toBeGreaterThan(600);
    expect(catalog.regions.some((region) => region.id === '5')).toBe(true);
    expect(catalog.sectors.some((sector) => sector.name === 'Energía')).toBe(true);
    expect(catalog.statuses.some((status) => status.name === 'En Calificación')).toBe(true);
    const valparaiso = catalog.communes.filter((commune) => commune.regionId === '5');
    expect(valparaiso.length).toBeGreaterThan(30);
  });
});

describe('parseProjectSheet', () => {
  it('extrae la descripción de la ficha', () => {
    const sheet = parseProjectSheet(fixture('ficha-2169365813.html'));
    expect(sheet.description?.toLowerCase()).toContain('fotovoltaica');
    expect((sheet.description?.length ?? 0) > 100).toBe(true);
  });
});

describe('parseDocumentContent', () => {
  it('limpia el HTML de infofirma y elimina el pie de firma', () => {
    const content = parseDocumentContent(fixture('document-2169407570.html'));
    expect(content.content).toContain('Resolución de Admisibilidad');
    expect(content.content).not.toContain('Firmas Electrónicas');
    expect(content.content).not.toContain('El documento original');
    expect(content.content).toContain('artículo 162');
  });
});

describe('parseRecipients', () => {
  it('extrae destinatarios desde la tabla del portal', () => {
    const recipients = parseRecipients(fixture('recipients-2169407570.html'));
    expect(recipients.length).toBeGreaterThan(0);
    expect(recipients.every((recipient) => recipient.name.length > 2)).toBe(true);
  });
});

describe('parseSchedule', () => {
  it('no falla con el HTML de plazos', () => {
    const schedule = parseSchedule(fixture('ficha-2169365813.html'));
    expect(schedule.status).toMatch(/active|suspended|expired/);
    expect(schedule.legalDays).toBeGreaterThanOrEqual(0);
  });
});

describe('classifyDocumentTitle', () => {
  it.each([
    ['Inicio de PAC', 'solicitud_pac'],
    ['Observación Ciudadana', 'observacion'],
    ['Informe Consolidado de la Evaluación', 'informe'],
    ['Resolución de Calificación Ambiental', 'resolucion'],
    ['Registro de publicación en Diario Oficial', 'registro'],
    ['Notificación de documento', 'notificacion'],
    ['Acreditación aviso radial', 'acreditacion'],
    ['Certificado de algo', 'otro'],
  ])('clasifica %s como %s', (title, expected) => {
    expect(classifyDocumentTitle(title)).toBe(expected);
  });
});

describe('classifyObservation', () => {
  it('detecta la categoría dominante y el sentimiento', () => {
    const result = classifyObservation(
      'El turismo, los turistas y la actividad turística se verán afectados. También el paisaje y el impacto visual.',
    );
    expect(result.category).toBe('Turismo');
    expect(result.sentiment).toBe('negative');
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('detecta agua y sentimiento positivo', () => {
    const result = classifyObservation(
      'Apoyo al proyecto porque mejora el agua del estero y el acuífero, un beneficio para la comunidad.',
    );
    expect(result.category).toBe('Agua');
    expect(result.sentiment).toBe('positive');
  });

  it('usa Sin clasificar cuando no hay señales', () => {
    const result = classifyObservation('Texto genérico sin palabras clave.');
    expect(result.category).toBe('Sin clasificar');
  });
});
