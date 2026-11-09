import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PacDocument } from '../../domain/pac/pac-document';
import type { WorkspacePaths } from '../../app/config';
import { safeSegment, TomlStore } from './toml-store';
import {
  fromPacDocumentToml,
  PacDocumentTomlSchema,
  toPacDocumentToml,
} from './toml-mappers';

export class PacDocumentRepository {
  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private projectDir(projectId: string): string {
    return join(this.paths.pac, safeSegment(projectId));
  }

  private documentPath(projectId: string, documentId: string): string {
    return join(this.projectDir(projectId), `${safeSegment(documentId)}.toml`);
  }

  async save(document: PacDocument): Promise<PacDocument> {
    await mkdir(this.projectDir(document.projectId), { recursive: true });
    await this.store.write(
      this.documentPath(document.projectId, document.id),
      PacDocumentTomlSchema,
      toPacDocumentToml(document),
    );
    return document;
  }

  async saveMany(projectId: string, documents: PacDocument[]): Promise<void> {
    for (const document of documents) {
      await this.save({ ...document, projectId });
    }
  }

  async get(projectId: string, documentId: string): Promise<PacDocument | null> {
    const toml = await this.store.read(
      this.documentPath(projectId, documentId),
      PacDocumentTomlSchema,
    );
    return toml ? fromPacDocumentToml(toml) : null;
  }

  async list(projectId: string): Promise<PacDocument[]> {
    const dir = this.projectDir(projectId);
    const ids = await this.store.listToml(dir);
    const documents: PacDocument[] = [];
    for (const id of ids) {
      const toml = await this.store.read(join(dir, `${id}.toml`), PacDocumentTomlSchema);
      if (toml) documents.push(fromPacDocumentToml(toml));
    }
    documents.sort((a, b) => {
      const byDate = a.recordDate.localeCompare(b.recordDate);
      return byDate !== 0 ? byDate : a.it - b.it;
    });
    return documents;
  }

  async count(projectId: string): Promise<number> {
    return (await this.store.listToml(this.projectDir(projectId))).length;
  }
}
