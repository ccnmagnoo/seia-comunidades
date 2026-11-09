import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureWorkspaceDirs, resolveWorkspacePaths } from '../src/app/config';
import type { WorkspacePaths } from '../src/app/config';
import { TomlStore } from '../src/infrastructure/repositories/toml-store';
import { ProjectRepository } from '../src/infrastructure/repositories/project-repository';
import { ObservationRepository } from '../src/infrastructure/repositories/observation-repository';
import { NoteRepository } from '../src/infrastructure/repositories/note-repository';
import { TimelineRepository } from '../src/infrastructure/repositories/timeline-repository';
import { CatalogRepository } from '../src/infrastructure/repositories/catalog-repository';
import type { Project } from '../src/domain/project/project';
import type { Observation } from '../src/domain/observation/observation';
import { buildTimeline } from '../src/domain/timeline/build-timeline';

const now = '2026-01-20T12:00:00.000Z';

const project: Project = {
  schemaVersion: 1,
  id: '2165225291',
  name: 'Parque Solar Alicanto',
  shortName: 'Solar Alicanto',
  workflow: 'DIA',
  status: 'En Calificación',
  createdAt: now,
  updatedAt: now,
  owner: { name: 'PSF Alicanto Solar SpA' },
  location: { region: 'Región de Valparaíso', commune: 'Casablanca' },
  details: {
    investmentMM: 110_000_000,
    presentationDate: '2026-01-15',
    legalDays: 30,
    typology: 'c',
    typologyDescription: 'Centrales generadoras de energía mayores a 3 MW',
  },
  pac: { enabled: true, recordsTotal: 0, observationsTotal: 0 },
  tracking: { favorite: false, critical: false, followed: true, tags: ['energia'] },
  links: {
    sheet: 'https://seia.sea.gob.cl/expediente/expediente.php?id_expediente=2165225291',
    dossier: 'https://seia.sea.gob.cl/expediente/xhr_expediente.php?incluyePac=1&id_expediente=2165225291',
    pac: 'https://seia.sea.gob.cl/expediente/xhr_documentos_pac.php?incluyePac=2&id_expediente=2165225291',
  },
};

const observation: Observation = {
  schemaVersion: 1,
  id: 'OBS-1',
  projectId: project.id,
  documentId: '1',
  sender: 'Junta de Vecinos',
  date: '2026-01-18',
  subject: 'Observación Ciudadana',
  category: 'Turismo',
  subcategory: 'Paisaje',
  importance: 0.81,
  sentiment: 'neutral',
  summary: 'Posible afectación paisajística.',
  content: 'Texto completo de la observación sobre turismo y paisaje.',
  sourceUrl: 'https://seia.sea.gob.cl/documentos/documento.php?idDocumento=1',
  classifiedBy: 'rule',
  keywords: ['turismo', 'paisaje'],
  createdAt: now,
  updatedAt: now,
};

let root: string;
let paths: WorkspacePaths;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'seia-comunidades-test-'));
  paths = resolveWorkspacePaths(root);
  ensureWorkspaceDirs(paths);
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('ProjectRepository', () => {
  it('hace round-trip TOML y mantiene el índice', async () => {
    const store = new TomlStore();
    const repository = new ProjectRepository(paths, store);

    await repository.save(project);
    const loaded = await repository.get(project.id);
    expect(loaded?.name).toBe(project.name);
    expect(loaded?.details.investmentMM).toBe(project.details.investmentMM);
    expect(loaded?.tracking.followed).toBe(true);

    const raw = await readFile(join(paths.projects, `${project.id}.toml`), 'utf8');
    expect(raw).toContain('schema_version = 1');
    expect(raw).toContain('short_name = "Solar Alicanto"');

    const listed = await repository.list({ text: 'alicanto' });
    expect(listed).toHaveLength(1);

    await repository.updateTracking(project.id, { favorite: true, critical: true });
    const updated = await repository.getOrThrow(project.id);
    expect(updated.tracking.favorite).toBe(true);
    expect(updated.tracking.critical).toBe(true);

    const index = await repository.rebuildIndex();
    expect(index.projects).toHaveLength(1);
  });
});

describe('ObservationRepository', () => {
  it('guarda y filtra observaciones', async () => {
    const repository = new ObservationRepository(paths, new TomlStore());
    await repository.save(observation);

    const all = await repository.list({ projectId: project.id });
    expect(all).toHaveLength(1);
    expect(all[0]?.keywords).toEqual(['turismo', 'paisaje']);

    const filtered = await repository.list({ projectId: project.id, category: 'Turismo' });
    expect(filtered).toHaveLength(1);

    expect(await repository.count(project.id)).toBe(1);
  });
});

describe('NoteRepository', () => {
  it('crea, lista y elimina notas', async () => {
    const repository = new NoteRepository(paths, new TomlStore());
    const note = await repository.save({
      projectId: project.id,
      author: 'Carlos Campos',
      priority: 'high',
      content: 'Revisar implicancias para planificación energética regional.',
      tags: ['energia', 'seremi'],
      done: false,
      dueDate: '2026-02-01',
    });

    const listed = await repository.list(project.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.priority).toBe('high');
    expect(listed[0]?.status.dueDate).toBe('2026-02-01');

    await repository.remove(project.id, note.id);
    expect(await repository.list(project.id)).toHaveLength(0);
  });
});

describe('TimelineRepository', () => {
  it('persiste y recupera la línea de tiempo', async () => {
    const repository = new TimelineRepository(paths, new TomlStore());
    const events = buildTimeline(
      project,
      [
        {
          schemaVersion: 1,
          id: '100',
          projectId: project.id,
          it: 1,
          register: '2026-01-1',
          title: 'Observación Ciudadana',
          kind: 'observacion',
          from: 'Junta de Vecinos',
          recipientsCount: 0,
          link: 'https://example.com/obs',
          recordDate: '2026-01-18T10:00:00',
          contentType: 'html',
          createdAt: now,
          updatedAt: now,
        },
      ],
      [],
    );

    await repository.save(project.id, events);
    const loaded = await repository.get(project.id);
    expect(loaded.some((event) => event.type === 'PROJECT_SUBMITTED')).toBe(true);
    expect(loaded.some((event) => event.type === 'NEW_OBSERVATION')).toBe(true);
    expect(loaded[0]!.date <= loaded[loaded.length - 1]!.date).toBe(true);
  });
});

describe('CatalogRepository', () => {
  it('guarda catálogos en TOML', async () => {
    const repository = new CatalogRepository(paths, new TomlStore());
    const saved = await repository.save({
      schemaVersion: 1,
      updatedAt: now,
      regions: [{ id: '5', name: 'Región de Valparaíso' }],
      communes: [{ id: '1189', name: 'Algarrobo', regionId: '5' }],
      sectors: [{ id: '7', name: 'Energía' }],
      statuses: [{ id: '3', name: 'En Calificación' }],
      reasons: [],
      expedienteTypes: [],
    });

    const loaded = await repository.get();
    expect(loaded.regions).toHaveLength(1);
    expect(loaded.communes[0]?.regionId).toBe('5');
    expect(saved.updatedAt).not.toBe(now);
  });
});
