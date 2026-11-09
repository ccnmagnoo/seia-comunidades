import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  MapPin,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import type { Note } from '@/domain/note/note';
import type { NotePriority } from '@/domain/common/schemas';
import type { Observation } from '@/domain/observation/observation';
import type { PacDocument } from '@/domain/pac/pac-document';
import type { Project } from '@/domain/project/project';
import type { TimelineEvent } from '@/domain/timeline/timeline';
import type { SyncProgress } from '@/shared/filters';
import type {
  ReportFormat,
  ReportResult,
} from '@/application/ports/report-service';
import { formatDate, formatDateTime } from '@/domain/common/dates';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../components/ui/primitives';
import { getApi } from '../lib/api';
import { queryClient, queryKeys } from '../lib/query-client';
import {
  formatInt,
  formatMoney,
  formatRelative,
  kindLabel,
  openExternal,
  sentimentLabel,
} from '../lib/utils';
import {
  kindVariant,
  sentimentVariant,
  statusVariant,
  timelineLabel,
  timelineVariant,
} from '../lib/labels';

type Tab = 'resumen' | 'pac' | 'observaciones' | 'timeline' | 'notas';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'pac', label: 'Documentos PAC' },
  { id: 'observaciones', label: 'Observaciones' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notas', label: 'Notas' },
];

export default function ProjectDetailIsland() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectDetailContent />
    </QueryClientProvider>
  );
}

function ProjectDetailContent() {
  const api = getApi();
  const client = useQueryClient();
  const projectId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('id') ?? '';
  }, []);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'resumen';
    const value = new URLSearchParams(window.location.search).get('tab');
    return value === 'pac' ||
      value === 'observaciones' ||
      value === 'timeline' ||
      value === 'notas'
      ? value
      : 'resumen';
  });
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const detail = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => api.projects.get(projectId),
    enabled: Boolean(projectId),
  });

  useEffect(() => {
    const offProgress = api.onSyncProgress(setProgress);
    const offData = api.onDataChanged(() => {
      if (projectId) void client.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    });
    return () => {
      offProgress();
      offData();
    };
  }, [api, client, projectId]);

  const sync = useMutation({
    mutationFn: () => api.projects.syncDetails(projectId),
    onSuccess: () => {
      setProgress(null);
      void client.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      void client.invalidateQueries({ queryKey: ['projects'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => setProgress(null),
  });

  const tracking = useMutation({
    mutationFn: (patch: { favorite?: boolean; critical?: boolean; followed?: boolean }) =>
      api.projects.updateTracking(projectId, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.project(projectId) });
      void client.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  if (!projectId) {
    return <Alert tone="error">No se indicó un expediente.</Alert>;
  }

  if (detail.isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (detail.isError) {
    return (
      <div className="space-y-4">
        <a href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100">
          <ArrowLeft className="h-4 w-4" />
          Volver a proyectos
        </a>
        <Alert tone="error">No fue posible abrir el expediente: {detail.error.message}</Alert>
      </div>
    );
  }

  if (!detail.data) return null;
  const { project, pac, observations, timeline, notes } = detail.data;

  return (
    <div className="space-y-6">
      <a href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100">
        <ArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </a>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
            <Badge variant="slate">{project.workflow}</Badge>
            <Badge variant="slate">Expediente {project.id}</Badge>
            {project.tracking.critical ? <Badge variant="red">Crítico</Badge> : null}
          </div>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-white text-balance">
            {project.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-600" />
              {project.owner.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-600" />
              {project.location.commune}, {project.location.region}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-600" />
              Actualizado {formatRelative(project.updatedAt)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            title={project.tracking.favorite ? 'Quitar favorito' : 'Marcar favorito'}
            onClick={() => tracking.mutate({ favorite: !project.tracking.favorite })}
          >
            <Star
              className={project.tracking.favorite ? 'h-4 w-4 fill-amber-300 text-amber-300' : 'h-4 w-4'}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title={project.tracking.critical ? 'Quitar crítico' : 'Marcar crítico'}
            onClick={() => tracking.mutate({ critical: !project.tracking.critical })}
          >
            <AlertTriangle
              className={project.tracking.critical ? 'h-4 w-4 text-rose-300' : 'h-4 w-4'}
            />
          </Button>
          <Button variant="secondary" onClick={() => openExternal(project.links.sheet)}>
            <ExternalLink className="h-4 w-4" />
            Ficha SEIA
          </Button>
          <Button onClick={() => sync.mutate()} loading={sync.isPending}>
            <RefreshCw className="h-4 w-4" />
            Sincronizar detalles
          </Button>
        </div>
      </header>

      {progress && sync.isPending ? (
        <Alert tone="info">
          {progress.message}
          {progress.current !== undefined && progress.total !== undefined
            ? ` (${progress.current}/${progress.total})`
            : ''}
        </Alert>
      ) : null}
      {sync.isError ? (
        <Alert tone="error">No fue posible sincronizar el expediente: {sync.error.message}</Alert>
      ) : null}

      <div className="flex flex-wrap gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? 'rounded-lg bg-sky-500/15 px-3.5 py-2 text-xs font-semibold text-sky-200 ring-1 ring-inset ring-sky-400/20'
                : 'rounded-lg px-3.5 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }
          >
            {item.label}
            {item.id === 'pac' ? ` (${pac.length})` : ''}
            {item.id === 'observaciones' ? ` (${observations.length})` : ''}
            {item.id === 'notas' ? ` (${notes.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'resumen' ? <SummaryTab project={project} projectId={projectId} /> : null}
      {tab === 'pac' ? <PacTab documents={pac} /> : null}
      {tab === 'observaciones' ? <ObservationsTab observations={observations} /> : null}
      {tab === 'timeline' ? <TimelineTab events={timeline} /> : null}
      {tab === 'notas' ? <NotesTab projectId={projectId} notes={notes} /> : null}
    </div>
  );
}

function SummaryTab({ project, projectId }: { project: Project; projectId: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Descripción del proyecto</CardTitle>
          <CardDescription>Texto extraído de la ficha pública del SEIA.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-300">
            {project.details.description || 'Sin descripción almacenada. Sincroniza los detalles del expediente.'}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Detail label="Tipología" value={project.details.typologyDescription || project.details.typology} />
            <Detail label="Razón de ingreso" value={project.details.reason} />
            <Detail label="Fecha de presentación" value={formatDate(project.details.presentationDate)} />
            <Detail label="Días legales" value={project.details.legalDays ? `${project.details.legalDays} días` : undefined} />
            <Detail label="Inversión" value={formatMoney(project.details.investmentMM)} />
            <Detail label="Último registro PAC" value={formatDate(project.pac.lastRecordAt)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Participación ciudadana</CardTitle>
            <CardDescription>Resumen de documentos y observaciones.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Documentos PAC" value={formatInt(project.pac.recordsTotal)} icon={<FileText className="h-4 w-4" />} />
              <Metric label="Observaciones" value={formatInt(project.pac.observationsTotal)} icon={<Users className="h-4 w-4" />} />
            </div>
            <div className="mt-4 space-y-2">
              <Button variant="secondary" className="w-full justify-start" onClick={() => openExternal(project.links.dossier)}>
                <ExternalLink className="h-4 w-4" />
                Abrir expediente SEIA
              </Button>
              <Button variant="secondary" className="w-full justify-start" onClick={() => openExternal(project.links.pac)}>
                <ExternalLink className="h-4 w-4" />
                Abrir documentos PAC
              </Button>
              {project.links.map ? (
                <Button variant="secondary" className="w-full justify-start" onClick={() => openExternal(project.links.map)}>
                  <MapPin className="h-4 w-4" />
                  Ver mapa del proyecto
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguimiento</CardTitle>
            <CardDescription>Marcas y etiquetas locales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <div className="flex items-center justify-between">
              <span>Favorito</span>
              <Badge variant={project.tracking.favorite ? 'amber' : 'slate'}>
                {project.tracking.favorite ? 'Sí' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Crítico</span>
              <Badge variant={project.tracking.critical ? 'red' : 'slate'}>
                {project.tracking.critical ? 'Sí' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>En seguimiento</span>
              <Badge variant={project.tracking.followed ? 'green' : 'slate'}>
                {project.tracking.followed ? 'Sí' : 'No'}
              </Badge>
            </div>
            {project.tracking.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {project.tracking.tags.map((tag) => (
                  <Badge key={tag} variant="violet">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reportes</CardTitle>
            <CardDescription>Exporta el expediente en formato local.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportActions projectId={projectId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportActions({ projectId }: { projectId: string }) {
  const api = getApi();
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [result, setResult] = useState<ReportResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.reports.generate(projectId, format),
    onSuccess: setResult,
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select
          value={format}
          onChange={(event) => {
            setResult(null);
            setFormat(event.target.value as ReportFormat);
          }}
        >
          <option value="pdf">PDF ejecutivo</option>
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV de observaciones</option>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
        </Select>
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
      {mutation.isError ? (
        <Alert tone="error">No fue posible generar el reporte: {mutation.error.message}</Alert>
      ) : null}
      {result ? (
        <div className="space-y-2">
          <Alert tone="info">Reporte guardado: {result.fileName}</Alert>
          <Button variant="secondary" size="sm" onClick={() => api.showItem(result.path)}>
            <FolderOpen className="h-3.5 w-3.5" />
            Abrir carpeta
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PacTab({ documents }: { documents: PacDocument[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="Sin documentos PAC"
        description="Sincroniza los detalles del expediente para recuperar la tabla de documentos de participación ciudadana."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos de participación ciudadana</CardTitle>
        <CardDescription>{documents.length} registros recuperados desde el SEIA.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03]">
              <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Documento</th>
                <th className="px-4 py-3 font-semibold">Desde</th>
                <th className="px-4 py-3 font-semibold">Destinatarios</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 text-right font-semibold">Enlace</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-white/5 hover:bg-white/[0.025]">
                  <td className="px-4 py-3 text-xs text-slate-500">{document.it}</td>
                  <td className="max-w-[420px] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={kindVariant(document.kind)}>{kindLabel(document.kind)}</Badge>
                      <span className="text-slate-200">{document.title}</span>
                    </div>
                    {document.register ? (
                      <p className="mt-1 text-[11px] text-slate-600">Registro {document.register}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{document.from || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {document.recipientsCount > 0 ? `${document.recipientsCount}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(document.recordDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openExternal(document.link)}
                      disabled={!document.link}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ObservationsTab({ observations }: { observations: Observation[] }) {
  if (observations.length === 0) {
    return (
      <EmptyState
        title="Sin observaciones ciudadanas"
        description="El expediente puede no tener PAC o las observaciones estar en documentos adjuntos sin texto extraíble."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {observations.map((observation) => (
        <Card key={observation.id}>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="violet">{observation.category}</Badge>
                <Badge variant={sentimentVariant(observation.sentiment)}>
                  {sentimentLabel(observation.sentiment)}
                </Badge>
              </div>
              <span className="text-[11px] text-slate-500">{formatDate(observation.date)}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{observation.sender}</p>
              <p className="text-[11px] text-slate-600">{observation.subject}</p>
            </div>
            <p className="line-clamp-5 whitespace-pre-line text-sm leading-6 text-slate-400">
              {observation.content || observation.summary || 'Sin texto extraído.'}
            </p>
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-600">
                <span>Importancia</span>
                <span>{Math.round(observation.importance * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400"
                  style={{ width: `${Math.round(observation.importance * 100)}%` }}
                />
              </div>
            </div>
            {observation.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {observation.keywords.map((keyword) => (
                  <Badge key={keyword} variant="slate">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => openExternal(observation.sourceUrl)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Ver documento original
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TimelineTab({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="Timeline vacío"
        description="Sincroniza los detalles para construir la línea de tiempo del expediente."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Línea de tiempo</CardTitle>
        <CardDescription>Eventos administrativos y ciudadanos del expediente.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-6 border-l border-white/10 pl-6">
          {[...events].reverse().map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-4 ring-slate-950" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={timelineVariant(event.type)}>{timelineLabel(event.type)}</Badge>
                <span className="text-[11px] text-slate-500">{formatDate(event.date)}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-slate-200">{event.title}</p>
              {event.description ? (
                <p className="mt-1 text-xs leading-5 text-slate-500">{event.description}</p>
              ) : null}
              {event.sourceUrl ? (
                <button
                  type="button"
                  onClick={() => openExternal(event.sourceUrl)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                >
                  Ver fuente
                  <ExternalLink className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function NotesTab({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const api = getApi();
  const client = useQueryClient();
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('Operador local');
  const [priority, setPriority] = useState<NotePriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    void client.invalidateQueries({ queryKey: ['projects'] });
    void client.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const save = useMutation({
    mutationFn: () =>
      api.notes.save({
        projectId,
        author,
        priority,
        content,
        dueDate: dueDate || undefined,
        tags: [],
        done: false,
      }),
    onSuccess: () => {
      setContent('');
      setDueDate('');
      setError(null);
      invalidate();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const remove = useMutation({
    mutationFn: (noteId: string) => api.notes.remove(projectId, noteId),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nueva nota institucional</CardTitle>
          <CardDescription>Minutas, compromisos y seguimiento interno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Autor</span>
              <Input value={author} onChange={(event) => setAuthor(event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Prioridad</span>
              <Select value={priority} onChange={(event) => setPriority(event.target.value as NotePriority)}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </Select>
            </label>
          </div>
          <label className="space-y-1.5 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Contenido</span>
            <Textarea
              rows={6}
              placeholder="Escribe una minuta, compromiso o comentario…"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fecha límite</span>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <Button
            className="w-full"
            loading={save.isPending}
            disabled={!content.trim()}
            onClick={() => save.mutate()}
          >
            <Save className="h-4 w-4" />
            Guardar nota
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <EmptyState
            title="Sin notas todavía"
            description="Registra minutas, compromisos y observaciones internas para este expediente."
          />
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={note.priority === 'high' ? 'red' : note.priority === 'medium' ? 'amber' : 'slate'}>
                      {note.priority === 'high' ? 'Alta' : note.priority === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                    <span className="text-xs text-slate-400">{note.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-600">{formatRelative(note.updatedAt)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar nota"
                      onClick={() => remove.mutate(note.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{note.content}</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {note.status.dueDate ? `Vence ${formatDate(note.status.dueDate)}` : 'Sin fecha límite'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {note.status.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-slate-600" />
                    )}
                    {note.status.done ? 'Completada' : 'Pendiente'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className="mt-1 text-sm text-slate-300">{value || '—'}</p>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
