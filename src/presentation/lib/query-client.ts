import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const queryKeys = {
  stats: ['dashboard', 'stats'] as const,
  catalogs: ['catalogs'] as const,
  projects: (filters: unknown) => ['projects', filters] as const,
  project: (id: string) => ['project', id] as const,
  settings: ['settings'] as const,
};
