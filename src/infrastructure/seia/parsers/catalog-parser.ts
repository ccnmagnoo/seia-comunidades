import { runInNewContext } from 'node:vm';
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Catalog, CatalogOption, CommuneOption } from '../../../domain/common/catalog';
import { SeiaError } from '../../../shared/errors';

interface RawRegion {
  NombreRegion?: string;
  IdRegion?: string | number;
  comunas?: Array<{ NombreComuna?: string; IdComuna?: string | number }>;
}

export function parseCatalog(html: string): Catalog {
  const $ = load(html);
  const regionsData = extractRegionsAndCommunes(html);

  const regions: CatalogOption[] = [];
  const communes: CommuneOption[] = [];
  const seenRegions = new Set<string>();
  const seenCommunes = new Set<string>();

  for (const region of regionsData) {
    const regionId = stringValue(region.IdRegion);
    const regionName = stringValue(region.NombreRegion);
    if (!regionId || !regionName) continue;
    if (!seenRegions.has(regionId)) {
      regions.push({ id: regionId, name: regionName });
      seenRegions.add(regionId);
    }
    for (const commune of region.comunas ?? []) {
      const communeId = stringValue(commune.IdComuna);
      const communeName = stringValue(commune.NombreComuna);
      if (!communeId || !communeName) continue;
      const key = `${regionId}:${communeId}`;
      if (seenCommunes.has(key)) continue;
      seenCommunes.add(key);
      communes.push({ id: communeId, name: communeName, regionId });
    }
  }

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    regions: regions.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    communes: communes.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    sectors: readOptions($, '#productiveSector', 'sectores_economicos'),
    statuses: readOptions($, '#projectStatus', 'projectStatus'),
    reasons: readOptions($, '#reasonAdmission', 'razoningreso'),
    expedienteTypes: readOptions($, '#fileType', 'id_tipoexpediente'),
  };
}

function extractRegionsAndCommunes(html: string): RawRegion[] {
  const marker = 'RegionesYcomunas';
  let searchIndex = 0;

  while (searchIndex < html.length) {
    const markerIndex = html.indexOf(marker, searchIndex);
    if (markerIndex === -1) break;
    const braceIndex = html.indexOf('{', markerIndex);
    if (braceIndex === -1) break;
    const end = findMatchingBrace(html, braceIndex);
    if (end > braceIndex) {
      const candidate = html.slice(braceIndex, end + 1);
      if (candidate.includes('regiones')) {
        try {
          const parsed = runInNewContext(`(${candidate})`, {}, { timeout: 2_000 }) as {
            regiones?: RawRegion[];
          };
          if (Array.isArray(parsed.regiones) && parsed.regiones.length > 0) {
            return parsed.regiones;
          }
        } catch {
          // Intentar con la siguiente ocurrencia.
        }
      }
    }
    searchIndex = markerIndex + marker.length;
  }

  throw new SeiaError('No fue posible extraer regiones y comunas desde el buscador SEIA.');
}

function findMatchingBrace(value: string, start: number): number {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (inString) {
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function readOptions(
  $: CheerioAPI,
  selector: string,
  name: string,
): CatalogOption[] {
  let select = $(selector).first();
  if (select.length === 0) {
    select = $(`select[name="${name}[]"]`).first();
  }
  if (select.length === 0) {
    select = $(`select[name="${name}"]`).first();
  }
  if (select.length === 0) {
    select = $('select')
      .toArray()
      .map((element) => $(element))
      .find((candidate) => (candidate.attr('name') ?? '').includes(name)) ?? $([]);
  }

  const options: CatalogOption[] = [];
  select.find('option').each((_, option) => {
    const value = ($(option).attr('value') ?? '').trim();
    const text = ($(option).text() ?? '').trim();
    if (value && text) options.push({ id: value, name: text });
  });
  return options;
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}
