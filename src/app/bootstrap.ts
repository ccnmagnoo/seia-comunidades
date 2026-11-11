import type { AppConfig, WorkspacePaths } from './config';
import { ensureWorkspaceDirs, loadAppConfig, resolveWorkspacePaths } from './config';
import type { Logger } from '../shared/logger';
import { createLogger } from '../shared/logger';
import { EventBus } from '../shared/events';
import type { AppSettings } from '../shared/ipc';
import { TomlStore } from '../infrastructure/repositories/toml-store';
import { ProjectRepository } from '../infrastructure/repositories/project-repository';
import { PacDocumentRepository } from '../infrastructure/repositories/pac-repository';
import { ObservationRepository } from '../infrastructure/repositories/observation-repository';
import { ObservationAnnotationRepository } from '../infrastructure/repositories/annotation-repository';
import { NoteRepository } from '../infrastructure/repositories/note-repository';
import { TimelineRepository } from '../infrastructure/repositories/timeline-repository';
import { CatalogRepository } from '../infrastructure/repositories/catalog-repository';
import { HttpCache } from '../infrastructure/seia/http-cache';
import { SeiaHttpClient } from '../infrastructure/seia/http-client';
import { SeiaGatewayAdapter } from '../infrastructure/seia/seia-gateway';
import { SearchService } from '../infrastructure/indexing/search-service';
import { ReportService } from '../infrastructure/exporters/report-service';
import type { PdfPrinter } from '../application/ports/report-service';
import { SyncProjectsUseCase } from '../application/use-cases/sync-projects';
import { SyncProjectDetailsUseCase } from '../application/use-cases/sync-project-details';
import { DeleteNoteCommand, SaveNoteCommand } from '../application/use-cases/note-use-cases';
import {
  AddObservationCommentCommand,
  DeleteObservationCommentCommand,
  UpdateObservationAnalysisCommand,
  UpdateObservationCommentCommand,
} from '../application/use-cases/observation-analysis';
import {
  CatalogQuery,
  DashboardStatsQuery,
  GetProjectDetailQuery,
  GetTimelineQuery,
  ListNotesQuery,
  ListObservationsQuery,
  ListProjectsQuery,
} from '../application/queries/queries';
import { join } from 'node:path';

export interface BootstrapOptions {
  workspaceRoot: string;
  version: string;
  configPath?: string;
  pdfPrinter?: PdfPrinter;
}

export interface Container {
  config: AppConfig;
  paths: WorkspacePaths;
  logger: Logger;
  bus: EventBus;
  settings: AppSettings;
  projects: ProjectRepository;
  pacDocuments: PacDocumentRepository;
  observations: ObservationRepository;
  annotations: ObservationAnnotationRepository;
  notes: NoteRepository;
  timelines: TimelineRepository;
  catalogs: CatalogRepository;
  gateway: SeiaGatewayAdapter;
  search: SearchService;
  reports: ReportService;
  syncProjects: SyncProjectsUseCase;
  syncProjectDetails: SyncProjectDetailsUseCase;
  saveNote: SaveNoteCommand;
  deleteNote: DeleteNoteCommand;
  updateObservationAnalysis: UpdateObservationAnalysisCommand;
  addObservationComment: AddObservationCommentCommand;
  updateObservationComment: UpdateObservationCommentCommand;
  deleteObservationComment: DeleteObservationCommentCommand;
  listProjects: ListProjectsQuery;
  getProjectDetail: GetProjectDetailQuery;
  listObservations: ListObservationsQuery;
  listNotes: ListNotesQuery;
  getTimeline: GetTimelineQuery;
  dashboardStats: DashboardStatsQuery;
  catalogQuery: CatalogQuery;
}

export async function bootstrap(options: BootstrapOptions): Promise<Container> {
  const paths = resolveWorkspacePaths(options.workspaceRoot);
  ensureWorkspaceDirs(paths);

  const config = loadAppConfig(
    options.workspaceRoot,
    options.configPath ?? join(options.workspaceRoot, 'config', 'seia.toml'),
  );
  const logger = createLogger({
    level: process.env.SEIA_LOG_LEVEL === 'debug' ? 'debug' : 'info',
    filePath: join(paths.logs, 'app.log'),
  });

  const store = new TomlStore();
  const bus = new EventBus();

  const projects = new ProjectRepository(paths, store);
  const pacDocuments = new PacDocumentRepository(paths, store);
  const observations = new ObservationRepository(paths, store);
  const annotations = new ObservationAnnotationRepository(paths, store);
  const notes = new NoteRepository(paths, store);
  const timelines = new TimelineRepository(paths, store);
  const catalogs = new CatalogRepository(paths, store);

  const cache = new HttpCache(paths.cache);
  const client = new SeiaHttpClient({
    baseUrl: config.seia.baseUrl,
    userAgent: config.seia.userAgent,
    timeoutMs: config.seia.timeoutMs,
    maxRetries: config.seia.maxRetries,
    delayMs: config.seia.delayMs,
    cache,
    logger,
  });
  const gateway = new SeiaGatewayAdapter(config.seia, client, logger);

  const search = new SearchService(projects, observations, annotations, notes, logger);
  bus.on('DATA_CHANGED', () => search.invalidate());
  bus.on('PROJECT_UPSERTED', () => search.invalidate());

  const settings: AppSettings = {
    version: options.version,
    workspaceRoot: paths.root,
    dataDir: paths.data,
    exportsDir: paths.exports,
    seiaBaseUrl: config.seia.baseUrl,
    defaultRegionIds: config.seia.defaultRegionIds,
    defaultSectorIds: config.seia.defaultSectorIds,
    defaultStatusIds: config.seia.defaultStatusIds,
  };

  return {
    config,
    paths,
    logger,
    bus,
    settings,
    projects,
    pacDocuments,
    observations,
    annotations,
    notes,
    timelines,
    catalogs,
    gateway,
    search,
    reports: new ReportService(paths.exports, options.pdfPrinter, logger),
    syncProjects: new SyncProjectsUseCase(gateway, projects, bus, logger),
    syncProjectDetails: new SyncProjectDetailsUseCase(
      gateway,
      projects,
      pacDocuments,
      observations,
      notes,
      timelines,
      bus,
      logger,
      config.sync.fetchDocumentContent,
    ),
    saveNote: new SaveNoteCommand(projects, pacDocuments, notes, timelines, bus),
    deleteNote: new DeleteNoteCommand(projects, pacDocuments, notes, timelines, bus),
    updateObservationAnalysis: new UpdateObservationAnalysisCommand(annotations, bus),
    addObservationComment: new AddObservationCommentCommand(annotations, bus),
    updateObservationComment: new UpdateObservationCommentCommand(annotations, bus),
    deleteObservationComment: new DeleteObservationCommentCommand(annotations, bus),
    listProjects: new ListProjectsQuery(projects),
    getProjectDetail: new GetProjectDetailQuery(
      projects,
      pacDocuments,
      observations,
      annotations,
      notes,
      timelines,
    ),
    listObservations: new ListObservationsQuery(observations, annotations),
    listNotes: new ListNotesQuery(notes),
    getTimeline: new GetTimelineQuery(timelines),
    dashboardStats: new DashboardStatsQuery(projects, observations, annotations),
    catalogQuery: new CatalogQuery(catalogs, gateway, logger),
  };
}
