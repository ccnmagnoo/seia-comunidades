import type {
  SeiaGateway,
  DocumentContent,
  PacDocumentRecord,
} from '../ports/seia-gateway';
import type { ProjectRepository } from '../../infrastructure/repositories/project-repository';
import type { PacDocumentRepository } from '../../infrastructure/repositories/pac-repository';
import type { ObservationRepository } from '../../infrastructure/repositories/observation-repository';
import type { NoteRepository } from '../../infrastructure/repositories/note-repository';
import type { TimelineRepository } from '../../infrastructure/repositories/timeline-repository';
import type { EventBus } from '../../shared/events';
import type { Logger } from '../../shared/logger';
import type { SyncDetailsResult, SyncProgress } from '../../shared/filters';
import type { PacDocument } from '../../domain/pac/pac-document';
import type { Project } from '../../domain/project/project';
import { buildTimeline } from '../../domain/timeline/build-timeline';
import { mapPacDocumentToObservation } from '../mappers/observation-mapper';

export class SyncProjectDetailsUseCase {
  constructor(
    private readonly gateway: SeiaGateway,
    private readonly projects: ProjectRepository,
    private readonly pacDocuments: PacDocumentRepository,
    private readonly observations: ObservationRepository,
    private readonly notes: NoteRepository,
    private readonly timelines: TimelineRepository,
    private readonly bus: EventBus,
    private readonly logger: Logger,
    private readonly fetchDocumentContent: boolean,
  ) {}

  async execute(
    projectId: string,
    onProgress?: (progress: SyncProgress) => void,
  ): Promise<SyncDetailsResult> {
    const warnings: string[] = [];
    const project = await this.projects.getOrThrow(projectId);
    const now = new Date().toISOString();

    onProgress?.({
      phase: 'project_started',
      message: `Sincronizando ${project.name}…`,
      projectId,
    });

    let description = project.details.description;
    try {
      const sheet = await this.gateway.getProjectSheet(projectId);
      description = sheet.description ?? description;
    } catch (error) {
      warnings.push(`No se pudo leer la ficha: ${errorMessage(error)}`);
      this.logger.warn('Error obteniendo ficha', { projectId, error: errorMessage(error) });
    }

    let records: PacDocumentRecord[] = [];
    try {
      records = await this.gateway.getPacDocuments(projectId);
    } catch (error) {
      warnings.push(`No se pudieron leer los documentos PAC: ${errorMessage(error)}`);
      this.logger.warn('Error obteniendo PAC', { projectId, error: errorMessage(error) });
    }

    onProgress?.({
      phase: 'project_started',
      message: `Procesando ${records.length} documentos PAC…`,
      projectId,
      current: 0,
      total: records.length,
    });

    const savedDocuments: PacDocument[] = [];
    let observationCount = 0;

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (!record) continue;

      try {
        const existingDocument = await this.pacDocuments.get(projectId, record.id);
        const existingObservation = await this.observations.get(
          projectId,
          `OBS-${record.id}`,
        );

        let content: DocumentContent | null = null;
        let contentFetchedAt = existingDocument?.contentFetchedAt;

        if (
          record.kind === 'observacion' &&
          record.contentType === 'html' &&
          this.fetchDocumentContent &&
          needsContentRefresh(existingDocument?.content)
        ) {
          try {
            content = await this.gateway.getDocumentContent(record.link, {
              forceRefresh: true,
            });
            contentFetchedAt = now;
          } catch (error) {
            warnings.push(
              `Observación ${record.id} sin texto: ${errorMessage(error)}`,
            );
          }
        } else if (existingDocument?.content) {
          content = {
            sender: existingObservation?.sender || existingDocument.from,
            content: existingDocument.content,
          };
        }

        const document: PacDocument = {
          schemaVersion: 1,
          id: record.id,
          projectId,
          it: record.it,
          register: record.register,
          title: record.title,
          kind: record.kind,
          from: record.from,
          recipientsCount: record.recipientsCount,
          recipientsUrl: record.recipientsUrl,
          link: record.link,
          recordDate: record.recordDate,
          contentType: record.contentType,
          content: content?.content ?? existingDocument?.content,
          contentFetchedAt,
          createdAt: existingDocument?.createdAt ?? now,
          updatedAt: now,
        };

        await this.pacDocuments.save(document);
        savedDocuments.push(document);

        if (record.kind === 'observacion') {
          const observation = mapPacDocumentToObservation(
            projectId,
            document,
            content,
            existingObservation,
            now,
          );
          await this.observations.save(observation);
          await this.bus.emit('OBSERVATION_CLASSIFIED', { observation });
          observationCount += 1;
        }
      } catch (error) {
        const message = errorMessage(error);
        warnings.push(`Documento ${record.id}: ${message}`);
        this.logger.warn('Error procesando documento PAC', {
          projectId,
          documentId: record.id,
          error: message,
        });
      }

      onProgress?.({
        phase: 'project_started',
        message: `Procesando documentos (${index + 1}/${records.length})…`,
        projectId,
        current: index + 1,
        total: records.length,
      });
    }

    const observations = await this.observations.list({ projectId });
    const notes = await this.notes.list(projectId);
    const lastRecordAt = savedDocuments
      .map((document) => document.recordDate)
      .filter(Boolean)
      .sort()
      .at(-1);

    const updatedProject: Project = {
      ...project,
      updatedAt: now,
      details: {
        ...project.details,
        description,
      },
      pac: {
        enabled: savedDocuments.length > 0,
        recordsTotal: savedDocuments.length,
        observationsTotal: observations.length,
        lastRecordAt: lastRecordAt ?? project.pac.lastRecordAt,
      },
    };

    const timeline = buildTimeline(updatedProject, savedDocuments, notes);
    await this.projects.save(updatedProject);
    await this.timelines.save(projectId, timeline);

    await this.bus.emit('PROJECT_DETAILS_SYNCED', { project: updatedProject });
    await this.bus.emit('DATA_CHANGED', { reason: 'project-details-sync', projectId });

    onProgress?.({
      phase: 'project_finished',
      message: `${updatedProject.name}: ${savedDocuments.length} documentos, ${observations.length} observaciones.`,
      projectId,
    });

    return {
      projectId,
      pacDocuments: savedDocuments.length,
      observations: observationCount,
      timelineEvents: timeline.length,
      warnings,
    };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function needsContentRefresh(content: string | undefined): boolean {
  if (!content) return true;
  return content.includes('\uFFFD') || /el documento original est[aá] disponible/i.test(content);
}
