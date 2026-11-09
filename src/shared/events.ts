import type { Note } from '../domain/note/note';
import type { Observation } from '../domain/observation/observation';
import type { Project } from '../domain/project/project';

export interface DomainEventMap {
  PROJECT_UPSERTED: { project: Project; created: boolean };
  PROJECT_DETAILS_SYNCED: { project: Project };
  OBSERVATION_CLASSIFIED: { observation: Observation };
  NOTE_SAVED: { note: Note };
  NOTE_REMOVED: { projectId: string; noteId: string };
  DATA_CHANGED: { reason: string; projectId?: string };
}

type Handler<T> = (payload: T) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<keyof DomainEventMap, Set<Handler<never>>>();

  on<K extends keyof DomainEventMap>(event: K, handler: Handler<DomainEventMap[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set<Handler<never>>();
    set.add(handler as Handler<never>);
    this.handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  async emit<K extends keyof DomainEventMap>(event: K, payload: DomainEventMap[K]): Promise<void> {
    const set = this.handlers.get(event);
    if (!set) return;
    const results = await Promise.allSettled(
      [...set].map((handler) => (handler as Handler<DomainEventMap[K]>)(payload)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(`Event handler failed for ${String(event)}`, result.reason);
      }
    }
  }
}
