import { z } from 'zod';

export const SCHEMA_VERSION = 1;

export const SCHEMA_VERSION_FIELD = z.literal(SCHEMA_VERSION);

export const IsoDateSchema = z.string().min(1);

export const WorkflowSchema = z.enum(['DIA', 'EIA', 'OTRO']);

export const SentimentSchema = z.enum(['positive', 'neutral', 'negative']);

export const ClassifiedBySchema = z.enum(['rule', 'manual', 'ai']);

export const NotePrioritySchema = z.enum(['low', 'medium', 'high']);

export const DocumentKindSchema = z.enum([
  'solicitud_pac',
  'observacion',
  'informe',
  'resolucion',
  'registro',
  'notificacion',
  'acreditacion',
  'otro',
]);

export type Workflow = z.infer<typeof WorkflowSchema>;
export type Sentiment = z.infer<typeof SentimentSchema>;
export type ClassifiedBy = z.infer<typeof ClassifiedBySchema>;
export type NotePriority = z.infer<typeof NotePrioritySchema>;
export type DocumentKind = z.infer<typeof DocumentKindSchema>;

export const TimelineEventTypeSchema = z.enum([
  'PROJECT_SUBMITTED',
  'PAC_STARTED',
  'NEW_OBSERVATION',
  'PAC_REPORT',
  'RESOLUTION',
  'REGISTRY',
  'DOCUMENT',
  'NOTE',
]);

export type TimelineEventType = z.infer<typeof TimelineEventTypeSchema>;

export const OBSERVATION_CATEGORIES = [
  'Agua',
  'Turismo',
  'Patrimonio',
  'Biodiversidad',
  'Energía',
  'Salud',
  'Paisaje',
  'Comunidad',
  'Riesgos',
  'Transporte',
  'Ruido',
  'Aire',
  'Sin clasificar',
] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];
