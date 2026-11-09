import { z } from 'zod';
import {
  SCHEMA_VERSION_FIELD,
  TimelineEventTypeSchema,
} from '../common/schemas';

export const TimelineEventSchema = z.object({
  id: z.string().min(1),
  date: z.string(),
  type: TimelineEventTypeSchema,
  title: z.string(),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  projectId: z.string().min(1),
  events: z.array(TimelineEventSchema),
});

export type Timeline = z.infer<typeof TimelineSchema>;
