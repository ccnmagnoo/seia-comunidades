import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  keepPreviousData,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AlertTriangle,
  ChevronRight,
  MapPin,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import type { ProjectSummary } from '@/domain/project/project';
import type {
  ProjectFilters,
  SearchCriteria,
  SyncProgress,
  SyncSearchResult,
} from '@/shared/filters';
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
  LinkButton,
  Select,
  Spinner,
} from '../components/ui/primitives';
import { getApi } from '../lib/api';
import { queryClient, queryKeys } from '../lib/query-client';
import { formatInt, formatRelative } from '../lib/utils';
import { statusVariant } from '../lib/labels';

export default function ProjectsIsland() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProjectsContent />
    </QueryClientProvider>
  );
}

function ProjectsContent() {
  const api = getApi();
  const client = useQueryClient();
  const [filters, setFilters] = useState<ProjectFilters>({ limit: 200 });
  const [syncRegion, setSyncRegion] = useState('5');
  const [syncSector, setSyncSector] = useState('7');
  const [syncStatus, setSyncStatus] = useState('3');
  const [syncLimit, setSyncLimit] = useState(50);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [lastResult, setLastResult] = useState<SyncSearchResult | null>(null);

  const catalogs = useQuery({
    queryKey: queryKeys.catalogs,
    queryFn: () => api.catalogs.get(),
    staleTime: 10 * 60_000,
  });
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.settings.get(),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    const region = settings.data?.defaultRegionIds[0];
    const sector = settings.data?.defaultSectorIds[0];
    const status = settings.data?.defaultStatusIds[0];
    if (region) setSyncRegion(region);
    if (sector) setSyncSector(sector);
    if (status) setSyncStatus(status);
  }, [settings.data]);

  useEffect(() => {
    const offProgress = api.onSyncProgress(setProgress);
    const offData = api.onDataChanged(() => {
      void client.invalidateQueries({ queryKey: ['projects'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
    });
    return () => {
      offProgress();
      offData();
    };
  }, [api, client]);

  const projects = useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: () => api.projects.list(filters),
    placeholderData: keepPreviousData,
  });

  const sync = useMutation({
    mutationFn: (criteria: SearchCriteria) => api.projects.syncSearch(criteria),
    onSuccess: (result) => {
      setLastResult(result);
      setProgress(null);
      void client.invalidateQueries({ queryKey: ['projects'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => setProgress(null),
  });

  const regionName = useMemo(() => {
    const id = syncRegion;
    return catalogs.data?.regions.find((region) => region.id === id)?.name ?? `Región ${id}`;
  }, [catalogs.data, syncRegion]);

  const handleSync = () => {
    setLastResult(null);
    setProgress({ phase: 'searching', message: 'Iniciando sincronización…' });
    sync.mutate({
      regionIds: syncRegion ? [syncRegion] : [],
      sectorIds: syncSector ? [syncSector] : [],
      statusIds: syncStatus ? [syncStatus] : [],
      limit: syncLimit,
      orderColumn: 'FECHA_PRESENTACION',
      orderDir: 'desc',
    });
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Base local
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Proyectos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sincroniza expedientes del SEIA y administra su seguimiento institucional.
          </p>
        </div>
        <Badge variant="slate">{projects.data?.length ?? 0} expedientes visibles</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Sincronizar desde el SEIA</CardTitle>
          <CardDescription>
            La importación consulta el buscador público. El portal puede tardar unos segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Región">
              <Select value={syncRegion} onChange={(event) => setSyncRegion(event.target.value)}>
                {catalogs.data?.regions.length ? (
                  catalogs.data.regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))
                ) : (
                  <option value="5">Región de Valparaíso</option>
                )}
              </Select>
            </Field>
            <Field label="Sector económico">
              <Select value={syncSector} onChange={(event) => setSyncSector(event.target.value)}>
                {catalogs.data?.sectors.length ? (
                  catalogs.data.sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))
                ) : (
                  <option value="7">Energía</option>
                )}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={syncStatus} onChange={(event) => setSyncStatus(event.target.value)}>
                {catalogs.data?.statuses.length ? (
                  catalogs.data.statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="3">En Calificación</option>
                    <option value="4">Aprobado</option>
                    <option value="2">En Admisión</option>
                  </>
                )}
              </Select>
            </Field>
            <Field label="Límite">
              <Input
                type="number"
                min={1}
                max={500}
                value={syncLimit}
                onChange={(event) => setSyncLimit(Number(event.target.value) || 50)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSync} loading={sync.isPending}>
              <RefreshCw className="h-4 w-4" />
              Sincronizar {regionName}
            </Button>
            <p className="text-xs text-muted-foreground">
              Filtros por defecto del espacio local. Puedes ajustarlos antes de ejecutar.
            </p>
          </div>

          {progress && sync.isPending ? (
            <Alert tone="info">
              {progress.message}
              {progress.current !== undefined && progress.total !== undefined
                ? ` (${progress.current}/${progress.total})`
                : ''}
            </Alert>
          ) : null}

          {sync.isError ? (
            <Alert tone="error">No fue posible sincronizar: {sync.error.message}</Alert>
          ) : null}

          {lastResult ? (
            <div className="space-y-2">
              <Alert tone={lastResult.warnings.length > 0 ? 'warning' : 'info'}>
                Importados {lastResult.fetched} expedientes: {lastResult.created} nuevos,{' '}
                {lastResult.updated} actualizados. El portal reporta {lastResult.totalReported}.
              </Alert>
              {lastResult.warnings.map((warning) => (
                <Alert key={warning} tone="warning">
                  {warning}
                </Alert>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-4">
          <div>
            <CardTitle>Expedientes locales</CardTitle>
            <CardDescription>Filtra la base sin volver a consultar el portal.</CardDescription>
          </div>
          {projects.isFetching ? <Spinner className="h-4 w-4" /> : null}
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre, titular, etiqueta…"
                value={filters.text ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, text: event.target.value || undefined }))
                }
              />
            </div>
            <Select
              value={filters.region ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, region: event.target.value || undefined }))
              }
            >
              <option value="">Todas las regiones</option>
              {catalogs.data?.regions.map((region) => (
                <option key={region.id} value={region.name}>
                  {region.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.workflow ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, workflow: event.target.value || undefined }))
              }
            >
              <option value="">DIA y EIA</option>
              <option value="DIA">DIA</option>
              <option value="EIA">EIA</option>
            </Select>
            <Select
              value={filters.status ?? ''}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value || undefined }))
              }
            >
              <option value="">Todos los estados</option>
              {catalogs.data?.statuses.map((status) => (
                <option key={status.id} value={status.name}>
                  {status.name}
                </option>
              ))}
            </Select>
          </div>

          {projects.isError ? (
            <Alert tone="error">No fue posible leer los proyectos: {projects.error.message}</Alert>
          ) : null}

          {!projects.isLoading && (projects.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No hay expedientes con estos filtros"
              description="Ejecuta una sincronización o limpia los filtros locales para ver la base completa."
              action={
                <Button variant="secondary" onClick={() => setFilters({ limit: 200 })}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Expediente</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Ubicación</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Estado</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">PAC</th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">Actualizado</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(projects.data ?? []).map((project) => (
                    <tr
                      key={project.id}
                      className="border-t border-border/60 transition hover:bg-muted/40"
                    >
                      <td className="max-w-[420px] px-4 py-3 align-top">
                        <a
                          href={`/project?id=${encodeURIComponent(project.id)}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {project.name}
                        </a>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.owner.name}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1.5 text-foreground/90">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {project.location.commune}
                        </span>
                        <p className="text-xs text-muted-foreground/70">{project.location.region}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1">
                          <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {project.workflow}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        <p>{formatInt(project.pac.recordsTotal)} documentos</p>
                        <p className="text-muted-foreground/70">
                          {formatInt(project.pac.observationsTotal)} observaciones
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        {formatRelative(project.updatedAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <RowActions project={project} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RowActions({ project }: { project: ProjectSummary }) {
  const api = getApi();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (patch: { favorite?: boolean; critical?: boolean }) =>
      api.projects.updateTracking(project.id, patch),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['projects'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        title={project.tracking.favorite ? 'Quitar favorito' : 'Marcar favorito'}
        onClick={() => mutation.mutate({ favorite: !project.tracking.favorite })}
      >
        <Star
          className={
            project.tracking.favorite ? 'h-4 w-4 fill-warning text-warning' : 'h-4 w-4'
          }
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={project.tracking.critical ? 'Quitar crítico' : 'Marcar crítico'}
        onClick={() => mutation.mutate({ critical: !project.tracking.critical })}
      >
        <AlertTriangle
          className={
            project.tracking.critical ? 'h-4 w-4 text-destructive' : 'h-4 w-4'
          }
        />
      </Button>
      <LinkButton
        href={`/project?id=${encodeURIComponent(project.id)}`}
        variant="ghost"
        size="icon"
        title="Abrir expediente"
      >
        <ChevronRight className="h-4 w-4" />
      </LinkButton>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
