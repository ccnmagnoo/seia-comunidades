import type { DocumentKind } from '../common/schemas';
import { normalizeText } from '../common/text';

const RULES: Array<{ kind: DocumentKind; patterns: RegExp[] }> = [
  {
    kind: 'solicitud_pac',
    patterns: [/inicio de pac/, /solicitud de (?:inicio de )?pac/, /solicita(?:cion)? pac/],
  },
  {
    kind: 'observacion',
    patterns: [/observacion(?:es)?(?: ciudadana)?/, /observaciones de la comunidad/],
  },
  {
    kind: 'resolucion',
    patterns: [/resolucion/, /\brca\b/, /calificacion ambiental/],
  },
  {
    kind: 'informe',
    patterns: [/\binforme\b/, /informe consolidado/, /informe tecnico/],
  },
  {
    kind: 'registro',
    patterns: [/\bregistro\b/, /publicacion en diario oficial/],
  },
  {
    kind: 'notificacion',
    patterns: [/notificacion/],
  },
  {
    kind: 'acreditacion',
    patterns: [/acreditacion/, /aviso radial/],
  },
];

export function classifyDocumentTitle(title: string, register = ''): DocumentKind {
  const normalized = normalizeText(`${title} ${register}`);
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.kind;
    }
  }
  return 'otro';
}

export function isObservationDocument(kind: DocumentKind): boolean {
  return kind === 'observacion';
}
