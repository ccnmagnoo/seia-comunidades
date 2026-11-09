import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Observation } from '../../domain/observation/observation';
import type { ObservationFilters } from '../../shared/filters';
import type { WorkspacePaths } from '../../app/config';
import { safeSegment, TomlStore } from './toml-store';
import {
  fromObservationToml,
  ObservationTomlSchema,
  toObservationToml,
} from './toml-mappers';

export class ObservationRepository {
  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private projectDir(projectId: string): string {
    return join(this.paths.observations, safeSegment(projectId));
  }

  private observationPath(projectId: string, observationId: string): string {
    return join(this.projectDir(projectId), `${safeSegment(observationId)}.toml`);
  }

  async save(observation: Observation): Promise<Observation> {
    await mkdir(this.projectDir(observation.projectId), { recursive: true });
    await this.store.write(
      this.observationPath(observation.projectId, observation.id),
      ObservationTomlSchema,
      toObservationToml(observation),
    );
    return observation;
  }

  async get(projectId: string, observationId: string): Promise<Observation | null> {
    const toml = await this.store.read(
      this.observationPath(projectId, observationId),
      ObservationTomlSchema,
    );
    return toml ? fromObservationToml(toml) : null;
  }

  async list(filters: ObservationFilters): Promise<Observation[]> {
    const dir = this.projectDir(filters.projectId);
    const ids = await this.store.listToml(dir);
    const observations: Observation[] = [];
    for (const id of ids) {
      const toml = await this.store.read(join(dir, `${id}.toml`), ObservationTomlSchema);
      if (toml) observations.push(fromObservationToml(toml));
    }

    let items = observations;
    if (filters.category) {
      items = items.filter((item) => item.category === filters.category);
    }
    if (filters.sentiment) {
      items = items.filter((item) => item.sentiment === filters.sentiment);
    }
    if (filters.text) {
      const needle = filters.text.toLowerCase();
      items = items.filter((item) =>
        [item.content, item.sender, item.summary, item.category, ...item.keywords]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }

    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }

  async all(): Promise<Observation[]> {
    const projectIds = await this.store.listDirectories(this.paths.observations);
    const all: Observation[] = [];
    for (const projectId of projectIds) {
      all.push(...(await this.list({ projectId })));
    }
    return all;
  }

  async count(projectId: string): Promise<number> {
    return (await this.store.listToml(this.projectDir(projectId))).length;
  }

  async remove(projectId: string, observationId: string): Promise<void> {
    await this.store.remove(this.observationPath(projectId, observationId));
  }
}
