import { BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import { REPORT_FORMATS } from '../../src/application/ports/report-service';
import type { Container } from '../../src/app/bootstrap';
import { IPC_CHANNELS, IPC_EVENTS } from '../../src/shared/ipc';
import type { IpcResult } from '../../src/shared/ipc';
import {
  NoteInputSchema,
  ObservationAnalysisPatchSchema,
  ObservationCommentDeleteSchema,
  ObservationCommentInputSchema,
  ObservationCommentUpdateSchema,
  ObservationFiltersSchema,
  ProjectFiltersSchema,
  SearchCriteriaSchema,
  SearchQuerySchema,
  TrackingPatchSchema,
} from '../../src/shared/filters';
import { serializeError, ValidationError } from '../../src/shared/errors';

const projectIdSchema = z.string().min(1);
const noteDeleteSchema = z.object({
  projectId: z.string().min(1),
  id: z.string().min(1),
});

export function registerIpcHandlers(container: Container): void {
  handle(container, IPC_CHANNELS.catalogsGet, z.undefined(), async () =>
    container.catalogQuery.execute(),
  );

  handle(container, IPC_CHANNELS.projectsList, ProjectFiltersSchema, async (filters) =>
    container.listProjects.execute(filters),
  );

  handle(container, IPC_CHANNELS.projectsGet, projectIdSchema, async (projectId) =>
    container.getProjectDetail.execute(projectId),
  );

  handle(container, IPC_CHANNELS.projectsSyncSearch, SearchCriteriaSchema, async (criteria, event) =>
    container.syncProjects.execute(criteria, (progress) => {
      event.sender.send(IPC_EVENTS.syncProgress, progress);
    }),
  );

  handle(container, IPC_CHANNELS.projectsSyncDetails, projectIdSchema, async (projectId, event) =>
    container.syncProjectDetails.execute(projectId, (progress) => {
      event.sender.send(IPC_EVENTS.syncProgress, progress);
    }),
  );

  handle(
    container,
    IPC_CHANNELS.projectsUpdateTracking,
    z.object({ id: z.string().min(1), patch: TrackingPatchSchema }),
    async ({ id, patch }) => {
      const project = await container.projects.updateTracking(id, patch);
      return project;
    },
  );

  handle(container, IPC_CHANNELS.observationsList, ObservationFiltersSchema, async (filters) =>
    container.listObservations.execute(filters),
  );

  handle(
    container,
    IPC_CHANNELS.observationsUpdateAnalysis,
    z.object({
      projectId: z.string().min(1),
      observationId: z.string().min(1),
      patch: ObservationAnalysisPatchSchema,
    }),
    async ({ projectId, observationId, patch }) =>
      container.updateObservationAnalysis.execute(projectId, observationId, patch),
  );

  handle(
    container,
    IPC_CHANNELS.observationsAddComment,
    ObservationCommentInputSchema,
    async (input) => container.addObservationComment.execute(input),
  );

  handle(
    container,
    IPC_CHANNELS.observationsUpdateComment,
    ObservationCommentUpdateSchema,
    async (input) => container.updateObservationComment.execute(input),
  );

  handle(
    container,
    IPC_CHANNELS.observationsDeleteComment,
    ObservationCommentDeleteSchema,
    async (input) => container.deleteObservationComment.execute(input),
  );

  handle(container, IPC_CHANNELS.notesList, projectIdSchema, async (projectId) =>
    container.listNotes.execute(projectId),
  );

  handle(container, IPC_CHANNELS.notesSave, NoteInputSchema, async (input) =>
    container.saveNote.execute(input),
  );

  handle(container, IPC_CHANNELS.notesDelete, noteDeleteSchema, async ({ projectId, id }) =>
    container.deleteNote.execute(projectId, id),
  );

  handle(container, IPC_CHANNELS.timelineGet, projectIdSchema, async (projectId) =>
    container.getTimeline.execute(projectId),
  );

  handle(container, IPC_CHANNELS.dashboardStats, z.undefined(), async () =>
    container.dashboardStats.execute(),
  );

  handle(container, IPC_CHANNELS.searchQuery, SearchQuerySchema, async (input) =>
    container.search.query(input.query, input.limit ?? 20),
  );

  handle(
    container,
    IPC_CHANNELS.reportsExport,
    z.object({
      projectId: z.string().min(1),
      format: z.enum(REPORT_FORMATS),
    }),
    async ({ projectId, format }) => {
      const detail = await container.getProjectDetail.execute(projectId);
      return container.reports.generate(detail, format);
    },
  );

  handle(
    container,
    IPC_CHANNELS.themeSetNative,
    z.enum(['light', 'dark', 'system']),
    async (preference) => {
      nativeTheme.themeSource = preference;
      const resolved = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      for (const window of BrowserWindow.getAllWindows()) {
        window.setBackgroundColor(resolved === 'dark' ? '#070b16' : '#f6f8fc');
      }
      return { resolved };
    },
  );

  handle(container, IPC_CHANNELS.settingsGet, z.undefined(), async () => container.settings);

  handle(container, IPC_CHANNELS.appOpenExternal, z.string().url(), async (url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new ValidationError('Solo se permiten enlaces http(s).');
    }
    await shell.openExternal(url);
  });

  handle(container, IPC_CHANNELS.appShowItem, z.string().min(1), async (target) => {
    const exportsRoot = resolve(container.paths.exports);
    const resolved = resolve(target);
    const rel = relative(exportsRoot, resolved);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new ValidationError('Solo se pueden abrir archivos dentro de exports/.');
    }
    shell.showItemInFolder(resolved);
  });
}

function handle<TInput, TOutput>(
  container: Container,
  channel: string,
  schema: z.ZodType<TInput>,
  handler: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput>,
): void {
  ipcMain.handle(channel, async (event, rawInput): Promise<IpcResult<TOutput>> => {
    try {
      const input = schema.parse(rawInput);
      const data = await handler(input, event);
      return { ok: true, data };
    } catch (error) {
      container.logger.error(`IPC ${channel} falló`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, error: serializeError(error) };
    }
  });
}
