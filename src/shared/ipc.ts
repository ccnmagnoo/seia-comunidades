import type { Catalog } from '../domain/common/catalog';
import type { DashboardStats } from '../domain/report/dashboard-stats';
import type { Note } from '../domain/note/note';
import type { Observation } from '../domain/observation/observation';
import type { ProjectSummary } from '../domain/project/project';
import type { TimelineEvent } from '../domain/timeline/timeline';
import type {
  NoteInput,
  ObservationFilters,
  ProjectDetail,
  ProjectFilters,
  SearchCriteria,
  SearchQuery,
  SyncDetailsResult,
  SyncProgress,
  SyncSearchResult,
  TrackingPatch,
} from './filters';
import type { SearchHit } from './search';
import type { SerializedError } from './errors';
import type { ReportFormat, ReportResult } from '../application/ports/report-service';

export const IPC_CHANNELS = {
  catalogsGet: 'catalogs:get',
  projectsList: 'projects:list',
  projectsGet: 'projects:get',
  projectsSyncSearch: 'projects:sync-search',
  projectsSyncDetails: 'projects:sync-details',
  projectsUpdateTracking: 'projects:update-tracking',
  observationsList: 'observations:list',
  notesList: 'notes:list',
  notesSave: 'notes:save',
  notesDelete: 'notes:delete',
  timelineGet: 'timeline:get',
  dashboardStats: 'dashboard:stats',
  searchQuery: 'search:query',
  reportsExport: 'reports:export',
  settingsGet: 'settings:get',
  appOpenExternal: 'app:open-external',
  appShowItem: 'app:show-item',
} as const;

export const IPC_EVENTS = {
  syncProgress: 'sync:progress',
  dataChanged: 'data:changed',
} as const;

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SerializedError };

export interface AppSettings {
  version: string;
  workspaceRoot: string;
  dataDir: string;
  exportsDir: string;
  seiaBaseUrl: string;
  defaultRegionIds: string[];
  defaultSectorIds: string[];
  defaultStatusIds: string[];
}

export interface SeiaApi {
  catalogs: {
    get: () => Promise<Catalog>;
  };
  projects: {
    list: (filters: ProjectFilters) => Promise<ProjectSummary[]>;
    get: (id: string) => Promise<ProjectDetail>;
    syncSearch: (criteria: SearchCriteria) => Promise<SyncSearchResult>;
    syncDetails: (id: string) => Promise<SyncDetailsResult>;
    updateTracking: (
      id: string,
      patch: TrackingPatch,
    ) => Promise<ProjectSummary>;
  };
  observations: {
    list: (filters: ObservationFilters) => Promise<Observation[]>;
  };
  notes: {
    list: (projectId: string) => Promise<Note[]>;
    save: (input: NoteInput) => Promise<Note>;
    remove: (projectId: string, id: string) => Promise<void>;
  };
  timeline: {
    get: (projectId: string) => Promise<TimelineEvent[]>;
  };
  dashboard: {
    stats: () => Promise<DashboardStats>;
  };
  search: {
    query: (input: SearchQuery) => Promise<SearchHit[]>;
  };
  reports: {
    generate: (projectId: string, format: ReportFormat) => Promise<ReportResult>;
  };
  settings: {
    get: () => Promise<AppSettings>;
  };
  openExternal: (url: string) => Promise<void>;
  showItem: (path: string) => Promise<void>;
  onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void;
  onDataChanged: (callback: () => void) => () => void;
}

export type IpcApi = SeiaApi;

export const INVOKE_CHANNELS = Object.values(IPC_CHANNELS);

export const EVENT_CHANNELS = Object.values(IPC_EVENTS);

declare global {
  interface Window {
    seia: SeiaApi;
  }
}
