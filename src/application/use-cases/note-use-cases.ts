import type { ProjectRepository } from '../../infrastructure/repositories/project-repository';
import type { PacDocumentRepository } from '../../infrastructure/repositories/pac-repository';
import type { NoteRepository } from '../../infrastructure/repositories/note-repository';
import type { TimelineRepository } from '../../infrastructure/repositories/timeline-repository';
import type { EventBus } from '../../shared/events';
import type { NoteInput } from '../../shared/filters';
import { buildTimeline } from '../../domain/timeline/build-timeline';

export class SaveNoteCommand {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly pacDocuments: PacDocumentRepository,
    private readonly notes: NoteRepository,
    private readonly timelines: TimelineRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(input: NoteInput) {
    const note = await this.notes.save(input);
    const project = await this.projects.getOrThrow(note.projectId);
    const [documents, notes] = await Promise.all([
      this.pacDocuments.list(note.projectId),
      this.notes.list(note.projectId),
    ]);
    await this.timelines.save(note.projectId, buildTimeline(project, documents, notes));
    await this.bus.emit('NOTE_SAVED', { note });
    await this.bus.emit('DATA_CHANGED', {
      reason: 'note-saved',
      projectId: note.projectId,
    });
    return note;
  }
}

export class DeleteNoteCommand {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly pacDocuments: PacDocumentRepository,
    private readonly notes: NoteRepository,
    private readonly timelines: TimelineRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(projectId: string, noteId: string): Promise<void> {
    await this.notes.remove(projectId, noteId);
    const project = await this.projects.getOrThrow(projectId);
    const [documents, notes] = await Promise.all([
      this.pacDocuments.list(projectId),
      this.notes.list(projectId),
    ]);
    await this.timelines.save(projectId, buildTimeline(project, documents, notes));
    await this.bus.emit('NOTE_REMOVED', { projectId, noteId });
    await this.bus.emit('DATA_CHANGED', { reason: 'note-removed', projectId });
  }
}
