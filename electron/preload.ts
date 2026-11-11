import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPC_EVENTS } from '../src/shared/ipc';
import type { IpcResult, SeiaApi } from '../src/shared/ipc';
import type { SyncProgress } from '../src/shared/filters';
import type { ReportFormat } from '../src/application/ports/report-service';
import type { ThemePreference } from '../src/shared/theme';

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>;
  if (!result || !result.ok) {
    const message = result?.error?.message ?? 'Error desconocido de IPC';
    const error = new Error(message) as Error & { code?: string };
    if (result?.error?.code) error.code = result.error.code;
    throw error;
  }
  return result.data;
}

function onEvent<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: SeiaApi = {
  catalogs: {
    get: () => invoke(IPC_CHANNELS.catalogsGet),
  },
  projects: {
    list: (filters) => invoke(IPC_CHANNELS.projectsList, filters),
    get: (id) => invoke(IPC_CHANNELS.projectsGet, id),
    syncSearch: (criteria) => invoke(IPC_CHANNELS.projectsSyncSearch, criteria),
    syncDetails: (id) => invoke(IPC_CHANNELS.projectsSyncDetails, id),
    updateTracking: (id, patch) =>
      invoke<import('../src/domain/project/project').ProjectSummary>(
        IPC_CHANNELS.projectsUpdateTracking,
        { id, patch },
      ),
  },
  observations: {
    list: (filters) => invoke(IPC_CHANNELS.observationsList, filters),
    updateAnalysis: (projectId, observationId, patch) =>
      invoke(IPC_CHANNELS.observationsUpdateAnalysis, {
        projectId,
        observationId,
        patch,
      }),
    addComment: (input) => invoke(IPC_CHANNELS.observationsAddComment, input),
    updateComment: (input) => invoke(IPC_CHANNELS.observationsUpdateComment, input),
    deleteComment: (input) => invoke(IPC_CHANNELS.observationsDeleteComment, input),
  },
  notes: {
    list: (projectId) => invoke(IPC_CHANNELS.notesList, projectId),
    save: (input) => invoke(IPC_CHANNELS.notesSave, input),
    remove: (projectId, id) => invoke(IPC_CHANNELS.notesDelete, { projectId, id }),
  },
  timeline: {
    get: (projectId) => invoke(IPC_CHANNELS.timelineGet, projectId),
  },
  dashboard: {
    stats: () => invoke(IPC_CHANNELS.dashboardStats),
  },
  search: {
    query: (input) => invoke(IPC_CHANNELS.searchQuery, input),
  },
  reports: {
    generate: (projectId: string, format: ReportFormat) =>
      invoke(IPC_CHANNELS.reportsExport, { projectId, format }),
  },
  theme: {
    setNative: (preference: ThemePreference) =>
      invoke<{ resolved: import('../src/shared/theme').ResolvedTheme }>(
        IPC_CHANNELS.themeSetNative,
        preference,
      ),
  },
  settings: {
    get: () => invoke(IPC_CHANNELS.settingsGet),
  },
  openExternal: (url) => invoke(IPC_CHANNELS.appOpenExternal, url),
  showItem: (path: string) => invoke(IPC_CHANNELS.appShowItem, path),
  onSyncProgress: (callback) => onEvent<SyncProgress>(IPC_EVENTS.syncProgress, callback),
  onDataChanged: (callback) => onEvent<void>(IPC_EVENTS.dataChanged, callback),
};

contextBridge.exposeInMainWorld('seia', api);
