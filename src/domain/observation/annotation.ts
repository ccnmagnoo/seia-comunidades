import { z } from 'zod';
import { SCHEMA_VERSION_FIELD } from '../common/schemas';
import { ObservationSchema } from './observation';

export const ObservationReviewStatusSchema = z.enum([
  'pending',
  'reviewed',
  'relevant',
  'dismissed',
]);

export type ObservationReviewStatus = z.infer<typeof ObservationReviewStatusSchema>;

export const AnalystCommentSchema = z.object({
  id: z.string().min(1),
  author: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  content: z.string().min(1),
});

export type AnalystComment = z.infer<typeof AnalystCommentSchema>;

export const ObservationAnnotationSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  observationId: z.string().min(1),
  projectId: z.string().min(1),
  flagged: z.boolean(),
  status: ObservationReviewStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  comments: z.array(AnalystCommentSchema),
});

export type ObservationAnnotation = z.infer<typeof ObservationAnnotationSchema>;

export const ObservationViewSchema = ObservationSchema.extend({
  analysis: ObservationAnnotationSchema.nullable(),
});

export type ObservationView = z.infer<typeof ObservationViewSchema>;

export function defaultAnnotation(
  projectId: string,
  observationId: string,
): ObservationAnnotation {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    observationId,
    projectId,
    flagged: false,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
}
