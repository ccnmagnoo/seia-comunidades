const DD_MM_YYYY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseChileanDate(value: string): string | undefined {
  const clean = value.trim();
  if (!clean) return undefined;

  const ddmm = DD_MM_YYYY.exec(clean);
  if (ddmm) {
    const [, day, month, year, hours, minutes, seconds] = ddmm;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!isValidParts(y, m, d)) return undefined;
    const hh = hours ? Number(hours) : 0;
    const mi = minutes ? Number(minutes) : 0;
    const ss = seconds ? Number(seconds) : 0;
    return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mi)}:${pad(ss)}`;
  }

  const ymd = YYYY_MM_DD.exec(clean);
  if (ymd) {
    const [, year, month, day] = ymd;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return undefined;
}

export function toIsoDay(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = parseChileanDate(value);
  if (!parsed) return undefined;
  return parsed.slice(0, 10);
}

export function formatDate(value: string | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function isValidParts(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2200) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}
