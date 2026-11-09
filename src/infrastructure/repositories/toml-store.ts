import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import writeFileAtomic from 'write-file-atomic';
import type { z } from 'zod';
import { AppError, ValidationError } from '../../shared/errors';

export class Mutex {
  private readonly queues = new Map<string, Promise<void>>();

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.queues.set(key, queued);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.queues.get(key) === queued) {
        this.queues.delete(key);
      }
    }
  }
}

export class TomlStore {
  private readonly mutex = new Mutex();

  async read<T extends z.ZodTypeAny>(
    filePath: string,
    schema: T,
  ): Promise<z.infer<T> | null> {
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf8');
    } catch (error) {
      if (isNotFound(error)) return null;
      throw new AppError('IO_ERROR', `No fue posible leer ${filePath}`, error);
    }

    let parsed: unknown;
    try {
      parsed = parseToml(raw);
    } catch (error) {
      throw new AppError('DATA_ERROR', `TOML inválido en ${filePath}`, error);
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new AppError('DATA_ERROR', `Esquema inválido en ${filePath}`, result.error.issues);
    }
    return result.data as z.infer<T>;
  }

  async readOrThrow<T extends z.ZodTypeAny>(
    filePath: string,
    schema: T,
  ): Promise<z.infer<T>> {
    const value = await this.read(filePath, schema);
    if (value === null) {
      throw new AppError('NOT_FOUND', `No existe ${filePath}`);
    }
    return value;
  }

  async write<T extends z.ZodTypeAny>(
    filePath: string,
    schema: T,
    data: z.input<T>,
  ): Promise<z.infer<T>> {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(`Datos inválidos para ${filePath}`, result.error.issues);
    }

    return this.mutex.run(filePath, async () => {
      await mkdir(dirname(filePath), { recursive: true });
      const clean = stripUndefined(result.data);
      const content = stringifyToml(clean as Record<string, unknown>);
      await writeFileAtomic(filePath, content, { encoding: 'utf8' });
      return result.data as z.infer<T>;
    });
  }

  async listToml(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.toml'))
        .map((entry) => entry.name.slice(0, -5))
        .sort();
    } catch (error) {
      if (isNotFound(error)) return [];
      throw new AppError('IO_ERROR', `No fue posible listar ${dir}`, error);
    }
  }

  async listDirectories(dir: string): Promise<string[]> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    } catch (error) {
      if (isNotFound(error)) return [];
      throw new AppError('IO_ERROR', `No fue posible listar ${dir}`, error);
    }
  }

  async remove(filePath: string): Promise<void> {
    await this.mutex.run(filePath, async () => {
      await rm(filePath, { force: true });
    });
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await readFile(filePath);
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      return true;
    }
  }

  path(...segments: string[]): string {
    return join(...segments);
  }
}

export function safeSegment(value: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(value) || value === '.' || value === '..') {
    throw new ValidationError(`Identificador inválido: ${value}`);
  }
  return value;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item));
  }
  if (value !== null && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      output[key] = stripUndefined(item);
    }
    return output;
  }
  return value;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  );
}
