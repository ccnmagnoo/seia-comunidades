import { load } from 'cheerio';
import type { Recipient } from '../../../application/ports/seia-gateway';
import { collapseWhitespace } from '../../../domain/common/text';

export function parseRecipients(html: string): Recipient[] {
  const $ = load(html);
  const cells = $('table.tablaFichaInterna td, table.tablaFichaInterna th, table.table td')
    .map((_, element) => collapseWhitespace($(element).text()))
    .get()
    .filter(Boolean);

  const names = new Set<string>();
  for (const cell of cells) {
    const clean = cell.replace(/\s+/g, ' ').trim();
    if (clean.length < 3) continue;
    if (/^(nombre|destinatario|organismo|remitente|para)$/i.test(clean)) continue;
    names.add(clean);
  }

  return [...names].map((name) => ({ name }));
}
