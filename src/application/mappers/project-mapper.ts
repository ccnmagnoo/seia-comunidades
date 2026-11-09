import type { ProjectSearchResult } from '../ports/seia-gateway';
import type { Project } from '../../domain/project/project';
import { generateShortName } from '../../domain/project/short-name';

export function mapSearchResultToProject(
  result: ProjectSearchResult,
  existing: Project | null,
  now: string,
): Project {
  return {
    schemaVersion: 1,
    id: result.expedienteId,
    name: result.name,
    shortName: generateShortName(result.name),
    workflow: result.workflow,
    status: result.status,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    owner: {
      name: result.owner,
      rut: existing?.owner.rut,
    },
    location: {
      region: result.region,
      commune: result.commune,
      latitude: existing?.location.latitude,
      longitude: existing?.location.longitude,
    },
    details: {
      investmentMM: result.investmentMM ?? existing?.details.investmentMM,
      reason: result.reason || existing?.details.reason,
      presentationDate: result.presentationDate ?? existing?.details.presentationDate,
      legalDays: result.legalDays ?? existing?.details.legalDays,
      typology: result.typology || existing?.details.typology,
      typologyDescription:
        result.typologyDescription || existing?.details.typologyDescription,
      description: existing?.details.description,
    },
    pac: existing?.pac ?? {
      enabled: false,
      recordsTotal: 0,
      observationsTotal: 0,
    },
    tracking: existing?.tracking ?? {
      favorite: false,
      critical: false,
      followed: true,
      tags: [],
    },
    links: {
      sheet: result.sheetUrl,
      dossier: result.dossierUrl,
      pac: result.pacUrl,
      map: result.mapUrl,
    },
  };
}
