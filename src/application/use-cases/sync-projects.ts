import type { SeiaGateway } from '../ports/seia-gateway';
import type { ProjectRepository } from '../../infrastructure/repositories/project-repository';
import type { EventBus } from '../../shared/events';
import type { Logger } from '../../shared/logger';
import type { SearchCriteria, SyncProgress, SyncSearchResult } from '../../shared/filters';
import { mapSearchResultToProject } from '../mappers/project-mapper';

export class SyncProjectsUseCase {
  constructor(
    private readonly gateway: SeiaGateway,
    private readonly projects: ProjectRepository,
    private readonly bus: EventBus,
    private readonly logger: Logger,
  ) {}

  async execute(
    criteria: SearchCriteria,
    onProgress?: (progress: SyncProgress) => void,
  ): Promise<SyncSearchResult> {
    onProgress?.({ phase: 'searching', message: 'Consultando el buscador del SEIA…' });

    const page = await this.gateway.searchProjects(criteria, { forceRefresh: true });
    const warnings: string[] = [];

    if (page.total > page.results.length) {
      warnings.push(
        `El portal reporta ${page.total} proyectos y se recibieron ${page.results.length}. Ajusta los filtros o el límite para importar el resto.`,
      );
    }

    onProgress?.({
      phase: 'saving_projects',
      message: `Guardando ${page.results.length} proyectos…`,
      current: 0,
      total: page.results.length,
    });

    let created = 0;
    let updated = 0;
    let index = 0;

    for (const result of page.results) {
      index += 1;
      try {
        const existing = await this.projects.get(result.expedienteId);
        const project = mapSearchResultToProject(
          result,
          existing,
          new Date().toISOString(),
        );
        await this.projects.save(project);
        await this.bus.emit('PROJECT_UPSERTED', { project, created: existing === null });
        if (existing) updated += 1;
        else created += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error('Error guardando proyecto SEIA', {
          projectId: result.expedienteId,
          error: message,
        });
        warnings.push(`No fue posible guardar ${result.expedienteId}: ${message}`);
      }

      onProgress?.({
        phase: 'saving_projects',
        message: `Guardando proyectos (${index}/${page.results.length})…`,
        current: index,
        total: page.results.length,
        projectId: result.expedienteId,
      });
    }

    await this.bus.emit('DATA_CHANGED', { reason: 'projects-sync' });
    onProgress?.({
      phase: 'finished',
      message: `Sincronización terminada: ${created} nuevos, ${updated} actualizados.`,
      current: index,
      total: page.results.length,
    });

    return {
      fetched: page.results.length,
      created,
      updated,
      totalReported: page.total,
      warnings,
    };
  }
}
