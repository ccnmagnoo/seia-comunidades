import { z } from 'zod';
import { ProjectSummarySchema } from '../project/project';

export const ChartPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const MonthlyPointSchema = z.object({
  month: z.string(),
  value: z.number(),
});

export const DashboardStatsSchema = z.object({
  totalProjects: z.number().int().nonnegative(),
  criticalProjects: z.number().int().nonnegative(),
  favoriteProjects: z.number().int().nonnegative(),
  followedProjects: z.number().int().nonnegative(),
  projectsWithPac: z.number().int().nonnegative(),
  observationsTotal: z.number().int().nonnegative(),
  newObservations7d: z.number().int().nonnegative(),
  byRegion: z.array(ChartPointSchema),
  byStatus: z.array(ChartPointSchema),
  observationsByMonth: z.array(MonthlyPointSchema),
  recentProjects: z.array(ProjectSummarySchema),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
export type ChartPoint = z.infer<typeof ChartPointSchema>;
export type MonthlyPoint = z.infer<typeof MonthlyPointSchema>;
