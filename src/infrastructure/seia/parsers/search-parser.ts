import { toIsoDay } from '../../../domain/common/dates';
import { SeiaError } from '../../../shared/errors';
import type { ProjectSearchPage, ProjectSearchResult } from '../../../application/ports/seia-gateway';

interface RawMapLink {
  SHOW?: boolean;
  URL?: string;
  IMAGE?: string;
}

interface RawProject {
  EXPEDIENTE_ID?: string | number;
  EXPEDIENTE_NOMBRE?: string;
  EXPEDIENTE_URL_PPAL?: string;
  EXPEDIENTE_URL_FICHA?: string;
  WORKFLOW_DESCRIPCION?: string;
  REGION_NOMBRE?: string;
  COMUNA_NOMBRE?: string;
  TIPO_PROYECTO?: string;
  DESCRIPCION_TIPOLOGIA?: string;
  RAZON_INGRESO?: string;
  TITULAR?: string;
  INVERSION_MM?: string | number;
  FECHA_PRESENTACION_FORMAT?: string;
  ESTADO_PROYECTO?: string;
  SUSPENDIDO?: string;
  DIAS_LEGALES?: string | number;
  LINK_MAPA?: RawMapLink | string;
}

interface RawSearchResponse {
  data?: RawProject[];
  totalRegistros?: number;
  recordsTotal?: number;
  pages?: number | null;
}

export function parseSearchResponse(
  text: string,
  baseUrl: string,
): ProjectSearchPage {
  let raw: RawSearchResponse;
  try {
    raw = JSON.parse(text) as RawSearchResponse;
  } catch (error) {
    throw new SeiaError(
      'El buscador de SEIA no devolvió JSON válido.',
      { snippet: text.slice(0, 240), error: error instanceof Error ? error.message : String(error) },
    );
  }

  if (!Array.isArray(raw.data)) {
    throw new SeiaError('El buscador de SEIA no devolvió una lista de proyectos.', {
      snippet: text.slice(0, 240),
    });
  }

  const results = raw.data
    .map((item) => mapProject(item, baseUrl))
    .filter((item): item is ProjectSearchResult => item !== null);

  const total = Math.max(
    numberOr(raw.totalRegistros, numberOr(raw.recordsTotal, results.length)),
    results.length,
  );

  return { results, total };
}

function mapProject(item: RawProject, baseUrl: string): ProjectSearchResult | null {
  const id = item.EXPEDIENTE_ID === undefined ? '' : String(item.EXPEDIENTE_ID);
  if (!id) return null;

  const mapLink = typeof item.LINK_MAPA === 'object' ? item.LINK_MAPA : undefined;
  const mapUrl = mapLink?.URL ? absolute(mapLink.URL, baseUrl) : undefined;
  const mapStatus = mapLink?.IMAGE ? mapLink.IMAGE.split('.')[0] : undefined;

  return {
    expedienteId: id,
    name: stringOr(item.EXPEDIENTE_NOMBRE, `Expediente ${id}`),
    workflow: stringOr(item.WORKFLOW_DESCRIPCION, 'OTRO'),
    region: stringOr(item.REGION_NOMBRE, 'Sin región'),
    commune: stringOr(item.COMUNA_NOMBRE, 'Sin comuna'),
    typology: stringOr(item.TIPO_PROYECTO, ''),
    typologyDescription: stringOr(item.DESCRIPCION_TIPOLOGIA, ''),
    reason: stringOr(item.RAZON_INGRESO, ''),
    owner: stringOr(item.TITULAR, ''),
    investmentMM: numberOrUndefined(item.INVERSION_MM),
    presentationDate: toIsoDay(stringOr(item.FECHA_PRESENTACION_FORMAT, '')),
    status: stringOr(item.ESTADO_PROYECTO, 'Sin estado'),
    suspended: item.SUSPENDIDO === 'Suspendido',
    legalDays: numberOrUndefined(item.DIAS_LEGALES),
    mapUrl,
    mapStatus,
    sheetUrl: stringOr(
      item.EXPEDIENTE_URL_FICHA,
      `${baseUrl}/expediente/ficha/fichaPrincipal.php?modo=ficha&id_expediente=${id}`,
    ),
    dossierUrl: `${baseUrl}/expediente/xhr_expediente.php?incluyePac=1&id_expediente=${id}`,
    pacUrl: `${baseUrl}/expediente/xhr_documentos_pac.php?incluyePac=2&id_expediente=${id}`,
  };
}

function absolute(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function stringOr(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return fallback;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function numberOr(value: unknown, fallback: number): number {
  return numberOrUndefined(value) ?? fallback;
}
