import type { ProjectDetail } from '../../shared/filters';

export const REPORT_FORMATS = ['csv', 'xlsx', 'markdown', 'html', 'pdf'] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface ReportResult {
  path: string;
  format: ReportFormat;
  fileName: string;
}

export interface PdfPrinter {
  print(html: string, outputPath: string): Promise<void>;
}

export interface ReportService {
  generate(detail: ProjectDetail, format: ReportFormat): Promise<ReportResult>;
}
