import { z } from 'zod';
import { SCHEMA_VERSION_FIELD } from './schemas';

export const CatalogOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const CommuneOptionSchema = CatalogOptionSchema.extend({
  regionId: z.string(),
});

export const CatalogSchema = z.object({
  schemaVersion: SCHEMA_VERSION_FIELD,
  updatedAt: z.string(),
  regions: z.array(CatalogOptionSchema),
  communes: z.array(CommuneOptionSchema),
  sectors: z.array(CatalogOptionSchema),
  statuses: z.array(CatalogOptionSchema),
  reasons: z.array(CatalogOptionSchema),
  expedienteTypes: z.array(CatalogOptionSchema),
});

export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogOption = z.infer<typeof CatalogOptionSchema>;
export type CommuneOption = z.infer<typeof CommuneOptionSchema>;
