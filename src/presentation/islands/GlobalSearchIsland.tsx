import { useEffect, useRef, useState } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { FileText, FolderSearch, Search, StickyNote } from 'lucide-react';
import type { SearchHit } from '@/shared/search';
import { getApi } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { Badge, Input, Spinner } from '../components/ui/primitives';

export default function GlobalSearchIsland() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalSearch />
    </QueryClientProvider>
  );
}

function GlobalSearch() {
  const api = getApi();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api.search.query({ query: debounced, limit: 12 }),
    enabled: debounced.length >= 2,
    staleTime: 15_000,
  });

  const navigate = (hit: SearchHit) => {
    const tab =
      hit.kind === 'observation' ? 'observaciones' : hit.kind === 'note' ? 'notas' : 'resumen';
    setOpen(false);
    setQuery('');
    window.location.href = `/project?id=${encodeURIComponent(hit.projectId)}&tab=${tab}`;
  };

  const showPanel = open && debounced.length >= 2;

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/70" />
        <Input
          className="pl-9"
          placeholder="Buscar en la base local…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/50">
          {results.isFetching ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Spinner className="h-3.5 w-3.5" />
              Buscando…
            </div>
          ) : null}

          {!results.isFetching && (results.data?.length ?? 0) === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Sin resultados para “{debounced}”.</p>
          ) : null}

          <div className="max-h-80 overflow-y-auto">
            {results.data?.map((hit) => (
              <button
                key={`${hit.kind}:${hit.id}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigate(hit)}
                className="flex w-full items-start gap-3 border-b border-border/60 px-3 py-2.5 text-left transition last:border-0 hover:bg-accent"
              >
                <span className="mt-0.5 text-muted-foreground">{iconFor(hit.kind)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-foreground">{hit.title}</span>
                    <Badge variant="slate">{kindLabel(hit.kind)}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{hit.snippet}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function iconFor(kind: SearchHit['kind']) {
  if (kind === 'project') return <FolderSearch className="h-4 w-4" />;
  if (kind === 'note') return <StickyNote className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function kindLabel(kind: SearchHit['kind']): string {
  if (kind === 'project') return 'Expediente';
  if (kind === 'note') return 'Nota';
  return 'Observación';
}
