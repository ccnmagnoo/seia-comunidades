import type { PacDocument } from '../pac/pac-document';
import type { Project } from '../project/project';
import type { Note } from '../note/note';
import type { TimelineEvent } from './timeline';
import type { TimelineEventType } from '../common/schemas';
import { toIsoDay } from '../common/dates';

const KIND_TO_TYPE: Record<string, TimelineEventType> = {
  solicitud_pac: 'PAC_STARTED',
  observacion: 'NEW_OBSERVATION',
  informe: 'PAC_REPORT',
  resolucion: 'RESOLUTION',
  registro: 'REGISTRY',
  notificacion: 'DOCUMENT',
  acreditacion: 'DOCUMENT',
  otro: 'DOCUMENT',
};

export function buildTimeline(
  project: Project,
  documents: PacDocument[],
  notes: Note[] = [],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const seen = new Set<string>();

  const submitted = toIsoDay(project.details.presentationDate);
  if (submitted) {
    push(events, seen, {
      id: `project:${project.id}:submitted`,
      date: submitted,
      type: 'PROJECT_SUBMITTED',
      title: 'Ingreso al SEIA',
      description: `${project.workflow} · ${project.details.reason ?? 'Ingreso al SEIA'}`,
      sourceUrl: project.links.sheet,
    });
  }

  for (const document of documents) {
    const date = toIsoDay(document.recordDate);
    if (!date) continue;
    const type = KIND_TO_TYPE[document.kind] ?? 'DOCUMENT';
    push(events, seen, {
      id: `pac:${document.id}`,
      date,
      type,
      title: document.title,
      description: buildDocumentDescription(document),
      sourceUrl: document.link,
    });
  }

  for (const note of notes) {
    const date = toIsoDay(note.createdAt);
    if (!date) continue;
    push(events, seen, {
      id: `note:${note.id}`,
      date,
      type: 'NOTE',
      title: `Nota interna: ${note.priority}`,
      description: note.content.slice(0, 240),
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function buildDocumentDescription(document: PacDocument): string {
  const parts = [
    document.register ? `Registro ${document.register}` : undefined,
    document.from ? `Desde ${document.from}` : undefined,
    document.recipientsCount > 0
      ? `${document.recipientsCount} destinatario(s)`
      : undefined,
  ].filter(Boolean);
  return parts.join(' · ') || document.kind;
}

function push(
  events: TimelineEvent[],
  seen: Set<string>,
  event: TimelineEvent,
): void {
  if (seen.has(event.id)) return;
  seen.add(event.id);
  events.push(event);
}
