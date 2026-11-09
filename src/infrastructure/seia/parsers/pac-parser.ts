import { load } from 'cheerio';
import type { PacDocumentRecord } from '../../../application/ports/seia-gateway';
import { parseChileanDate } from '../../../domain/common/dates';
import { classifyDocumentTitle } from '../../../domain/pac/classify-document';
import { collapseWhitespace } from '../../../domain/common/text';

const DATE_TEXT = /\d{1,2}\/\d{1,2}\/\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/;

export function parsePacDocuments(html: string, baseUrl: string): PacDocumentRecord[] {
  const $ = load(html);
  let rows = $('table.tabla-dinamica_pac tbody tr').toArray();
  if (rows.length === 0) rows = $('table.tabla-dinamica_pac tr').toArray();

  const documents: PacDocumentRecord[] = [];

  rows.forEach((row, rowIndex) => {
    const cells = $(row).find('td').toArray();
    if (cells.length < 5) return;

    const texts = cells.map((cell) => collapseWhitespace($(cell).text()));
    const dateIndex = texts.findIndex((text) => DATE_TEXT.test(text));
    if (dateIndex < 0) return;

    let titleIndex = -1;
    for (let index = 0; index < cells.length; index += 1) {
      if (index === dateIndex) continue;
      const cell = cells[index];
      if (!cell) continue;
      const anchor = $(cell).find('a').first();
      if (anchor.length === 0) continue;
      const href = anchor.attr('href') ?? '';
      const text = collapseWhitespace(anchor.text());
      if (!text || /destinatari/i.test(text) || /verDestinatarios/i.test(href)) continue;
      if (index >= 2) {
        titleIndex = index;
        break;
      }
    }
    if (titleIndex < 0 && cells.length > 3) titleIndex = 3;
    if (titleIndex < 0) return;

    const titleCell = cells[titleIndex];
    if (!titleCell) return;
    const anchor = $(titleCell).find('a').first();
    const title = collapseWhitespace(anchor.text()) || (texts[titleIndex] ?? '');
    if (!title) return;

    const link = absoluteUrl(anchor.attr('href') ?? '', baseUrl);
    const recipientsIndex = texts.findIndex((text) => /destinatari/i.test(text));
    const recipientsCell = recipientsIndex >= 0 ? cells[recipientsIndex] : undefined;
    const recipientsHtml = recipientsCell ? $.html(recipientsCell) : '';
    const recipientsUrl = extractRecipientsUrl(recipientsHtml, baseUrl);
    const recipientsCount = parseLeadingNumber(
      recipientsIndex >= 0 ? (texts[recipientsIndex] ?? '') : '',
    );

    const dateText = texts[dateIndex] ?? '';
    const recordDate = parseChileanDate(dateText) ?? dateText;
    const register = texts[2] ?? '';
    const from = texts[4] ?? '';
    const it = Number(texts[0]) || rowIndex + 1;
    const documentId = extractDocumentId(link) ?? `pac-${it}-${dateSlug(recordDate)}`;

    documents.push({
      id: documentId,
      it,
      register,
      title,
      kind: classifyDocumentTitle(title, register),
      from,
      recipientsCount,
      recipientsUrl,
      link,
      recordDate,
      contentType: detectContentType(link),
    });
  });

  return documents.sort((a, b) => a.it - b.it);
}

function extractDocumentId(link: string): string | undefined {
  const match = /(?:idDocumento|id_documento)=(\d+)/i.exec(link);
  return match?.[1];
}

function extractRecipientsUrl(html: string, baseUrl: string): string | undefined {
  const match = /(?:https?:\/\/[^"'\s]+)?\/documentos\/verDestinatarios\.php\?id_documento=(\d+)/i.exec(
    html,
  );
  if (!match?.[1]) return undefined;
  return `${baseUrl}/documentos/verDestinatarios.php?id_documento=${match[1]}`;
}

function detectContentType(link: string): PacDocumentRecord['contentType'] {
  if (!link) return 'unknown';
  if (/documento\.php\?idDocumento=/i.test(link)) return 'html';
  if (/\.(pdf|zip|rar|docx?|xlsx?|csv)(?:[?#]|$)/i.test(link)) return 'file';
  return 'unknown';
}

function parseLeadingNumber(value: string): number {
  const match = /^(\d+)/.exec(value.trim());
  return match?.[1] ? Number(match[1]) : 0;
}

function dateSlug(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '').slice(0, 14) || 'sinfecha';
}

function absoluteUrl(value: string, baseUrl: string): string {
  if (!value || value.startsWith('javascript:') || value.startsWith('#')) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}
