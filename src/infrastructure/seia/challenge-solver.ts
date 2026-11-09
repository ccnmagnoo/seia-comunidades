import { runInNewContext } from 'node:vm';

/**
 * El portal SEIA a veces responde con un challenge JavaScript que calcula una
 * cookie de sesión. Ejecutamos únicamente ese script en un sandbox sin acceso a
 * Node, con timeouts y stubs de DOM.
 */
export function solveCookieChallenge(html: string): string | null {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (match) => match[1] ?? '',
  );

  for (const script of scripts) {
    if (!/document\s*\.\s*cookie/i.test(script)) continue;

    const cookies: string[] = [];
    const noop = () => undefined;
    const sandbox: Record<string, unknown> = {
      document: {
        get cookie() {
          return '';
        },
        set cookie(value: string) {
          cookies.push(value);
        },
        location: { reload: noop },
      },
      window: {},
      navigator: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      },
      location: { reload: noop },
      console: { log: noop, warn: noop, error: noop },
      setTimeout: (fn: () => void) => {
        try {
          fn();
        } catch {
          // Ignorado.
        }
        return 0;
      },
      clearTimeout: noop,
      Date,
      Math,
      String,
      Number,
      Boolean,
      Array,
      Object,
      RegExp,
      parseInt,
      parseFloat,
      isNaN,
      encodeURIComponent,
      decodeURIComponent,
      unescape,
    };
    sandbox.window = sandbox;

    try {
      runInNewContext(script, sandbox, { timeout: 2_000 });
    } catch {
      continue;
    }

    const cookie = cookies.find((value) => value.includes('='));
    if (cookie) return cookie;
  }

  return null;
}
