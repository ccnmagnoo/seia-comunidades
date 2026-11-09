import type { Catalog } from '../../domain/common/catalog';
import type { DocumentKind } from '../../domain/common/schemas';
import type { SearchCriteria } from '../../shared/filters';

export interface ProjectSearchResult {
  expedienteId: string;
  name: string;
  workflow: string;
  region: string;
  commune: string;
  typology: string;
  typologyDescription: string;
  reason: string;
  owner: string;
  investmentMM?: number;
  presentationDate?: string;
  status: string;
  suspended: boolean;
  legalDays?: number;
  mapUrl?: string;
  mapStatus?: string;
  sheetUrl: string;
  dossierUrl: string;
  pacUrl: string;
}

export interface ProjectSearchPage {
  results: ProjectSearchResult[];
  total: number;
}

export interface PacDocumentRecord {
  id: string;
  it: number;
  register: string;
  title: string;
  kind: DocumentKind;
  from: string;
  recipientsCount: number;
  recipientsUrl?: string;
  link: string;
  recordDate: string;
  contentType: 'html' | 'file' | 'unknown';
}

export interface DocumentContent {
  sender: string;
  content: string;
}

export interface Recipient {
  name: string;
  organization?: string;
}

export interface EvaluationSchedule {
  legalDays: number;
  elapsedDays: number;
  suspendedDays: number;
  remainingDays: number;
  status: 'active' | 'suspended' | 'expired';
}

export interface ProjectSheet {
  description?: string;
}

export interface SeiaGateway {
  searchProjects(criteria: SearchCriteria, options?: { forceRefresh?: boolean }): Promise<ProjectSearchPage>;
  getProjectSheet(projectId: string): Promise<ProjectSheet>;
  getPacDocuments(projectId: string): Promise<PacDocumentRecord[]>;
  getDocumentContent(url: string, options?: { forceRefresh?: boolean }): Promise<DocumentContent>;
  getDocumentRecipients(url: string): Promise<Recipient[]>;
  getSchedule(projectId: string): Promise<EvaluationSchedule>;
  getCatalog(): Promise<Catalog>;
}
