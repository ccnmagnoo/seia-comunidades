import type { ReactNode } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Database, FolderOpen, Globe2, ShieldCheck } from 'lucide-react';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from '../components/ui/primitives';
import { getApi } from '../lib/api';
import { queryClient, queryKeys } from '../lib/query-client';

export default function SettingsIsland() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsContent />
    </QueryClientProvider>
  );
}

function SettingsContent() {
  const api = getApi();
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.settings.get(),
  });

  if (settings.isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (settings.isError || !settings.data) {
    return <Alert tone="error">No fue posible leer la configuración local.</Alert>;
  }

  const data = settings.data;

  return (
    <div className="space-y-7">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400/80">
          Espacio local
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rutas, versión y filtros por defecto de la aplicación de escritorio.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Almacenamiento</CardTitle>
            <CardDescription>
              Los datos canónicos viven en archivos TOML. No se envía información a la nube.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PathRow icon={<FolderOpen className="h-4 w-4" />} label="Workspace" value={data.workspaceRoot} />
            <PathRow icon={<Database className="h-4 w-4" />} label="Datos TOML" value={data.dataDir} />
            <PathRow icon={<FolderOpen className="h-4 w-4" />} label="Exportaciones" value={data.exportsDir} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portal SEIA</CardTitle>
            <CardDescription>Origen público de los expedientes y documentos PAC.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PathRow icon={<Globe2 className="h-4 w-4" />} label="Base URL" value={data.seiaBaseUrl} />
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-medium">Procesamiento local</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                El renderer no accede a red ni filesystem: todo pasa por IPC validado y por el
                proceso principal de Electron.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros por defecto</CardTitle>
          <CardDescription>Se usan al abrir la sincronización desde Proyectos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Región</p>
              <p className="mt-1 text-sm text-slate-300">{data.defaultRegionIds.join(', ') || 'Todas'}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Sector</p>
              <p className="mt-1 text-sm text-slate-300">{data.defaultSectorIds.join(', ') || 'Todos'}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">Estado</p>
              <p className="mt-1 text-sm text-slate-300">{data.defaultStatusIds.join(', ') || 'Todos'}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="slate">versión {data.version}</Badge>
            <Badge variant="green">local-first</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PathRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="mt-1 break-all font-mono text-[11px] text-slate-400">{value}</p>
    </div>
  );
}
