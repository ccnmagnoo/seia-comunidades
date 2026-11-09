import { join } from 'node:path';
import type { Project, ProjectSummary } from '../../domain/project/project';
import type { ProjectFilters, TrackingPatch } from '../../shared/filters';
import { NotFoundError } from '../../shared/errors';
import type { WorkspacePaths } from '../../app/config';
import { Mutex, nowIso, safeSegment, TomlStore } from './toml-store';
import {
  fromProjectToml,
  ProjectIndexTomlSchema,
  ProjectTomlSchema,
  toProjectSummary,
  toProjectToml,
} from './toml-mappers';
import type { ProjectIndexToml } from './toml-mappers';

const INDEX_KEY = 'project-index';

export class ProjectRepository {
  private readonly mutex = new Mutex();

  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private projectPath(id: string): string {
    return join(this.paths.projects, `${safeSegment(id)}.toml`);
  }

  private indexFilePath(): string {
    return join(this.paths.indexes, 'projects.toml');
  }

  async get(id: string): Promise<Project | null> {
    const toml = await this.store.read(this.projectPath(id), ProjectTomlSchema);
    return toml ? fromProjectToml(toml) : null;
  }

  async getOrThrow(id: string): Promise<Project> {
    const project = await this.get(id);
    if (!project) throw new NotFoundError(`Proyecto ${id} no encontrado`);
    return project;
  }

  async save(project: Project): Promise<Project> {
    await this.store.write(this.projectPath(project.id), ProjectTomlSchema, toProjectToml(project));
    await this.ensureIndex();
    await this.mutex.run(INDEX_KEY, async () => {
      const index = (await this.readIndex()) ?? emptyIndex();
      const existing = index.projects.findIndex((item) => item.id === project.id);
      if (existing >= 0) index.projects[existing] = toProjectToml(project);
      else index.projects.push(toProjectToml(project));
      index.updated_at = nowIso();
      await this.store.write(this.indexFilePath(), ProjectIndexTomlSchema, index);
    });
    return project;
  }

  async updateTracking(id: string, patch: TrackingPatch): Promise<Project> {
    const project = await this.getOrThrow(id);
    const updated: Project = {
      ...project,
      tracking: {
        favorite: patch.favorite ?? project.tracking.favorite,
        critical: patch.critical ?? project.tracking.critical,
        followed: patch.followed ?? project.tracking.followed,
        tags: patch.tags ?? project.tracking.tags,
      },
      updatedAt: nowIso(),
    };
    await this.save(updated);
    return updated;
  }

  async list(filters: ProjectFilters = {}): Promise<ProjectSummary[]> {
    const index = await this.ensureIndex();
    let items = index.projects.map((toml) => toProjectSummary(fromProjectToml(toml)));

    if (filters.text) {
      const needle = filters.text.toLowerCase();
      items = items.filter((project) =>
        [
          project.name,
          project.shortName,
          project.owner.name,
          project.location.region,
          project.location.commune,
          project.status,
          project.workflow,
          ...project.tracking.tags,
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }
    if (filters.region) items = items.filter((project) => project.location.region === filters.region);
    if (filters.status) items = items.filter((project) => project.status === filters.status);
    if (filters.workflow) items = items.filter((project) => project.workflow === filters.workflow);
    if (filters.critical !== undefined) {
      items = items.filter((project) => project.tracking.critical === filters.critical);
    }
    if (filters.favorite !== undefined) {
      items = items.filter((project) => project.tracking.favorite === filters.favorite);
    }
    if (filters.followed !== undefined) {
      items = items.filter((project) => project.tracking.followed === filters.followed);
    }
    if (filters.hasPac !== undefined) {
      items = items.filter((project) => project.pac.enabled === filters.hasPac);
    }

    items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 100;
    return items.slice(offset, offset + limit);
  }

  async all(): Promise<Project[]> {
    const index = await this.ensureIndex();
    return index.projects.map((toml) => fromProjectToml(toml));
  }

  async rebuildIndex(): Promise<ProjectIndexToml> {
    return this.mutex.run(INDEX_KEY, () => this.rebuildIndexUnlocked());
  }

  private async ensureIndex(): Promise<ProjectIndexToml> {
    const existing = await this.readIndex();
    if (existing) return existing;
    return this.rebuildIndex();
  }

  private async readIndex(): Promise<ProjectIndexToml | null> {
    return this.store.read(this.indexFilePath(), ProjectIndexTomlSchema);
  }

  private async rebuildIndexUnlocked(): Promise<ProjectIndexToml> {
    const ids = await this.store.listToml(this.paths.projects);
    const projects = [];
    for (const id of ids) {
      const toml = await this.store.read(this.projectPath(id), ProjectTomlSchema);
      if (toml) projects.push(toml);
    }
    const index: ProjectIndexToml = {
      schema_version: 1,
      updated_at: nowIso(),
      projects,
    };
    await this.store.write(this.indexFilePath(), ProjectIndexTomlSchema, index);
    return index;
  }
}

function emptyIndex(): ProjectIndexToml {
  return { schema_version: 1, updated_at: nowIso(), projects: [] };
}
