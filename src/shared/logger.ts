import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export interface LoggerOptions {
  level?: LogLevel;
  filePath?: string;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? 'info';
  const filePath = options.filePath;

  if (filePath) {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
    } catch {
      // El logger nunca debe tumbar la aplicación.
    }
  }

  const write = (entryLevel: LogLevel, message: string, meta?: unknown) => {
    if (LEVEL_ORDER[entryLevel] < LEVEL_ORDER[level]) return;
    const timestamp = new Date().toISOString();
    const suffix = meta === undefined ? '' : ` ${safeJson(meta)}`;
    const line = `[${timestamp}] ${entryLevel.toUpperCase()} ${message}${suffix}`;

    if (entryLevel === 'error') console.error(line);
    else if (entryLevel === 'warn') console.warn(line);
    else console.log(line);

    if (filePath) {
      try {
        appendFileSync(filePath, `${line}\n`, 'utf8');
      } catch {
        // Silencioso a propósito.
      }
    }
  };

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
