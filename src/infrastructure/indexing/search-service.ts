import FlexSearch from 'flexsearch';
import type { SearchHit } from '../../shared/search';
import type { Logger } from '../../shared/logger';
import type { ProjectRepository } from '../repositories/project-repository';
import type { ObservationRepository } from '../repositories/observation-repository';
import type { NoteRepository } from '../repositories/note-repository';
import { normalizeText } from '../../domain/common/text';

interface SearchDocument {
  id: string;
  kind: SearchHit['kind'];
  projectId: string;
  title: string;
  content: string;
}

export class SearchService {
  private index = createIndex();
  private documents = new Map<string, SearchDocument>();
  private loaded = false;
  private loading: Promise<void> | null = null;

  constructor(
    private readonly projects: ProjectRepository,
    private readonly observations: ObservationRepository,
    private readonly notes: NoteRepository,
    private readonly logger: Logger,
  ) {}

  invalidate(): void {
    this.loaded = false;
  }

  async query(query: string, limit = 20): Promise<SearchHit[]> {
    await this.ensureLoaded();
    const normalized = normalizeText(query);
    if (!normalized) return [];

    const raw = this.index.search(normalized, { limit });
    const ids = flatten(raw).slice(0, limit);

    return ids
      .map((id, position) => {
        const document = this.documents.get(String(id));
        if (!document) return null;
        return {
          id: document.id,
          kind: document.kind,
          projectId: document.projectId,
          title: document.title,
          snippet: document.content.slice(0, 220),
          score: Number((1 - position / Math.max(limit, 1)).toFixed(3)),
        } satisfies SearchHit;
      })
      .filter((hit): hit is SearchHit => hit !== null);
  }

  async rebuild(): Promise<void> {
    this.index = createIndex();
    this.documents = new Map();

    const [projects, observations, notes] = await Promise.all([
      this.projects.all(),
      this.observations.all(),
      this.notes.all(),
    ]);

    for (const project of projects) {
      this.add({
        id: `project:${project.id}`,
        kind: 'project',
        projectId: project.id,
        title: project.name,
        content: [
          project.shortName,
          project.owner.name,
          project.location.region,
          project.location.commune,
          project.status,
          project.workflow,
          project.details.typology,
          project.details.typologyDescription,
          project.tracking.tags.join(' '),
        ]
          .filter(Boolean)
          .join(' '),
      });
    }

    for (const observation of observations) {
      this.add({
        id: `observation:${observation.id}`,
        kind: 'observation',
        projectId: observation.projectId,
        title: `${observation.category} · ${observation.sender}`,
        content: [
          observation.summary,
          observation.content,
          observation.keywords.join(' '),
          observation.sender,
        ]
          .filter(Boolean)
          .join(' '),
      });
    }

    for (const note of notes) {
      this.add({
        id: `note:${note.id}`,
        kind: 'note',
        projectId: note.projectId,
        title: `Nota de ${note.author}`,
        content: [note.content, note.tags.join(' ')].filter(Boolean).join(' '),
      });
    }

    this.loaded = true;
    this.logger.info('Índice de búsqueda reconstruido', {
      documents: this.documents.size,
    });
  }

  private add(document: SearchDocument): void {
    this.documents.set(document.id, document);
    this.index.add(document.id, normalizeText(`${document.title} ${document.content}`));
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (!this.loading) {
      this.loading = this.rebuild().finally(() => {
        this.loading = null;
      });
    }
    await this.loading;
  }
}

type FlexIndex = InstanceType<typeof FlexSearch.Index>;

function createIndex(): FlexIndex {
  return new FlexSearch.Index({
    tokenize: 'forward',
    resolution: 9,
    cache: true,
  });
}

function flatten(value: unknown): Array<string | number> {
  if (!Array.isArray(value)) return [];
  const output: Array<string | number> = [];
  for (const item of value) {
    if (Array.isArray(item)) output.push(...flatten(item));
    else if (typeof item === 'string' || typeof item === 'number') output.push(item);
  }
  return output;
}
