import type { DocumentContent } from '../ports/seia-gateway';
import type { PacDocument } from '../../domain/pac/pac-document';
import type { Observation } from '../../domain/observation/observation';
import { classifyObservation } from '../../domain/observation/classify-observation';

export function mapPacDocumentToObservation(
  projectId: string,
  document: PacDocument,
  content: DocumentContent | null,
  existing: Observation | null,
  now: string,
): Observation {
  const text = content?.content?.trim() || document.title;
  const classification = classifyObservation(text);
  const preserveManual = existing?.classifiedBy === 'manual';

  return {
    schemaVersion: 1,
    id: `OBS-${document.id}`,
    projectId,
    documentId: document.id,
    sender: content?.sender || document.from || 'Ciudadano/a',
    date: document.recordDate.slice(0, 10),
    subject: document.title,
    category: preserveManual ? existing.category : classification.category,
    subcategory: preserveManual ? existing.subcategory : classification.subcategory,
    importance: preserveManual ? existing.importance : classification.importance,
    sentiment: preserveManual ? existing.sentiment : classification.sentiment,
    summary: preserveManual
      ? existing.summary
      : classification.summary || document.title,
    content: content?.content || existing?.content || '',
    sourceUrl: document.link,
    classifiedBy: existing?.classifiedBy ?? 'rule',
    keywords: preserveManual ? existing.keywords : classification.keywords,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
