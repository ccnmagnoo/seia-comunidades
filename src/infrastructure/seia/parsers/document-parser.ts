import { load } from 'cheerio';
import type { DocumentContent } from '../../../application/ports/seia-gateway';
import { collapseWhitespace } from '../../../domain/common/text';

const IGNORED_PREFIXES = [
  /^nombre\s*:/i,
  /^observaci[oó]n(?:es)?\s*:/i,
  /^firmas?(?:\s+electr[oó]nicas)?\s*:/i,
  /^firmado por\s*:/i,
  /^el documento original est[aá] disponible/i,
  /^descargar xml$/i,
  /^imprimir$/i,
  /^ver informaci[oó]n firma$/i,
  /^https?:\/\//i,
  /^firmas?\s+electr[oó]nicas/i,
];

export function parseDocumentContent(html: string): DocumentContent {
  const $ = load(html);
  const paragraphs = $('p')
    .map((_, element) => collapseWhitespace($(element).text()))
    .get()
    .map(cleanArtifacts)
    .filter(Boolean);

  const lines = dedupe(paragraphs);

  const senderLine = lines.find((line) => /^nombre\s*:/i.test(line));
  const sender = senderLine
    ? senderLine.replace(/^nombre\s*:\s*/i, '').trim() || 'Ciudadano/a'
    : 'Ciudadano/a';

  const contentLines = lines.filter((line) => {
    if (line.endsWith(']')) return false;
    if (IGNORED_PREFIXES.some((pattern) => pattern.test(line))) return false;
    return line.length > 0;
  });

  const content = (contentLines.length > 0 ? contentLines : lines).join('\n\n').trim();
  return { sender, content };
}

function cleanArtifacts(value: string): string {
  return collapseWhitespace(
    value
      .replace(/<\?javax\.xml\.transform\.[^?]*\?>/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/^[-–—\s]+/, '')
      .trim(),
  );
}

function dedupe(values: string[]): string[] {
  const output: string[] = [];
  for (const value of values) {
    if (value && output[output.length - 1] !== value) output.push(value);
  }
  return output;
}
