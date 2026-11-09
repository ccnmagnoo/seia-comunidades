import type {
  DocumentContent,
  EvaluationSchedule,
  PacDocumentRecord,
  ProjectSearchPage,
  ProjectSheet,
  Recipient,
  SeiaGateway,
} from '../../application/ports/seia-gateway';
import type { Catalog } from '../../domain/common/catalog';
import type { SearchCriteria } from '../../shared/filters';
import type { SeiaConfig } from '../../app/config';
import type { Logger } from '../../shared/logger';
import { SeiaError } from '../../shared/errors';
import type { SeiaHttpClient } from './http-client';
import { parseSearchResponse } from './parsers/search-parser';
import { parseProjectSheet } from './parsers/ficha-parser';
import { parsePacDocuments } from './parsers/pac-parser';
import { parseDocumentContent } from './parsers/document-parser';
import { parseRecipients } from './parsers/recipients-parser';
import { parseSchedule } from './parsers/schedule-parser';
import { parseCatalog } from './parsers/catalog-parser';

export interface GatewayOptions {
  forceRefresh?: boolean;
}

export class SeiaGatewayAdapter implements SeiaGateway {
  constructor(
    private readonly config: SeiaConfig,
    private readonly client: SeiaHttpClient,
    private readonly logger: Logger,
  ) {}

  async searchProjects(
    criteria: SearchCriteria,
    options: GatewayOptions = {},
  ): Promise<ProjectSearchPage> {
    const body = buildSearchBody(criteria);
    const response = await this.client.request(this.config.endpoints.projects, {
      method: 'POST',
      body,
      category: 'projects',
      ttlHours: this.config.cacheTtlHours.projects,
      forceRefresh: options.forceRefresh,
      accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
    });

    if (response.status >= 400) {
      throw new SeiaError('El buscador de SEIA respondió con error.', {
        status: response.status,
        snippet: response.text.slice(0, 240),
      });
    }

    const page = parseSearchResponse(response.text, this.config.baseUrl);
    this.logger.info('Búsqueda SEIA completada', {
      results: page.results.length,
      total: page.total,
      fromCache: response.fromCache,
    });
    return page;
  }

  async getProjectSheet(
    projectId: string,
    options: GatewayOptions = {},
  ): Promise<ProjectSheet> {
    const response = await this.client.request(
      `${this.config.endpoints.projectSheet}?modo=ficha&id_expediente=${encodeURIComponent(projectId)}`,
      {
        category: 'documents',
        ttlHours: this.config.cacheTtlHours.projects,
        forceRefresh: options.forceRefresh,
      },
    );
    if (response.status >= 400) {
      throw new SeiaError('No fue posible obtener la ficha del proyecto.', {
        projectId,
        status: response.status,
      });
    }
    return parseProjectSheet(response.text);
  }

  async getPacDocuments(
    projectId: string,
    options: GatewayOptions = {},
  ): Promise<PacDocumentRecord[]> {
    const response = await this.client.request(
      `${this.config.endpoints.pacDocuments}?incluyePac=2&id_expediente=${encodeURIComponent(projectId)}`,
      {
        category: 'pac',
        ttlHours: this.config.cacheTtlHours.pac,
        forceRefresh: options.forceRefresh,
      },
    );
    if (response.status >= 400) {
      throw new SeiaError('No fue posible obtener los documentos PAC.', {
        projectId,
        status: response.status,
      });
    }
    return parsePacDocuments(response.text, this.config.baseUrl);
  }

  async getDocumentContent(
    url: string,
    options: GatewayOptions = {},
  ): Promise<DocumentContent> {
    if (!url) throw new SeiaError('Documento sin URL.');
    const response = await this.client.request(url, {
      category: 'documents',
      ttlHours: this.config.cacheTtlHours.documents,
      forceRefresh: options.forceRefresh,
    });
    if (response.status >= 400) {
      throw new SeiaError('No fue posible obtener el contenido del documento.', {
        url,
        status: response.status,
      });
    }
    return parseDocumentContent(response.text);
  }

  async getDocumentRecipients(url: string): Promise<Recipient[]> {
    if (!url) return [];
    const response = await this.client.request(url, {
      category: 'documents',
      ttlHours: this.config.cacheTtlHours.documents,
    });
    if (response.status >= 400) return [];
    return parseRecipients(response.text);
  }

  async getSchedule(projectId: string): Promise<EvaluationSchedule> {
    const response = await this.client.request(
      `${this.config.endpoints.schedule}?modo=ficha&id_expediente=${encodeURIComponent(projectId)}`,
      {
        category: 'pac',
        ttlHours: this.config.cacheTtlHours.pac,
      },
    );
    if (response.status >= 400) {
      throw new SeiaError('No fue posible obtener los plazos del proyecto.', {
        projectId,
        status: response.status,
      });
    }
    return parseSchedule(response.text);
  }

  async getCatalog(): Promise<Catalog> {
    const response = await this.client.request(this.config.endpoints.searchPage, {
      category: 'catalogs',
      ttlHours: 24 * 7,
    });
    if (response.status >= 400) {
      throw new SeiaError('No fue posible obtener los catálogos de SEIA.', {
        status: response.status,
      });
    }
    return parseCatalog(response.text);
  }
}

export function buildSearchBody(criteria: SearchCriteria): URLSearchParams {
  return new URLSearchParams({
    nombre: criteria.name ?? '',
    titular: criteria.owner ?? '',
    selectRegion: (criteria.regionIds ?? []).join(','),
    selectComuna: (criteria.communeIds ?? []).join(','),
    tipoPresentacion: criteria.presentationType ?? '',
    projectStatus: (criteria.statusIds ?? []).join(','),
    PresentacionMin: criteria.presentationFrom ?? '',
    PresentacionMax: criteria.presentationTo ?? '',
    CalificaMin: criteria.investmentMin ?? '',
    CalificaMax: criteria.investmentMax ?? '',
    sectores_economicos: (criteria.sectorIds ?? []).join(','),
    razoningreso: (criteria.reasonIds ?? []).join(','),
    id_tipoexpediente: (criteria.expedienteTypeIds ?? []).join(','),
    offset: String(criteria.offset ?? 1),
    limit: String(criteria.limit ?? 50),
    orderColumn: criteria.orderColumn ?? 'FECHA_PRESENTACION',
    orderDir: criteria.orderDir ?? 'desc',
  });
}
