import { useQuery, QueryClientProvider } from '@tanstack/react-query';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Flag,
  FolderSearch,
  MapPin,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Chart, chartTheme } from '../components/Chart';
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
  LinkButton,
  StatCard,
  Spinner,
} from '../components/ui/primitives';
import { useTheme } from '../hooks/useTheme';
import { getApi } from '../lib/api';
import { queryClient, queryKeys } from '../lib/query-client';
import { formatInt, formatRelative } from '../lib/utils';

export default function DashboardIsland() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}

function DashboardContent() {
  const api = getApi();
  const { resolved } = useTheme();
  const stats = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.dashboard.stats(),
  });

  if (stats.isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (stats.isError) {
    return (
      <Alert tone="error">
        No fue posible cargar el dashboard: {stats.error.message}
      </Alert>
    );
  }

  const data = stats.data;
  if (!data) return null;

  const colors = chartTheme(resolved);
  const axisStyle = {
    axisLine: colors.axisLine,
    axisTick: { show: false },
    axisLabel: colors.axisLabel,
    splitLine: colors.splitLine,
  };

  const regionOption: EChartsOption = {
    grid: { left: 16, right: 20, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      ...colors.tooltip,
    },
    xAxis: {
      type: 'category',
      data: data.byRegion.map((point) => point.label.replace('Región de ', '').replace('Región del ', '')),
      ...axisStyle,
      axisLabel: { ...colors.axisLabel, rotate: 20 },
    },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      {
        type: 'bar',
        data: data.byRegion.map((point) => point.value),
        barMaxWidth: 28,
        itemStyle: {
          color: colors.bar,
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  const monthLabels = data.observationsByMonth.map((point) => {
    const [year, month] = point.month.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(date);
  });

  const observationsOption: EChartsOption = {
    grid: { left: 16, right: 20, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      ...colors.tooltip,
    },
    xAxis: { type: 'category', data: monthLabels, ...axisStyle },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: data.observationsByMonth.map((point) => point.value),
        lineStyle: { color: colors.line, width: 3 },
        itemStyle: { color: colors.line },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: colors.areaTop },
              { offset: 1, color: colors.areaBottom },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            Monitoreo territorial
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Dashboard ejecutivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado de expedientes, participación ciudadana y observaciones del SEIA.
          </p>
        </div>
        <LinkButton href="/projects">
          Abrir proyectos
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Expedientes"
          value={formatInt(data.totalProjects)}
          hint={`${formatInt(data.followedProjects)} en seguimiento`}
          icon={<FolderSearch className="h-4 w-4" />}
        />
        <StatCard
          label="Con PAC"
          value={formatInt(data.projectsWithPac)}
          hint="Con documentos PAC registrados"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Observaciones"
          value={formatInt(data.observationsTotal)}
          hint={`${formatInt(data.newObservations7d)} en los últimos 7 días`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Marcadas"
          value={formatInt(data.flaggedObservations)}
          hint="Observaciones en seguimiento"
          icon={<Flag className="h-4 w-4" />}
        />
        <StatCard
          label="Con comentarios"
          value={formatInt(data.observationsWithComments)}
          hint="Observaciones con análisis interno"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          label="Críticos"
          value={formatInt(data.criticalProjects)}
          hint={`${formatInt(data.favoriteProjects)} favoritos`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </section>

      {data.totalProjects === 0 ? (
        <EmptyState
          title="Todavía no hay expedientes locales"
          description="Sincroniza el buscador del SEIA por región, sector y estado para comenzar a construir tu base local."
          action={
            <LinkButton href="/projects">
              Ir a sincronizar
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Proyectos por región</CardTitle>
                <CardDescription>Distribución de expedientes almacenados localmente.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byRegion.length > 0 ? (
                  <Chart option={regionOption} theme={resolved} />
                ) : (
                  <p className="py-12 text-center text-sm text-muted-foreground">Sin datos regionales.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Observaciones por mes</CardTitle>
                <CardDescription>Últimos seis meses con actividad registrada.</CardDescription>
              </CardHeader>
              <CardContent>
                <Chart option={observationsOption} theme={resolved} />
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Estado de revisión de observaciones</CardTitle>
              <CardDescription>
                Distribución del análisis interno de las observaciones ciudadanas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.byReviewStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin observaciones registradas.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.byReviewStatus.map((point) => (
                    <div
                      key={point.label}
                      className="rounded-xl border border-border bg-muted/30 p-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {point.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {formatInt(point.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Expedientes recientes</CardTitle>
                <CardDescription>Últimos proyectos actualizados en tu espacio local.</CardDescription>
              </div>
              <a href="/projects">
                <Button variant="ghost" size="sm">
                  Ver todos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Expediente</th>
                      <th className="pb-3 pr-4 font-medium">Ubicación</th>
                      <th className="pb-3 pr-4 font-medium">Estado</th>
                      <th className="pb-3 pr-4 font-medium">PAC</th>
                      <th className="pb-3 text-right font-medium">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentProjects.map((project) => (
                      <tr key={project.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-4">
                          <a
                            href={`/project?id=${encodeURIComponent(project.id)}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {project.name}
                          </a>
                          <p className="text-xs text-muted-foreground">{project.owner.name}</p>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {project.location.commune}
                          </span>
                          <p className="text-xs text-muted-foreground/70">{project.location.region}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {project.pac.recordsTotal} docs · {project.pac.observationsTotal} obs
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground">
                          {formatRelative(project.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function statusVariant(status: string): 'green' | 'amber' | 'red' | 'slate' | 'violet' {
  const normalized = status.toLowerCase();
  if (normalized.includes('aprobado')) return 'green';
  if (normalized.includes('rechazado') || normalized.includes('no admitido')) return 'red';
  if (normalized.includes('calificación') || normalized.includes('calificacion')) return 'amber';
  if (normalized.includes('admisión') || normalized.includes('admision')) return 'violet';
  return 'slate';
}
