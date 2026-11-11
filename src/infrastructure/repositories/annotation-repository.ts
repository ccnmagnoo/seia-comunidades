import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ObservationAnnotation } from '../../domain/observation/annotation';
import type { WorkspacePaths } from '../../app/config';
import { safeSegment, TomlStore } from './toml-store';
import {
  fromObservationAnnotationToml,
  ObservationAnnotationTomlSchema,
  toObservationAnnotationToml,
} from './toml-mappers';

export class ObservationAnnotationRepository {
  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private projectDir(projectId: string): string {
    return join(this.paths.annotations, safeSegment(projectId));
  }

  private annotationPath(projectId: string, observationId: string): string {
    return join(this.projectDir(projectId), `${safeSegment(observationId)}.toml`);
  }

  async get(
    projectId: string,
    observationId: string,
  ): Promise<ObservationAnnotation | null> {
    const toml = await this.store.read(
      this.annotationPath(projectId, observationId),
      ObservationAnnotationTomlSchema,
    );
    return toml ? fromObservationAnnotationToml(toml) : null;
  }

  async save(annotation: ObservationAnnotation): Promise<ObservationAnnotation> {
    await mkdir(this.projectDir(annotation.projectId), { recursive: true });
    await this.store.write(
      this.annotationPath(annotation.projectId, annotation.observationId),
      ObservationAnnotationTomlSchema,
      toObservationAnnotationToml(annotation),
    );
    return annotation;
  }

  async list(projectId: string): Promise<ObservationAnnotation[]> {
    const dir = this.projectDir(projectId);
    const ids = await this.store.listToml(dir);
    const annotations: ObservationAnnotation[] = [];
    for (const id of ids) {
      const toml = await this.store.read(
        join(dir, `${id}.toml`),
        ObservationAnnotationTomlSchema,
      );
      if (toml) annotations.push(fromObservationAnnotationToml(toml));
    }
    return annotations;
  }

  async all(): Promise<ObservationAnnotation[]> {
    const projectIds = await this.store.listDirectories(this.paths.annotations);
    const all: ObservationAnnotation[] = [];
    for (const projectId of projectIds) {
      all.push(...(await this.list(projectId)));
    }
    return all;
  }

  async remove(projectId: string, observationId: string): Promise<void> {
    await this.store.remove(this.annotationPath(projectId, observationId));
  }
}
