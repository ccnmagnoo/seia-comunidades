import { z } from 'zod';

export const SearchHitSchema = z.object({
  id: z.string(),
  kind: z.enum(['project', 'observation', 'note']),
  projectId: z.string(),
  title: z.string(),
  snippet: z.string(),
  score: z.number(),
});

export type SearchHit = z.infer<typeof SearchHitSchema>;
