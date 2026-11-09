import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ReportService } from '../src/infrastructure/exporters/report-service';
import { noopLogger } from '../src/shared/logger';
import type { ProjectDetail } from '../src/shared/filters';

const now = '2026-01-20T12:00:00.000Z';

const detail: ProjectDetail = {
  project: {
    schemaVersion: 1,
    id: '2165225291',
    name: 'Parque Solar Alicanto',
    shortName: 'Alicanto',
    workflow: 'DIA',
    status: 'En Calificación',
    createdAt: now,
    updatedAt: now,
    owner: { name: 'PSF Alicanto Solar SpA' },
    location: { region: 'Región de Valparaíso', commune: 'Casablanca' },
    details: {
      investmentMM: 110_000_000,
      presentationDate: '2026-01-15',
      legalDays: 30,
      typologyDescription: 'Central solar fotovoltaica',
      description: 'Proyecto solar con almacenamiento BESS.',
    },
    pac: { enabled: true, recordsTotal: 1, observationsTotal: 1, lastRecordAt: '2026-01-18' },
    tracking: { favorite: true, critical: false, followed: true, tags: ['energia'] },
    links: { sheet: 'https://example.com', dossier: '', pac: '' },
  },
  pac: [
    {
      schemaVersion: 1,
      id: '1',
      projectId: '2165225291',
      it: 1,
      register: '2026-01-1',
      title: 'Observación Ciudadana',
      kind: 'observacion',
      from: 'Junta de Vecinos',
      recipientsCount: 0,
      link: 'https://example.com/doc',
      recordDate: '2026-01-18T10:00:00',
      contentType: 'html',
      createdAt: now,
      updatedAt: now,
    },
  ],
  observations: [
    {
      schemaVersion: 1,
      id: 'OBS-1',
      projectId: '2165225291',
      documentId: '1',
      sender: 'Junta de Vecinos',
      date: '2026-01-18',
      subject: 'Observación Ciudadana',
      category: 'Turismo',
      subcategory: 'Paisaje',
      importance: 0.81,
      sentiment: 'negative',
      summary: 'Posible afectación paisajística.',
      content: 'Texto completo sobre turismo y paisaje.',
      sourceUrl: 'https://example.com/doc',
      classifiedBy: 'rule',
      keywords: ['turismo', 'paisaje'],
      createdAt: now,
      updatedAt: now,
    },
  ],
  timeline: [
    {
      id: 'pac:1',
      date: '2026-01-18',
      type: 'NEW_OBSERVATION',
      title: 'Observación Ciudadana',
      description: 'Junta de Vecinos',
    },
  ],
  notes: [
    {
      schemaVersion: 1,
      id: 'note-1',
      projectId: '2165225291',
      author: 'Carlos Campos',
      priority: 'high',
      createdAt: now,
      updatedAt: now,
      content: 'Revisar implicancias.',
      tags: ['energia'],
      status: { done: false },
    },
  ],
};

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'seia-reports-test-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('ReportService', () => {
  it('genera CSV, XLSX, Markdown y HTML', async () => {
    const service = new ReportService(root, undefined, noopLogger);

    const csv = await service.generate(detail, 'csv');
    const csvContent = await readFile(csv.path, 'utf8');
    expect(csvContent).toContain('"Turismo"');
    expect(csvContent).toContain('"Junta de Vecinos"');

    const xlsx = await service.generate(detail, 'xlsx');
    const xlsxBuffer = await readFile(xlsx.path);
    expect(xlsxBuffer.subarray(0, 2).toString()).toBe('PK');
    expect(xlsxBuffer.length).toBeGreaterThan(1000);

    const markdown = await service.generate(detail, 'markdown');
    const md = await readFile(markdown.path, 'utf8');
    expect(md).toContain('# Parque Solar Alicanto');
    expect(md).toContain('## Observaciones ciudadanas');

    const html = await service.generate(detail, 'html');
    const htmlContent = await readFile(html.path, 'utf8');
    expect(htmlContent).toContain('<!doctype html>');
    expect(htmlContent).toContain('Parque Solar Alicanto');
    expect(htmlContent).toContain('Turismo');
  });

  it('rechaza PDF si no hay impresora de escritorio', async () => {
    const service = new ReportService(root, undefined, noopLogger);
    await expect(service.generate(detail, 'pdf')).rejects.toThrow(/escritorio/);
  });
});
