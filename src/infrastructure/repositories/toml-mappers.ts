import { z } from 'zod';
import type { Catalog } from '../../domain/common/catalog';
import type { Note } from '../../domain/note/note';
import type { Observation } from '../../domain/observation/observation';
import type { PacDocument } from '../../domain/pac/pac-document';
import type { Project, ProjectSummary } from '../../domain/project/project';
import type { TimelineEvent } from '../../domain/timeline/timeline';
import { ProjectSchema, toProjectSummary as toProjectSummaryDomain } from '../../domain/project/project';

const OptionalString = z.string().optional();
const OptionalNumber = z.number().optional();

export const ProjectTomlSchema = z.object({
  schema_version: z.literal(1),
  id: z.string(),
  name: z.string(),
  short_name: z.string(),
  workflow: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  owner: z.object({
    name: z.string(),
    rut: OptionalString,
  }),
  location: z.object({
    region: z.string(),
    commune: z.string(),
    latitude: OptionalNumber,
    longitude: OptionalNumber,
  }),
  details: z.object({
    investment_mm: OptionalNumber,
    reason: OptionalString,
    presentation_date: OptionalString,
    legal_days: OptionalNumber,
    typology: OptionalString,
    typology_description: OptionalString,
    description: OptionalString,
  }),
  pac: z.object({
    enabled: z.boolean(),
    records_total: z.number(),
    observations_total: z.number(),
    last_record_at: OptionalString,
  }),
  tracking: z.object({
    favorite: z.boolean(),
    critical: z.boolean(),
    followed: z.boolean(),
    tags: z.array(z.string()),
  }),
  links: z.object({
    sheet: z.string(),
    dossier: z.string(),
    pac: z.string(),
    map: OptionalString,
  }),
});

export type ProjectToml = z.infer<typeof ProjectTomlSchema>;

export const ProjectIndexTomlSchema = z.object({
  schema_version: z.literal(1),
  updated_at: z.string(),
  projects: z.array(ProjectTomlSchema),
});

export type ProjectIndexToml = z.infer<typeof ProjectIndexTomlSchema>;

export const PacDocumentTomlSchema = z.object({
  schema_version: z.literal(1),
  id: z.string(),
  project_id: z.string(),
  it: z.number(),
  register: z.string(),
  title: z.string(),
  kind: z.string(),
  from: z.string(),
  recipients_count: z.number(),
  recipients_url: OptionalString,
  link: z.string(),
  record_date: z.string(),
  content_type: z.string(),
  content: OptionalString,
  content_fetched_at: OptionalString,
  created_at: z.string(),
  updated_at: z.string(),
});

export type PacDocumentToml = z.infer<typeof PacDocumentTomlSchema>;

export const ObservationTomlSchema = z.object({
  schema_version: z.literal(1),
  id: z.string(),
  project_id: z.string(),
  document_id: z.string(),
  sender: z.string(),
  date: z.string(),
  subject: OptionalString,
  category: z.string(),
  subcategory: OptionalString,
  importance: z.number(),
  sentiment: z.string(),
  summary: z.string(),
  content: z.string(),
  source_url: z.string(),
  classified_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  keywords: z.object({
    items: z.array(z.string()),
  }),
});

export type ObservationToml = z.infer<typeof ObservationTomlSchema>;

export const NoteTomlSchema = z.object({
  schema_version: z.literal(1),
  id: z.string(),
  project_id: z.string(),
  author: z.string(),
  priority: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  status: z.object({
    done: z.boolean(),
    due_date: OptionalString,
  }),
});

export type NoteToml = z.infer<typeof NoteTomlSchema>;

export const TimelineTomlSchema = z.object({
  schema_version: z.literal(1),
  project_id: z.string(),
  events: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      type: z.string(),
      title: z.string(),
      description: OptionalString,
      source_url: OptionalString,
    }),
  ),
});

export type TimelineToml = z.infer<typeof TimelineTomlSchema>;

export const CatalogTomlSchema = z.object({
  schema_version: z.literal(1),
  updated_at: z.string(),
  regions: z.array(z.object({ id: z.string(), name: z.string() })),
  communes: z.array(z.object({ id: z.string(), name: z.string(), region_id: z.string() })),
  sectors: z.array(z.object({ id: z.string(), name: z.string() })),
  statuses: z.array(z.object({ id: z.string(), name: z.string() })),
  reasons: z.array(z.object({ id: z.string(), name: z.string() })),
  expediente_types: z.array(z.object({ id: z.string(), name: z.string() })),
});

export type CatalogToml = z.infer<typeof CatalogTomlSchema>;

export function toProjectToml(project: Project): ProjectToml {
  return {
    schema_version: 1,
    id: project.id,
    name: project.name,
    short_name: project.shortName,
    workflow: project.workflow,
    status: project.status,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    owner: {
      name: project.owner.name,
      rut: project.owner.rut,
    },
    location: {
      region: project.location.region,
      commune: project.location.commune,
      latitude: project.location.latitude,
      longitude: project.location.longitude,
    },
    details: {
      investment_mm: project.details.investmentMM,
      reason: project.details.reason,
      presentation_date: project.details.presentationDate,
      legal_days: project.details.legalDays,
      typology: project.details.typology,
      typology_description: project.details.typologyDescription,
      description: project.details.description,
    },
    pac: {
      enabled: project.pac.enabled,
      records_total: project.pac.recordsTotal,
      observations_total: project.pac.observationsTotal,
      last_record_at: project.pac.lastRecordAt,
    },
    tracking: {
      favorite: project.tracking.favorite,
      critical: project.tracking.critical,
      followed: project.tracking.followed,
      tags: project.tracking.tags,
    },
    links: {
      sheet: project.links.sheet,
      dossier: project.links.dossier,
      pac: project.links.pac,
      map: project.links.map,
    },
  };
}

export function fromProjectToml(toml: ProjectToml): Project {
  return ProjectSchema.parse({
    schemaVersion: 1,
    id: toml.id,
    name: toml.name,
    shortName: toml.short_name,
    workflow: toml.workflow,
    status: toml.status,
    createdAt: toml.created_at,
    updatedAt: toml.updated_at,
    owner: {
      name: toml.owner.name,
      rut: toml.owner.rut,
    },
    location: {
      region: toml.location.region,
      commune: toml.location.commune,
      latitude: toml.location.latitude,
      longitude: toml.location.longitude,
    },
    details: {
      investmentMM: toml.details.investment_mm,
      reason: toml.details.reason,
      presentationDate: toml.details.presentation_date,
      legalDays: toml.details.legal_days,
      typology: toml.details.typology,
      typologyDescription: toml.details.typology_description,
      description: toml.details.description,
    },
    pac: {
      enabled: toml.pac.enabled,
      recordsTotal: toml.pac.records_total,
      observationsTotal: toml.pac.observations_total,
      lastRecordAt: toml.pac.last_record_at,
    },
    tracking: {
      favorite: toml.tracking.favorite,
      critical: toml.tracking.critical,
      followed: toml.tracking.followed,
      tags: toml.tracking.tags,
    },
    links: {
      sheet: toml.links.sheet,
      dossier: toml.links.dossier,
      pac: toml.links.pac,
      map: toml.links.map,
    },
  });
}

export function toProjectSummary(project: Project): ProjectSummary {
  return toProjectSummaryDomain(project);
}

export function toPacDocumentToml(document: PacDocument): PacDocumentToml {
  return {
    schema_version: 1,
    id: document.id,
    project_id: document.projectId,
    it: document.it,
    register: document.register,
    title: document.title,
    kind: document.kind,
    from: document.from,
    recipients_count: document.recipientsCount,
    recipients_url: document.recipientsUrl,
    link: document.link,
    record_date: document.recordDate,
    content_type: document.contentType,
    content: document.content,
    content_fetched_at: document.contentFetchedAt,
    created_at: document.createdAt,
    updated_at: document.updatedAt,
  };
}

export function fromPacDocumentToml(toml: PacDocumentToml): PacDocument {
  return {
    schemaVersion: 1,
    id: toml.id,
    projectId: toml.project_id,
    it: toml.it,
    register: toml.register,
    title: toml.title,
    kind: toml.kind as PacDocument['kind'],
    from: toml.from,
    recipientsCount: toml.recipients_count,
    recipientsUrl: toml.recipients_url,
    link: toml.link,
    recordDate: toml.record_date,
    contentType: toml.content_type as PacDocument['contentType'],
    content: toml.content,
    contentFetchedAt: toml.content_fetched_at,
    createdAt: toml.created_at,
    updatedAt: toml.updated_at,
  };
}

export function toObservationToml(observation: Observation): ObservationToml {
  return {
    schema_version: 1,
    id: observation.id,
    project_id: observation.projectId,
    document_id: observation.documentId,
    sender: observation.sender,
    date: observation.date,
    subject: observation.subject,
    category: observation.category,
    subcategory: observation.subcategory,
    importance: observation.importance,
    sentiment: observation.sentiment,
    summary: observation.summary,
    content: observation.content,
    source_url: observation.sourceUrl,
    classified_by: observation.classifiedBy,
    created_at: observation.createdAt,
    updated_at: observation.updatedAt,
    keywords: { items: observation.keywords },
  };
}

export function fromObservationToml(toml: ObservationToml): Observation {
  return {
    schemaVersion: 1,
    id: toml.id,
    projectId: toml.project_id,
    documentId: toml.document_id,
    sender: toml.sender,
    date: toml.date,
    subject: toml.subject,
    category: toml.category,
    subcategory: toml.subcategory,
    importance: toml.importance,
    sentiment: toml.sentiment as Observation['sentiment'],
    summary: toml.summary,
    content: toml.content,
    sourceUrl: toml.source_url,
    classifiedBy: toml.classified_by as Observation['classifiedBy'],
    keywords: toml.keywords.items,
    createdAt: toml.created_at,
    updatedAt: toml.updated_at,
  };
}

export function toNoteToml(note: Note): NoteToml {
  return {
    schema_version: 1,
    id: note.id,
    project_id: note.projectId,
    author: note.author,
    priority: note.priority,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    content: note.content,
    tags: note.tags,
    status: {
      done: note.status.done,
      due_date: note.status.dueDate,
    },
  };
}

export function fromNoteToml(toml: NoteToml): Note {
  return {
    schemaVersion: 1,
    id: toml.id,
    projectId: toml.project_id,
    author: toml.author,
    priority: toml.priority as Note['priority'],
    createdAt: toml.created_at,
    updatedAt: toml.updated_at,
    content: toml.content,
    tags: toml.tags,
    status: {
      done: toml.status.done,
      dueDate: toml.status.due_date,
    },
  };
}

export function toTimelineToml(projectId: string, events: TimelineEvent[]): TimelineToml {
  return {
    schema_version: 1,
    project_id: projectId,
    events: events.map((event) => ({
      id: event.id,
      date: event.date,
      type: event.type,
      title: event.title,
      description: event.description,
      source_url: event.sourceUrl,
    })),
  };
}

export function fromTimelineToml(toml: TimelineToml): TimelineEvent[] {
  return toml.events.map((event) => ({
    id: event.id,
    date: event.date,
    type: event.type as TimelineEvent['type'],
    title: event.title,
    description: event.description,
    sourceUrl: event.source_url,
  }));
}

export function toCatalogToml(catalog: Catalog): CatalogToml {
  return {
    schema_version: 1,
    updated_at: catalog.updatedAt,
    regions: catalog.regions,
    communes: catalog.communes.map((commune) => ({
      id: commune.id,
      name: commune.name,
      region_id: commune.regionId,
    })),
    sectors: catalog.sectors,
    statuses: catalog.statuses,
    reasons: catalog.reasons,
    expediente_types: catalog.expedienteTypes,
  };
}

export function fromCatalogToml(toml: CatalogToml): Catalog {
  return {
    schemaVersion: 1,
    updatedAt: toml.updated_at,
    regions: toml.regions,
    communes: toml.communes.map((commune) => ({
      id: commune.id,
      name: commune.name,
      regionId: commune.region_id,
    })),
    sectors: toml.sectors,
    statuses: toml.statuses,
    reasons: toml.reasons,
    expedienteTypes: toml.expediente_types,
  };
}
