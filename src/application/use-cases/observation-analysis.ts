import { randomUUID } from 'node:crypto';
import type { ObservationAnnotationRepository } from '../../infrastructure/repositories/annotation-repository';
import type { EventBus } from '../../shared/events';
import type {
  ObservationAnalysisPatch,
  ObservationCommentDelete,
  ObservationCommentInput,
  ObservationCommentUpdate,
} from '../../shared/filters';
import type { ObservationAnnotation } from '../../domain/observation/annotation';
import { defaultAnnotation } from '../../domain/observation/annotation';
import { NotFoundError, ValidationError } from '../../shared/errors';

export class UpdateObservationAnalysisCommand {
  constructor(
    private readonly annotations: ObservationAnnotationRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(
    projectId: string,
    observationId: string,
    patch: ObservationAnalysisPatch,
  ): Promise<ObservationAnnotation> {
    const existing = await this.annotations.get(projectId, observationId);
    const now = new Date().toISOString();
    const base = existing ?? defaultAnnotation(projectId, observationId);

    const annotation: ObservationAnnotation = {
      ...base,
      projectId,
      observationId,
      flagged: patch.flagged ?? base.flagged,
      status: patch.status ?? base.status,
      updatedAt: now,
    };

    await this.annotations.save(annotation);
    await this.emit(annotation);
    return annotation;
  }

  private async emit(annotation: ObservationAnnotation): Promise<void> {
    await this.bus.emit('OBSERVATION_ANNOTATED', { annotation });
    await this.bus.emit('DATA_CHANGED', {
      reason: 'observation-analysis',
      projectId: annotation.projectId,
    });
  }
}

export class AddObservationCommentCommand {
  constructor(
    private readonly annotations: ObservationAnnotationRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(input: ObservationCommentInput): Promise<ObservationAnnotation> {
    const content = input.content.trim();
    const author = input.author.trim() || 'Operador local';
    if (!content) throw new ValidationError('El comentario no puede estar vacío.');

    const existing = await this.annotations.get(input.projectId, input.observationId);
    const base = existing ?? defaultAnnotation(input.projectId, input.observationId);
    const now = new Date().toISOString();

    const annotation: ObservationAnnotation = {
      ...base,
      updatedAt: now,
      comments: [
        ...base.comments,
        {
          id: `cmt-${randomUUID()}`,
          author,
          content,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };

    await this.annotations.save(annotation);
    await this.emit(annotation);
    return annotation;
  }

  private async emit(annotation: ObservationAnnotation): Promise<void> {
    await this.bus.emit('OBSERVATION_ANNOTATED', { annotation });
    await this.bus.emit('DATA_CHANGED', {
      reason: 'observation-comment-added',
      projectId: annotation.projectId,
    });
  }
}

export class UpdateObservationCommentCommand {
  constructor(
    private readonly annotations: ObservationAnnotationRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(input: ObservationCommentUpdate): Promise<ObservationAnnotation> {
    const content = input.content.trim();
    if (!content) throw new ValidationError('El comentario no puede estar vacío.');

    const annotation = await this.annotations.get(input.projectId, input.observationId);
    if (!annotation) throw new NotFoundError('La observación no tiene anotaciones.');

    const comment = annotation.comments.find((item) => item.id === input.commentId);
    if (!comment) throw new NotFoundError('Comentario no encontrado.');

    const updated: ObservationAnnotation = {
      ...annotation,
      updatedAt: new Date().toISOString(),
      comments: annotation.comments.map((item) =>
        item.id === input.commentId
          ? { ...item, content, updatedAt: new Date().toISOString() }
          : item,
      ),
    };

    await this.annotations.save(updated);
    await this.emit(updated);
    return updated;
  }

  private async emit(annotation: ObservationAnnotation): Promise<void> {
    await this.bus.emit('OBSERVATION_ANNOTATED', { annotation });
    await this.bus.emit('DATA_CHANGED', {
      reason: 'observation-comment-updated',
      projectId: annotation.projectId,
    });
  }
}

export class DeleteObservationCommentCommand {
  constructor(
    private readonly annotations: ObservationAnnotationRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(input: ObservationCommentDelete): Promise<ObservationAnnotation> {
    const annotation = await this.annotations.get(input.projectId, input.observationId);
    if (!annotation) throw new NotFoundError('La observación no tiene anotaciones.');

    if (!annotation.comments.some((item) => item.id === input.commentId)) {
      throw new NotFoundError('Comentario no encontrado.');
    }

    const updated: ObservationAnnotation = {
      ...annotation,
      updatedAt: new Date().toISOString(),
      comments: annotation.comments.filter((item) => item.id !== input.commentId),
    };

    await this.annotations.save(updated);
    await this.bus.emit('OBSERVATION_ANNOTATED', { annotation: updated });
    await this.bus.emit('DATA_CHANGED', {
      reason: 'observation-comment-deleted',
      projectId: updated.projectId,
    });
    return updated;
  }
}
