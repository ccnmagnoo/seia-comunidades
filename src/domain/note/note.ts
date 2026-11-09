import { z } from 'zod';
import {
  NotePrioritySchema,
  SCHEMA_VERSION_FIELD,
} from '../common/schemas';

export const NoteStatusSchema = z.object({
  done: z.boolean(),
  dueDate: z.string().optional(),
});

export const NoteSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  id: z.string().min(1),
  projectId: z.string().min(1),
  author: z.string(),
  priority: NotePrioritySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  status: NoteStatusSchema,
});

export type Note = z.infer<typeof NoteSchema>;
export type NoteStatus = z.infer<typeof NoteStatusSchema>;
