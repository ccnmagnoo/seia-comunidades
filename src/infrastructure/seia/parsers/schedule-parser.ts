import { load } from 'cheerio';
import type { EvaluationSchedule } from '../../../application/ports/seia-gateway';
import { normalizeText } from '../../../domain/common/text';

export function parseSchedule(html: string): EvaluationSchedule {
  const $ = load(html);
  const text = $.root().text();
  const normalized = normalizeText(text);

  const legalDays = numberNear($, 'plazo evaluacion') ?? numberNear($, 'dias legales') ?? 0;
  const elapsedDays = numberNear($, 'dias transcurridos') ?? 0;
  const suspendedDays = numberNear($, 'dias suspendidos') ?? 0;
  const remainingDays =
    numberNear($, 'dias restantes') ?? Math.max(0, legalDays - elapsedDays + suspendedDays);

  const status = normalized.includes('vencido')
    ? 'expired'
    : normalized.includes('suspend') || normalized.includes('suspendido')
      ? 'suspended'
      : 'active';

  return {
    legalDays,
    elapsedDays,
    suspendedDays,
    remainingDays,
    status,
  };
}

function numberNear(
  $: ReturnType<typeof load>,
  label: string,
): number | undefined {
  const target = normalizeText(label);
  const candidates = $('td, th, div, span, p, li').toArray();

  for (const element of candidates) {
    const own = normalizeText($(element).text());
    if (!own.includes(target)) continue;
    const parentText = normalizeText($(element).parent().text());
    const numbers = [...parentText.matchAll(/\b(\d{1,4})\b/g)]
      .map((match) => Number(match[1]))
      .filter((value) => Number.isFinite(value));
    if (numbers.length > 0) return numbers[numbers.length - 1];
  }
  return undefined;
}
