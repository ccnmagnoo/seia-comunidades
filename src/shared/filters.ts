import { z } from 'zod';
import { PacDocumentSchema } from '../domain/pac/pac-document';
import { ObservationViewSchema } from '../domain/observation/annotation';
import { ObservationReviewStatusSchema } from '../domain/observation/annotation';
import { NoteSchema } from '../domain/note/note';
import { ProjectSchema } from '../domain/project/project';
import { TimelineEventSchema } from '../domain/timeline/timeline';

export const ProjectFiltersSchema = z.object({
  text: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  workflow: z.string().optional(),
  critical: z.boolean().optional(),
  favorite: z.boolean().optional(),
  followed: z.boolean().optional(),
  hasPac: z.boolean().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
});

export type ProjectFilters = z.infer<typeof ProjectFiltersSchema>;

export const ObservationFiltersSchema = z.object({
  projectId: z.string().min(1),
  category: z.string().optional(),
  sentiment: z.string().optional(),
  text: z.string().optional(),
});

export type ObservationFilters = z.infer<typeof ObservationFiltersSchema>;

export const ObservationAnalysisPatchSchema = z.object({
  flagged: z.boolean().optional(),
  status: ObservationReviewStatusSchema.optional(),
});

export type ObservationAnalysisPatch = z.infer<typeof ObservationAnalysisPatchSchema>;

export const ObservationCommentInputSchema = z.object({
  projectId: z.string().min(1),
  observationId: z.string().min(1),
  author: z.string().trim().min(1).default('Operador local'),
  content: z.string().trim().min(1).max(20_000),
});

export type ObservationCommentInput = z.infer<typeof ObservationCommentInputSchema>;

export const ObservationCommentUpdateSchema = z.object({
  projectId: z.string().min(1),
  observationId: z.string().min(1),
  commentId: z.string().min(1),
  content: z.string().trim().min(1).max(20_000),
});

export type ObservationCommentUpdate = z.infer<typeof ObservationCommentUpdateSchema>;

export const ObservationCommentDeleteSchema = z.object({
  projectId: z.string().min(1),
  observationId: z.string().min(1),
  commentId: z.string().min(1),
});

export type ObservationCommentDelete = z.infer<typeof ObservationCommentDeleteSchema>;

export const SearchCriteriaSchema = z.object({
  name: z.string().optional(),
  owner: z.string().optional(),
  regionIds: z.array(z.string()).optional(),
  communeIds: z.array(z.string()).optional(),
  presentationType: z.enum(['DIA', 'EIA', 'Ambos']).optional(),
  statusIds: z.array(z.string()).optional(),
  sectorIds: z.array(z.string()).optional(),
  reasonIds: z.array(z.string()).optional(),
  expedienteTypeIds: z.array(z.string()).optional(),
  presentationFrom: z.string().optional(),
  presentationTo: z.string().optional(),
  investmentMin: z.string().optional(),
  investmentMax: z.string().optional(),
  offset: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  orderColumn: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
});

export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;

export const SyncProgressSchema = z.object({
  phase: z.enum([
    'searching',
    'saving_projects',
    'project_started',
    'project_finished',
    'finished',
    'error',
  ]),
  message: z.string(),
  current: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
  projectId: z.string().optional(),
});

export type SyncProgress = z.infer<typeof SyncProgressSchema>;

export const SyncSearchResultSchema = z.object({
  fetched: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  totalReported: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

export type SyncSearchResult = z.infer<typeof SyncSearchResultSchema>;

export const SyncDetailsResultSchema = z.object({
  projectId: z.string(),
  pacDocuments: z.number().int().nonnegative(),
  observations: z.number().int().nonnegative(),
  timelineEvents: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
});

export type SyncDetailsResult = z.infer<typeof SyncDetailsResultSchema>;

export const ProjectDetailSchema = z.object({
  project: ProjectSchema,
  pac: z.array(PacDocumentSchema),
  observations: z.array(ObservationViewSchema),
  timeline: z.array(TimelineEventSchema),
  notes: z.array(NoteSchema),
});

export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

export const TrackingPatchSchema = z.object({
  favorite: z.boolean().optional(),
  critical: z.boolean().optional(),
  followed: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export type TrackingPatch = z.infer<typeof TrackingPatchSchema>;

export const NoteInputSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  author: z.string().min(1).default('Operador local'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  done: z.boolean().default(false),
  dueDate: z.string().optional(),
});

export type NoteInput = z.infer<typeof NoteInputSchema>;

export const SearchQuerySchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
