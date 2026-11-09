import type { ProjectRepository } from '../../infrastructure/repositories/project-repository';
import type { PacDocumentRepository } from '../../infrastructure/repositories/pac-repository';
import type { ObservationRepository } from '../../infrastructure/repositories/observation-repository';
import type { NoteRepository } from '../../infrastructure/repositories/note-repository';
import type { TimelineRepository } from '../../infrastructure/repositories/timeline-repository';
import type { CatalogRepository } from '../../infrastructure/repositories/catalog-repository';
import type { SeiaGateway } from '../ports/seia-gateway';
import type { Catalog } from '../../domain/common/catalog';
import type { DashboardStats } from '../../domain/report/dashboard-stats';
import type { ProjectSummary } from '../../domain/project/project';
import { toProjectSummary } from '../../domain/project/project';
import type {
  ObservationFilters,
  ProjectDetail,
  ProjectFilters,
} from '../../shared/filters';
import type { Logger } from '../../shared/logger';

export class ListProjectsQuery {
  constructor(private readonly projects: ProjectRepository) {}

  async execute(filters: ProjectFilters): Promise<ProjectSummary[]> {
    return this.projects.list(filters);
  }
}

export class GetProjectDetailQuery {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly pacDocuments: PacDocumentRepository,
    private readonly observations: ObservationRepository,
    private readonly notes: NoteRepository,
    private readonly timelines: TimelineRepository,
  ) {}

  async execute(projectId: string): Promise<ProjectDetail> {
    const project = await this.projects.getOrThrow(projectId);
    const [pac, observations, timeline, notes] = await Promise.all([
      this.pacDocuments.list(projectId),
      this.observations.list({ projectId }),
      this.timelines.get(projectId),
      this.notes.list(projectId),
    ]);
    return { project, pac, observations, timeline, notes };
  }
}

export class ListObservationsQuery {
  constructor(private readonly observations: ObservationRepository) {}

  async execute(filters: ObservationFilters) {
    return this.observations.list(filters);
  }
}

export class ListNotesQuery {
  constructor(private readonly notes: NoteRepository) {}

  async execute(projectId: string) {
    return this.notes.list(projectId);
  }
}

export class GetTimelineQuery {
  constructor(private readonly timelines: TimelineRepository) {}

  async execute(projectId: string) {
    return this.timelines.get(projectId);
  }
}

export class DashboardStatsQuery {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly observations: ObservationRepository,
  ) {}

  async execute(): Promise<DashboardStats> {
    const [projects, observations] = await Promise.all([
      this.projects.all(),
      this.observations.all(),
    ]);

    const byRegion = countBy(projects.map((project) => project.location.region));
    const byStatus = countBy(projects.map((project) => project.status));
    const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

    return {
      totalProjects: projects.length,
      criticalProjects: projects.filter((project) => project.tracking.critical).length,
      favoriteProjects: projects.filter((project) => project.tracking.favorite).length,
      followedProjects: projects.filter((project) => project.tracking.followed).length,
      projectsWithPac: projects.filter(
        (project) => project.pac.enabled || project.pac.recordsTotal > 0,
      ).length,
      observationsTotal: observations.length,
      newObservations7d: observations.filter((observation) => observation.date >= cutoff).length,
      byRegion: toChartPoints(byRegion),
      byStatus: toChartPoints(byStatus),
      observationsByMonth: observationsByMonth(observations.map((item) => item.date)),
      recentProjects: [...projects]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 8)
        .map(toProjectSummary),
    };
  }
}

export class CatalogQuery {
  constructor(
    private readonly catalogs: CatalogRepository,
    private readonly gateway: SeiaGateway,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<Catalog> {
    const current = await this.catalogs.get();
    if (current.regions.length > 0) return current;

    try {
      const catalog = await this.gateway.getCatalog();
      return await this.catalogs.save(catalog);
    } catch (error) {
      this.logger.warn('No fue posible cargar catálogos de SEIA', {
        error: error instanceof Error ? error.message : String(error),
      });
      return current;
    }
  }
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value || 'Sin dato';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function toChartPoints(counts: Map<string, number>): Array<{ label: string; value: number }> {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

function observationsByMonth(dates: string[]): Array<{ month: string; value: number }> {
  const now = new Date();
  const months: Array<{ month: string; value: number }> = [];
  const keys: string[] = [];

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    keys.push(key);
    months.push({ month: key, value: 0 });
  }

  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = date.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return months.map((point) => ({ ...point, value: counts.get(point.month) ?? 0 }));
}
