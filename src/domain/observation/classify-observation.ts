import type { ObservationCategory, Sentiment } from '../common/schemas';
import { normalizeText, truncate } from '../common/text';

export const CATEGORY_KEYWORDS: Record<Exclude<ObservationCategory, 'Sin clasificar'>, string[]> = {
  Agua: [
    'agua', 'hidrico', 'hidrica', 'acuifero', 'napas', 'riego', 'estero', 'humedal',
    'caudal', 'cuenca', 'vertiente', 'consumo de agua', 'calidad del agua',
  ],
  Turismo: [
    'turismo', 'turista', 'turistica', 'visitantes', 'atractivo turistico',
    'actividad turistica', 'hoteleria', 'patrimonio turistico',
  ],
  Patrimonio: [
    'patrimonio', 'arqueologico', 'arqueologia', 'cultural', 'monumento',
    'historico', 'paleontologico', 'pueblos originarios', 'sitio arqueologico',
  ],
  Biodiversidad: [
    'biodiversidad', 'fauna', 'flora', 'vegetacion', 'especie', 'habitat',
    'ecosistema', 'avifauna', 'reptiles', 'anfibios', 'bosque nativo',
  ],
  Energía: [
    'energia', 'electrico', 'electrica', 'solar', 'eolico', 'hidrogeno',
    'baterias', 'bess', 'transmision', 'generacion', 'subestacion', 'fotovoltaico',
  ],
  Salud: [
    'salud', 'sanitario', 'enfermedad', 'respiratorio', 'poblacion vulnerable',
    'calidad de vida', 'bienestar', 'epidemiologico',
  ],
  Paisaje: [
    'paisaje', 'visual', 'impacto visual', 'cuenca visual', 'estetica',
    'valor paisajistico', 'panorama', 'beltrami',
  ],
  Comunidad: [
    'comunidad', 'vecinos', 'junta de vecinos', 'participacion', 'consulta',
    'organizacion social', 'pueblo', 'localidad', 'territorio',
  ],
  Riesgos: [
    'riesgo', 'emergencia', 'incendio', 'explosion', 'derrame', 'accidente',
    'seguridad', 'vulnerabilidad', 'evacuacion', 'sismo', 'aluvion',
  ],
  Transporte: [
    'transporte', 'trafico', 'vehicular', 'camiones', 'ruta', 'camino',
    'acceso', 'movilidad', 'congestion', 'peatonal',
  ],
  Ruido: [
    'ruido', 'acustico', 'decibeles', 'sonoro', 'vibracion', 'molestia auditiva',
    'contaminacion acustica',
  ],
  Aire: [
    'aire', 'atmosfera', 'emisiones', 'material particulado', 'mp10', 'mp2.5',
    'gases', 'calidad del aire', 'polvo', 'humos',
  ],
};

const NEGATIVE_WORDS = [
  'afectacion', 'impacto', 'riesgo', 'molestia', 'rechazo', 'preocupacion',
  'contaminacion', 'daño', 'perjuicio', 'negativo', 'no estamos de acuerdo',
  'oposicion', 'peligro',
];

const POSITIVE_WORDS = [
  'apoyo', 'favorable', 'beneficio', 'positivo', 'acuerdo', 'desarrollo',
  'empleo', 'inversion', 'mejora',
];

export interface ObservationClassification {
  category: string;
  subcategory?: string;
  importance: number;
  sentiment: Sentiment;
  summary: string;
  keywords: string[];
}

export function classifyObservation(content: string): ObservationClassification {
  const normalized = normalizeText(content);

  const scores = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => {
    const matches = keywords.filter((keyword) => normalized.includes(keyword));
    const occurrences = matches.reduce(
      (total, keyword) => total + countOccurrences(normalized, keyword),
      0,
    );
    return {
      category,
      keywords: matches,
      score: matches.length + occurrences * 0.25,
    };
  });

  scores.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
  const best = scores[0];
  const second = scores[1];

  const matchedKeywords = scores
    .flatMap((entry) => entry.keywords)
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
    .slice(0, 8);

  const negativeCount = NEGATIVE_WORDS.filter((word) => normalized.includes(word)).length;
  const positiveCount = POSITIVE_WORDS.filter((word) => normalized.includes(word)).length;
  const sentiment: Sentiment =
    negativeCount > positiveCount ? 'negative' : positiveCount > negativeCount ? 'positive' : 'neutral';

  const topScore = best?.score ?? 0;
  const importance = Math.max(0.2, Math.min(0.95, 0.3 + topScore * 0.08));

  return {
    category: topScore > 0 && best ? best.category : 'Sin clasificar',
    subcategory:
      second && second.score >= 2 && second.category !== best?.category
        ? second.category
        : undefined,
    importance: Number(importance.toFixed(2)),
    sentiment,
    summary: summarize(content),
    keywords: matchedKeywords,
  };
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function summarize(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean;
  return truncate(firstSentence, 320);
}
