import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureWorkspaceDirs, resolveWorkspacePaths } from '../src/app/config';
import type { WorkspacePaths } from '../src/app/config';
import { TomlStore } from '../src/infrastructure/repositories/toml-store';
import { ObservationAnnotationRepository } from '../src/infrastructure/repositories/annotation-repository';
import {
  AddObservationCommentCommand,
  DeleteObservationCommentCommand,
  UpdateObservationAnalysisCommand,
  UpdateObservationCommentCommand,
} from '../src/application/use-cases/observation-analysis';
import { EventBus } from '../src/shared/events';

const projectId = '2165779734';
const observationId = 'OBS-2166789139';

let root: string;
let paths: WorkspacePaths;
let repository: ObservationAnnotationRepository;
let bus: EventBus;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'seia-annotations-test-'));
  paths = resolveWorkspacePaths(root);
  ensureWorkspaceDirs(paths);
  repository = new ObservationAnnotationRepository(paths, new TomlStore());
  bus = new EventBus();
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('ObservationAnnotationRepository', () => {
  it('devuelve null si no existe anotación', async () => {
    expect(await repository.get(projectId, observationId)).toBeNull();
  });
});

describe('análisis de observaciones', () => {
  it('marca y cambia el estado de revisión', async () => {
    const command = new UpdateObservationAnalysisCommand(repository, bus);
    const annotation = await command.execute(projectId, observationId, {
      flagged: true,
      status: 'relevant',
    });

    expect(annotation.flagged).toBe(true);
    expect(annotation.status).toBe('relevant');
    expect(annotation.comments).toHaveLength(0);

    const persisted = await repository.get(projectId, observationId);
    expect(persisted?.status).toBe('relevant');
    expect(persisted?.flagged).toBe(true);

    const raw = await readFile(
      join(paths.annotations, projectId, `${observationId}.toml`),
      'utf8',
    );
    expect(raw).toContain('flagged = true');
    expect(raw).toContain('status = "relevant"');
  });

  it('agrega, edita y elimina comentarios del analista', async () => {
    const add = new AddObservationCommentCommand(repository, bus);
    const added = await add.execute({
      projectId,
      observationId,
      author: 'Carlos Campos',
      content: 'Revisar relación con el Santuario de la Naturaleza.',
    });

    expect(added.comments).toHaveLength(1);
    const commentId = added.comments[0]!.id;
    expect(added.comments[0]!.author).toBe('Carlos Campos');

    const update = new UpdateObservationCommentCommand(repository, bus);
    const updated = await update.execute({
      projectId,
      observationId,
      commentId,
      content: 'Revisar relación con el Santuario y el humedal.',
    });
    expect(updated.comments[0]!.content).toContain('humedal');

    const remove = new DeleteObservationCommentCommand(repository, bus);
    const removed = await remove.execute({
      projectId,
      observationId,
      commentId,
    });
    expect(removed.comments).toHaveLength(0);
    expect(removed.flagged).toBe(true);
    expect(removed.status).toBe('relevant');
  });

  it('conserva comentarios al cambiar el estado', async () => {
    const add = new AddObservationCommentCommand(repository, bus);
    await add.execute({
      projectId,
      observationId,
      author: 'Operador local',
      content: 'Comentario persistente.',
    });

    const command = new UpdateObservationAnalysisCommand(repository, bus);
    const annotation = await command.execute(projectId, observationId, {
      flagged: false,
      status: 'reviewed',
    });

    expect(annotation.flagged).toBe(false);
    expect(annotation.status).toBe('reviewed');
    expect(annotation.comments).toHaveLength(1);

    const list = await repository.list(projectId);
    expect(list).toHaveLength(1);
    expect(list[0]?.comments).toHaveLength(1);
  });
});
