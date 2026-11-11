import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import type {
  ReportFormat,
  ReportResult,
  PdfPrinter,
  ReportService as ReportServicePort,
} from '../../application/ports/report-service';
import type { ProjectDetail } from '../../shared/filters';
import type { Logger } from '../../shared/logger';
import { AppError } from '../../shared/errors';
import {
  buildCsvReport,
  buildHtmlReport,
  buildMarkdownReport,
} from './report-templates';

const EXTENSIONS: Record<ReportFormat, string> = {
  csv: 'csv',
  xlsx: 'xlsx',
  markdown: 'md',
  html: 'html',
  pdf: 'pdf',
};

export class ReportService implements ReportServicePort {
  constructor(
    private readonly exportsDir: string,
    private readonly pdfPrinter: PdfPrinter | undefined,
    private readonly logger: Logger,
  ) {}

  async generate(detail: ProjectDetail, format: ReportFormat): Promise<ReportResult> {
    await mkdir(this.exportsDir, { recursive: true });
    const generatedAt = new Date().toISOString();
    const fileName = `${baseName(detail)}.${EXTENSIONS[format]}`;
    const outputPath = join(this.exportsDir, fileName);

    switch (format) {
      case 'csv':
        await writeFile(outputPath, `\uFEFF${buildCsvReport(detail)}`, 'utf8');
        break;
      case 'markdown':
        await writeFile(outputPath, buildMarkdownReport(detail, generatedAt), 'utf8');
        break;
      case 'html':
        await writeFile(outputPath, buildHtmlReport(detail, generatedAt), 'utf8');
        break;
      case 'xlsx':
        await this.writeXlsx(detail, outputPath);
        break;
      case 'pdf': {
        if (!this.pdfPrinter) {
          throw new AppError(
            'IO_ERROR',
            'La generación de PDF solo está disponible dentro de la aplicación de escritorio.',
          );
        }
        await this.pdfPrinter.print(buildHtmlReport(detail, generatedAt), outputPath);
        break;
      }
      default:
        throw new AppError('VALIDATION_ERROR', `Formato no soportado: ${String(format)}`);
    }

    this.logger.info('Reporte generado', { format, projectId: detail.project.id, fileName });
    return { path: outputPath, format, fileName };
  }

  private async writeXlsx(detail: ProjectDetail, outputPath: string): Promise<void> {
    const { project, pac, observations, timeline, notes } = detail;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SEIA Comunidades';
    workbook.created = new Date();

    const summary = workbook.addWorksheet('Resumen');
    summary.columns = [
      { header: 'Campo', key: 'field', width: 32 },
      { header: 'Valor', key: 'value', width: 70 },
    ];
    const rows: Array<[string, string | number]> = [
      ['Expediente', project.id],
      ['Nombre', project.name],
      ['Titular', project.owner.name],
      ['Región', project.location.region],
      ['Comuna', project.location.commune],
      ['Estado', project.status],
      ['Workflow', project.workflow],
      ['Inversión (USD)', project.details.investmentMM ?? ''],
      ['Fecha presentación', project.details.presentationDate ?? ''],
      ['Días legales', project.details.legalDays ?? ''],
      ['Tipología', project.details.typologyDescription ?? project.details.typology ?? ''],
      ['Documentos PAC', pac.length],
      ['Observaciones', observations.length],
      ['Último registro PAC', project.pac.lastRecordAt ?? ''],
      ['Descripción', project.details.description ?? ''],
    ];
    summary.addRows(rows.map(([field, value]) => ({ field, value })));

    const documents = workbook.addWorksheet('Documentos PAC');
    documents.columns = [
      { header: '#', key: 'it', width: 8 },
      { header: 'ID', key: 'id', width: 18 },
      { header: 'Registro', key: 'register', width: 18 },
      { header: 'Tipo', key: 'kind', width: 16 },
      { header: 'Título', key: 'title', width: 60 },
      { header: 'Remitente', key: 'from', width: 34 },
      { header: 'Destinatarios', key: 'recipients', width: 14 },
      { header: 'Fecha', key: 'date', width: 20 },
      { header: 'URL', key: 'url', width: 70 },
    ];
    documents.addRows(
      pac.map((document) => ({
        it: document.it,
        id: document.id,
        register: document.register,
        kind: document.kind,
        title: document.title,
        from: document.from,
        recipients: document.recipientsCount,
        date: document.recordDate,
        url: document.link,
      })),
    );

    const observationsSheet = workbook.addWorksheet('Observaciones');
    observationsSheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Remitente', key: 'sender', width: 34 },
      { header: 'Categoría', key: 'category', width: 18 },
      { header: 'Subcategoría', key: 'subcategory', width: 18 },
      { header: 'Sentimiento', key: 'sentiment', width: 14 },
      { header: 'Importancia', key: 'importance', width: 12 },
      { header: 'Resumen', key: 'summary', width: 60 },
      { header: 'Contenido', key: 'content', width: 100 },
      { header: 'URL', key: 'url', width: 70 },
      { header: 'Marcada', key: 'flagged', width: 10 },
      { header: 'Estado revisión', key: 'reviewStatus', width: 16 },
      { header: 'Comentarios', key: 'commentsCount', width: 12 },
    ];
    observationsSheet.addRows(
      observations.map((observation) => ({
        id: observation.id,
        date: observation.date,
        sender: observation.sender,
        category: observation.category,
        subcategory: observation.subcategory ?? '',
        sentiment: observation.sentiment,
        importance: observation.importance,
        summary: observation.summary,
        content: observation.content,
        url: observation.sourceUrl,
        flagged: observation.analysis?.flagged ? 'Sí' : 'No',
        reviewStatus: reviewStatusLabel(observation.analysis?.status ?? 'pending'),
        commentsCount: observation.analysis?.comments.length ?? 0,
      })),
    );

    const commentsSheet = workbook.addWorksheet('Comentarios analista');
    commentsSheet.columns = [
      { header: 'Observación', key: 'observationId', width: 20 },
      { header: 'Remitente', key: 'sender', width: 34 },
      { header: 'Autor', key: 'author', width: 24 },
      { header: 'Fecha', key: 'createdAt', width: 22 },
      { header: 'Comentario', key: 'content', width: 100 },
    ];
    commentsSheet.addRows(
      observations.flatMap((observation) =>
        (observation.analysis?.comments ?? []).map((comment) => ({
          observationId: observation.id,
          sender: observation.sender,
          author: comment.author,
          createdAt: comment.createdAt,
          content: comment.content,
        })),
      ),
    );

    const timelineSheet = workbook.addWorksheet('Timeline');
    timelineSheet.columns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Tipo', key: 'type', width: 20 },
      { header: 'Título', key: 'title', width: 60 },
      { header: 'Descripción', key: 'description', width: 80 },
      { header: 'Fuente', key: 'source', width: 70 },
    ];
    timelineSheet.addRows(
      timeline.map((event) => ({
        date: event.date,
        type: event.type,
        title: event.title,
        description: event.description ?? '',
        source: event.sourceUrl ?? '',
      })),
    );

    const notesSheet = workbook.addWorksheet('Notas');
    notesSheet.columns = [
      { header: 'Autor', key: 'author', width: 24 },
      { header: 'Prioridad', key: 'priority', width: 12 },
      { header: 'Creada', key: 'createdAt', width: 22 },
      { header: 'Actualizada', key: 'updatedAt', width: 22 },
      { header: 'Contenido', key: 'content', width: 100 },
      { header: 'Etiquetas', key: 'tags', width: 30 },
      { header: 'Completada', key: 'done', width: 12 },
      { header: 'Vence', key: 'dueDate', width: 14 },
    ];
    notesSheet.addRows(
      notes.map((note) => ({
        author: note.author,
        priority: note.priority,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        content: note.content,
        tags: note.tags.join(', '),
        done: note.status.done ? 'Sí' : 'No',
        dueDate: note.status.dueDate ?? '',
      })),
    );

    for (const sheet of workbook.worksheets) {
      const header = sheet.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' },
      };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    await workbook.xlsx.writeFile(outputPath);
  }
}

function baseName(detail: ProjectDetail): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15);
  return `${detail.project.id}-${slugify(detail.project.shortName || detail.project.name)}-${timestamp}`;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'reporte';
}

function reviewStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    reviewed: 'Revisada',
    relevant: 'Relevante',
    dismissed: 'Descartada',
  };
  return labels[status] ?? status;
}
