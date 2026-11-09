import { load } from 'cheerio';
import type { ProjectSheet } from '../../../application/ports/seia-gateway';
import { collapseWhitespace } from '../../../domain/common/text';

export function parseProjectSheet(html: string): ProjectSheet {
  const $ = load(html);
  const candidates = [
    '.sg-description-file',
    '#descripcion',
    '.descripcion',
    '.sg-description',
  ];

  for (const selector of candidates) {
    const node = $(selector).first();
    if (node.length === 0) continue;
    const text = collapseWhitespace(node.text());
    if (text.length > 20) return { description: text };
  }

  const body = collapseWhitespace($('body').text());
  return body.length > 20 ? { description: body.slice(0, 12_000) } : {};
}
