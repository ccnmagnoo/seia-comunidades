import { z } from 'zod';
import { SCHEMA_VERSION_FIELD } from '../common/schemas';

export const OwnerSchema = z.object({
  name: z.string(),
  rut: z.string().optional(),
});

export const LocationSchema = z.object({
  region: z.string(),
  commune: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const ProjectDetailsSchema = z.object({
  investmentMM: z.number().optional(),
  reason: z.string().optional(),
  presentationDate: z.string().optional(),
  legalDays: z.number().optional(),
  typology: z.string().optional(),
  typologyDescription: z.string().optional(),
  description: z.string().optional(),
});

export const PacSummarySchema = z.object({
  enabled: z.boolean(),
  recordsTotal: z.number().int().nonnegative(),
  observationsTotal: z.number().int().nonnegative(),
  lastRecordAt: z.string().optional(),
});

export const TrackingSchema = z.object({
  favorite: z.boolean(),
  critical: z.boolean(),
  followed: z.boolean(),
  tags: z.array(z.string()),
});

export const ProjectLinksSchema = z.object({
  sheet: z.string(),
  dossier: z.string(),
  pac: z.string(),
  map: z.string().optional(),
});

export const ProjectSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  id: z.string().min(1),
  name: z.string(),
  shortName: z.string(),
  workflow: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  owner: OwnerSchema,
  location: LocationSchema,
  details: ProjectDetailsSchema,
  pac: PacSummarySchema,
  tracking: TrackingSchema,
  links: ProjectLinksSchema,
});

export type Project = z.infer<typeof ProjectSchema>;
export type Owner = z.infer<typeof OwnerSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type ProjectDetails = z.infer<typeof ProjectDetailsSchema>;
export type PacSummary = z.infer<typeof PacSummarySchema>;
export type Tracking = z.infer<typeof TrackingSchema>;
export type ProjectLinks = z.infer<typeof ProjectLinksSchema>;

export const ProjectSummarySchema = ProjectSchema.pick({
  schemaVersion: true,
  id: true,
  name: true,
  shortName: true,
  workflow: true,
  status: true,
  updatedAt: true,
  owner: true,
  location: true,
  pac: true,
  tracking: true,
  links: true,
});

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const ProjectListSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  projects: z.array(ProjectSummarySchema),
});

export type ProjectList = z.infer<typeof ProjectListSchema>;

export function toProjectSummary(project: Project): ProjectSummary {
  return {
    schemaVersion: project.schemaVersion,
    id: project.id,
    name: project.name,
    shortName: project.shortName,
    workflow: project.workflow,
    status: project.status,
    updatedAt: project.updatedAt,
    owner: project.owner,
    location: project.location,
    pac: project.pac,
    tracking: project.tracking,
    links: project.links,
  };
}
