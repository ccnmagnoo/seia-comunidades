import { useQuery, QueryClientProvider } from '@tanstack/react-query';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  FolderSearch,
  MapPin,
  Users,
} from 'lucide-react';
import { Chart, chartAxisStyle } from '../components/Chart';
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

  const regionOption: EChartsOption = {
    grid: { left: 16, right: 20, top: 16, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: data.byRegion.map((point) => point.label.replace('Región de ', '').replace('Región del ', '')),
      ...chartAxisStyle,
      axisLabel: { ...chartAxisStyle.axisLabel, rotate: 20 },
    },
    yAxis: { type: 'value', ...chartAxisStyle },
    series: [
      {
        type: 'bar',
        data: data.byRegion.map((point) => point.value),
        barMaxWidth: 28,
        itemStyle: {
          color: '#38bdf8',
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
      backgroundColor: '#0f172a',
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: { type: 'category', data: monthLabels, ...chartAxisStyle },
    yAxis: { type: 'value', ...chartAxisStyle },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        data: data.observationsByMonth.map((point) => point.value),
        lineStyle: { color: '#a78bfa', width: 3 },
        itemStyle: { color: '#a78bfa' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(167,139,250,0.32)' },
              { offset: 1, color: 'rgba(167,139,250,0)' },
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400/80">
            Monitoreo territorial
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Dashboard ejecutivo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Estado de expedientes, participación ciudadana y observaciones del SEIA.
          </p>
        </div>
        <LinkButton href="/projects">
          Abrir proyectos
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  <Chart option={regionOption} />
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">Sin datos regionales.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Observaciones por mes</CardTitle>
                <CardDescription>Últimos seis meses con actividad registrada.</CardDescription>
              </CardHeader>
              <CardContent>
                <Chart option={observationsOption} />
              </CardContent>
            </Card>
          </section>

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
                    <tr className="border-b border-white/8 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="pb-3 pr-4 font-medium">Expediente</th>
                      <th className="pb-3 pr-4 font-medium">Ubicación</th>
                      <th className="pb-3 pr-4 font-medium">Estado</th>
                      <th className="pb-3 pr-4 font-medium">PAC</th>
                      <th className="pb-3 text-right font-medium">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentProjects.map((project) => (
                      <tr key={project.id} className="border-b border-white/5 last:border-0">
                        <td className="py-3 pr-4">
                          <a
                            href={`/project?id=${encodeURIComponent(project.id)}`}
                            className="font-medium text-slate-100 hover:text-sky-300"
                          >
                            {project.name}
                          </a>
                          <p className="text-xs text-slate-500">{project.owner.name}</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-600" />
                            {project.location.commune}
                          </span>
                          <p className="text-xs text-slate-600">{project.location.region}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {project.pac.recordsTotal} docs · {project.pac.observationsTotal} obs
                        </td>
                        <td className="py-3 text-right text-xs text-slate-500">
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
