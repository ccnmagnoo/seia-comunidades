import { join } from 'node:path';
import type { TimelineEvent } from '../../domain/timeline/timeline';
import type { WorkspacePaths } from '../../app/config';
import { safeSegment, TomlStore } from './toml-store';
import {
  fromTimelineToml,
  TimelineTomlSchema,
  toTimelineToml,
} from './toml-mappers';

export class TimelineRepository {
  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private timelinePath(projectId: string): string {
    return join(this.paths.timelines, `${safeSegment(projectId)}.toml`);
  }

  async get(projectId: string): Promise<TimelineEvent[]> {
    const toml = await this.store.read(this.timelinePath(projectId), TimelineTomlSchema);
    return toml ? fromTimelineToml(toml) : [];
  }

  async save(projectId: string, events: TimelineEvent[]): Promise<TimelineEvent[]> {
    await this.store.write(
      this.timelinePath(projectId),
      TimelineTomlSchema,
      toTimelineToml(projectId, events),
    );
    return events;
  }
}
