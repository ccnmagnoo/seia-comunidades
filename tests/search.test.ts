import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureWorkspaceDirs, resolveWorkspacePaths } from '../src/app/config';
import type { WorkspacePaths } from '../src/app/config';
import { TomlStore } from '../src/infrastructure/repositories/toml-store';
import { ProjectRepository } from '../src/infrastructure/repositories/project-repository';
import { ObservationRepository } from '../src/infrastructure/repositories/observation-repository';
import { NoteRepository } from '../src/infrastructure/repositories/note-repository';
import { SearchService } from '../src/infrastructure/indexing/search-service';
import { noopLogger } from '../src/shared/logger';

const now = '2026-01-20T12:00:00.000Z';
let root: string;
let paths: WorkspacePaths;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'seia-search-test-'));
  paths = resolveWorkspacePaths(root);
  ensureWorkspaceDirs(paths);
  const store = new TomlStore();

  await new ProjectRepository(paths, store).save({
    schemaVersion: 1,
    id: '1',
    name: 'Parque Solar Alicanto',
    shortName: 'Alicanto',
    workflow: 'DIA',
    status: 'En Calificación',
    createdAt: now,
    updatedAt: now,
    owner: { name: 'PSF Alicanto Solar SpA' },
    location: { region: 'Región de Valparaíso', commune: 'Casablanca' },
    details: { typologyDescription: 'Central solar fotovoltaica' },
    pac: { enabled: true, recordsTotal: 1, observationsTotal: 1 },
    tracking: { favorite: false, critical: false, followed: true, tags: ['energia'] },
    links: { sheet: '', dossier: '', pac: '' },
  });

  await new ObservationRepository(paths, store).save({
    schemaVersion: 1,
    id: 'OBS-1',
    projectId: '1',
    documentId: '1',
    sender: 'Junta de Vecinos',
    date: '2026-01-18',
    category: 'Turismo',
    importance: 0.8,
    sentiment: 'negative',
    summary: 'Preocupación por el paisaje y el turismo.',
    content: 'El turismo y el paisaje se verían afectados por el proyecto.',
    sourceUrl: '',
    classifiedBy: 'rule',
    keywords: ['turismo', 'paisaje'],
    createdAt: now,
    updatedAt: now,
  });

  await new NoteRepository(paths, store).save({
    projectId: '1',
    author: 'Carlos Campos',
    priority: 'high',
    content: 'Revisar planificación energética regional.',
    tags: ['seremi'],
    done: false,
  });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('SearchService', () => {
  it('indexa proyectos, observaciones y notas', async () => {
    const store = new TomlStore();
    const service = new SearchService(
      new ProjectRepository(paths, store),
      new ObservationRepository(paths, store),
      new NoteRepository(paths, store),
      noopLogger,
    );

    const projects = await service.query('alicanto');
    expect(projects.some((hit) => hit.kind === 'project')).toBe(true);

    const observations = await service.query('turismo');
    expect(observations.some((hit) => hit.kind === 'observation')).toBe(true);

    const notes = await service.query('planificacion');
    expect(notes.some((hit) => hit.kind === 'note')).toBe(true);
  });
});
