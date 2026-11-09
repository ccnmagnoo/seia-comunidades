import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Note } from '../../domain/note/note';
import type { NoteInput } from '../../shared/filters';
import type { WorkspacePaths } from '../../app/config';
import { nowIso, safeSegment, TomlStore } from './toml-store';
import { fromNoteToml, NoteTomlSchema, toNoteToml } from './toml-mappers';

export class NoteRepository {
  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private projectDir(projectId: string): string {
    return join(this.paths.notes, safeSegment(projectId));
  }

  private notePath(projectId: string, noteId: string): string {
    return join(this.projectDir(projectId), `${safeSegment(noteId)}.toml`);
  }

  async save(input: NoteInput): Promise<Note> {
    const id = input.id ?? randomUUID();
    const existing = input.id
      ? await this.store.read(this.notePath(input.projectId, input.id), NoteTomlSchema)
      : null;
    const timestamp = nowIso();
    const note: Note = {
      schemaVersion: 1,
      id,
      projectId: input.projectId,
      author: input.author,
      priority: input.priority,
      createdAt: existing?.created_at ?? timestamp,
      updatedAt: timestamp,
      content: input.content,
      tags: input.tags,
      status: {
        done: input.done,
        dueDate: input.dueDate,
      },
    };

    await mkdir(this.projectDir(note.projectId), { recursive: true });
    await this.store.write(
      this.notePath(note.projectId, note.id),
      NoteTomlSchema,
      toNoteToml(note),
    );
    return note;
  }

  async list(projectId: string): Promise<Note[]> {
    const dir = this.projectDir(projectId);
    const ids = await this.store.listToml(dir);
    const notes: Note[] = [];
    for (const id of ids) {
      const toml = await this.store.read(join(dir, `${id}.toml`), NoteTomlSchema);
      if (toml) notes.push(fromNoteToml(toml));
    }
    notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return notes;
  }

  async all(): Promise<Note[]> {
    const projectIds = await this.store.listDirectories(this.paths.notes);
    const all: Note[] = [];
    for (const projectId of projectIds) {
      all.push(...(await this.list(projectId)));
    }
    return all;
  }

  async remove(projectId: string, noteId: string): Promise<void> {
    await this.store.remove(this.notePath(projectId, noteId));
  }
}
