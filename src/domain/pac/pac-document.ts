import { z } from 'zod';
import {
  DocumentKindSchema,
  SCHEMA_VERSION_FIELD,
} from '../common/schemas';

export const ContentTypeSchema = z.enum(['html', 'file', 'unknown']);

export const PacDocumentSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  id: z.string().min(1),
  projectId: z.string().min(1),
  it: z.number().int().nonnegative(),
  register: z.string(),
  title: z.string(),
  kind: DocumentKindSchema,
  from: z.string(),
  recipientsCount: z.number().int().nonnegative(),
  recipientsUrl: z.string().optional(),
  link: z.string(),
  recordDate: z.string(),
  contentType: ContentTypeSchema,
  content: z.string().optional(),
  contentFetchedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PacDocument = z.infer<typeof PacDocumentSchema>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

export const PacDocumentListSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  projectId: z.string(),
  documents: z.array(PacDocumentSchema),
});

export type PacDocumentList = z.infer<typeof PacDocumentListSchema>;
