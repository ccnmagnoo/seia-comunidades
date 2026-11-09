import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatInt(value: number | undefined | null): string {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('es-CL').format(value);
}

export function formatMoney(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelative(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function openExternal(url: string | undefined): void {
  if (!url) return;
  void window.seia.openExternal(url);
}

export function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    solicitud_pac: 'Solicitud PAC',
    observacion: 'Observación',
    informe: 'Informe',
    resolucion: 'Resolución',
    registro: 'Registro',
    notificacion: 'Notificación',
    acreditacion: 'Acreditación',
    otro: 'Documento',
  };
  return labels[kind] ?? kind;
}

export function sentimentLabel(sentiment: string): string {
  return sentiment === 'positive'
    ? 'Positivo'
    : sentiment === 'negative'
      ? 'Negativo'
      : 'Neutral';
}
