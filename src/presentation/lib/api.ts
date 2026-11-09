import type { SeiaApi } from '@/shared/ipc';

export function getApi(): SeiaApi {
  if (typeof window === 'undefined' || !window.seia) {
    throw new Error('La API local de SEIA Comunidades no está disponible.');
  }
  return window.seia;
}
