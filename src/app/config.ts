import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { z } from 'zod';

const EndpointsSchema = z.object({
  projects: z.string(),
  search_page: z.string(),
  project_sheet: z.string(),
  records: z.string(),
  pac_documents: z.string(),
  pac_activities: z.string(),
  schedule: z.string(),
  document_receivers: z.string(),
  representative_point: z.string(),
  project_file: z.string(),
});

const CacheTtlSchema = z.object({
  projects: z.number(),
  pac: z.number(),
  documents: z.number(),
  maps: z.number(),
  closed: z.number(),
});

const SeiaConfigSchema = z.object({
  base_url: z.string().url(),
  user_agent: z.string(),
  timeout_ms: z.number().int().positive().default(30_000),
  max_retries: z.number().int().min(0).default(3),
  concurrency: z.number().int().min(1).default(2),
  delay_ms: z.number().int().min(0).default(350),
  default_region_ids: z.array(z.string()).default([]),
  default_sector_ids: z.array(z.string()).default([]),
  default_status_ids: z.array(z.string()).default([]),
  endpoints: EndpointsSchema,
  cache_ttl_hours: CacheTtlSchema,
});

const SyncConfigSchema = z.object({
  page_limit: z.number().int().min(1).max(1000).default(200),
  max_pages: z.number().int().min(1).default(25),
  fetch_document_content: z.boolean().default(true),
});

const ConfigFileSchema = z.object({
  app: z.object({
    name: z.string().default('SEIA Comunidades'),
    locale: z.string().default('es-CL'),
    timezone: z.string().default('America/Santiago'),
  }),
  seia: SeiaConfigSchema,
  sync: SyncConfigSchema,
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

export interface SeiaEndpoints {
  projects: string;
  searchPage: string;
  projectSheet: string;
  records: string;
  pacDocuments: string;
  pacActivities: string;
  schedule: string;
  documentReceivers: string;
  representativePoint: string;
  projectFile: string;
}

export interface SeiaConfig {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  maxRetries: number;
  concurrency: number;
  delayMs: number;
  defaultRegionIds: string[];
  defaultSectorIds: string[];
  defaultStatusIds: string[];
  endpoints: SeiaEndpoints;
  cacheTtlHours: {
    projects: number;
    pac: number;
    documents: number;
    maps: number;
    closed: number;
  };
}

export interface SyncConfig {
  pageLimit: number;
  maxPages: number;
  fetchDocumentContent: boolean;
}

export interface WorkspacePaths {
  root: string;
  data: string;
  projects: string;
  pac: string;
  observations: string;
  annotations: string;
  notes: string;
  timelines: string;
  catalogs: string;
  reports: string;
  schedules: string;
  automations: string;
  state: string;
  exports: string;
  indexes: string;
  cache: string;
  logs: string;
}

export interface AppConfig {
  app: {
    name: string;
    locale: string;
    timezone: string;
  };
  seia: SeiaConfig;
  sync: SyncConfig;
  paths: WorkspacePaths;
}

export function resolveWorkspacePaths(rootInput: string): WorkspacePaths {
  const root = resolve(rootInput);
  const data = join(root, 'data');
  return {
    root,
    data,
    projects: join(data, 'projects'),
    pac: join(data, 'pac'),
    observations: join(data, 'observations'),
    annotations: join(data, 'annotations'),
    notes: join(data, 'notes'),
    timelines: join(data, 'timelines'),
    catalogs: join(data, 'catalogs'),
    reports: join(data, 'reports'),
    schedules: join(data, 'schedules'),
    automations: join(data, 'automations'),
    state: join(data, 'state'),
    exports: join(root, 'exports'),
    indexes: join(root, 'indexes'),
    cache: join(root, 'cache'),
    logs: join(root, 'logs'),
  };
}

export function ensureWorkspaceDirs(paths: WorkspacePaths): void {
  const dirs = [
    paths.data,
    paths.projects,
    paths.pac,
    paths.observations,
    paths.annotations,
    paths.notes,
    paths.timelines,
    paths.catalogs,
    paths.reports,
    paths.schedules,
    paths.automations,
    paths.state,
    paths.exports,
    paths.indexes,
    paths.cache,
    paths.logs,
  ];
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadAppConfig(
  workspaceRoot: string,
  configFile = join(workspaceRoot, 'config', 'seia.toml'),
): AppConfig {
  const raw = readFileSync(configFile, 'utf8');
  const parsed = ConfigFileSchema.parse(parseToml(raw));
  const paths = resolveWorkspacePaths(workspaceRoot);

  return {
    app: parsed.app,
    seia: {
      baseUrl: parsed.seia.base_url,
      userAgent: parsed.seia.user_agent,
      timeoutMs: parsed.seia.timeout_ms,
      maxRetries: parsed.seia.max_retries,
      concurrency: parsed.seia.concurrency,
      delayMs: parsed.seia.delay_ms,
      defaultRegionIds: parsed.seia.default_region_ids,
      defaultSectorIds: parsed.seia.default_sector_ids,
      defaultStatusIds: parsed.seia.default_status_ids,
      endpoints: {
        projects: parsed.seia.endpoints.projects,
        searchPage: parsed.seia.endpoints.search_page,
        projectSheet: parsed.seia.endpoints.project_sheet,
        records: parsed.seia.endpoints.records,
        pacDocuments: parsed.seia.endpoints.pac_documents,
        pacActivities: parsed.seia.endpoints.pac_activities,
        schedule: parsed.seia.endpoints.schedule,
        documentReceivers: parsed.seia.endpoints.document_receivers,
        representativePoint: parsed.seia.endpoints.representative_point,
        projectFile: parsed.seia.endpoints.project_file,
      },
      cacheTtlHours: parsed.seia.cache_ttl_hours,
    },
    sync: {
      pageLimit: parsed.sync.page_limit,
      maxPages: parsed.sync.max_pages,
      fetchDocumentContent: parsed.sync.fetch_document_content,
    },
    paths,
  };
}
