export type BadgeTone = 'default' | 'slate' | 'green' | 'amber' | 'red' | 'violet';

export function statusVariant(status: string): BadgeTone {
  const normalized = status.toLowerCase();
  if (normalized.includes('aprobado')) return 'green';
  if (normalized.includes('rechazado') || normalized.includes('no admitido')) return 'red';
  if (normalized.includes('calificación') || normalized.includes('calificacion')) return 'amber';
  if (normalized.includes('admisión') || normalized.includes('admision')) return 'violet';
  return 'slate';
}

export function kindVariant(kind: string): BadgeTone {
  switch (kind) {
    case 'observacion':
      return 'amber';
    case 'solicitud_pac':
      return 'violet';
    case 'informe':
      return 'default';
    case 'resolucion':
      return 'green';
    case 'registro':
      return 'slate';
    default:
      return 'slate';
  }
}

export function sentimentVariant(sentiment: string): BadgeTone {
  if (sentiment === 'positive') return 'green';
  if (sentiment === 'negative') return 'red';
  return 'slate';
}

export function timelineLabel(type: string): string {
  const labels: Record<string, string> = {
    PROJECT_SUBMITTED: 'Ingreso',
    PAC_STARTED: 'Inicio PAC',
    NEW_OBSERVATION: 'Observación',
    PAC_REPORT: 'Informe PAC',
    RESOLUTION: 'Resolución',
    REGISTRY: 'Registro',
    DOCUMENT: 'Documento',
    NOTE: 'Nota interna',
  };
  return labels[type] ?? type;
}

export function timelineVariant(type: string): BadgeTone {
  switch (type) {
    case 'NEW_OBSERVATION':
      return 'amber';
    case 'PAC_STARTED':
      return 'violet';
    case 'RESOLUTION':
      return 'green';
    case 'PROJECT_SUBMITTED':
      return 'default';
    default:
      return 'slate';
  }
}
