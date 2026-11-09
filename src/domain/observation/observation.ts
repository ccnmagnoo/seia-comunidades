import { z } from 'zod';
import {
  ClassifiedBySchema,
  SCHEMA_VERSION_FIELD,
  SentimentSchema,
} from '../common/schemas';

export const ObservationSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  id: z.string().min(1),
  projectId: z.string().min(1),
  documentId: z.string().min(1),
  sender: z.string(),
  date: z.string(),
  subject: z.string().optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  importance: z.number().min(0).max(1),
  sentiment: SentimentSchema,
  summary: z.string(),
  content: z.string(),
  sourceUrl: z.string(),
  classifiedBy: ClassifiedBySchema,
  keywords: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Observation = z.infer<typeof ObservationSchema>;

export const ObservationListSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  projectId: z.string(),
  observations: z.array(ObservationSchema),
});

export type ObservationList = z.infer<typeof ObservationListSchema>;
