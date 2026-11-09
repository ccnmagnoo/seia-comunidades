/// <reference types="astro/client" />

import type { SeiaApi } from '../shared/ipc';

declare global {
  interface Window {
    seia: SeiaApi;
  }
}

export {};
