import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import { z } from 'zod';

const CacheEntrySchema = z.object({
  fetchedAt: z.string(),
  status: z.number(),
  headers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  text: z.string(),
});

export type CacheEntry = z.infer<typeof CacheEntrySchema>;

export interface CacheLookup {
  entry: CacheEntry;
  stale: boolean;
}

export class HttpCache {
  constructor(private readonly cacheDir: string) {}

  static key(method: string, url: string, body?: string): string {
    return createHash('sha256')
      .update(`${method}\n${url}\n${body ?? ''}`)
      .digest('hex');
  }

  async get(
    category: string,
    key: string,
    ttlHours: number,
    allowStale: boolean,
  ): Promise<CacheLookup | null> {
    const file = this.filePath(category, key);
    try {
      const raw = await readFile(file, 'utf8');
      const parsed = CacheEntrySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return null;
      const ageMs = Date.now() - new Date(parsed.data.fetchedAt).getTime();
      const fresh = ageMs <= ttlHours * 3_600_000;
      if (!fresh && !allowStale) return null;
      return { entry: parsed.data, stale: !fresh };
    } catch {
      return null;
    }
  }

  async set(category: string, key: string, entry: CacheEntry): Promise<void> {
    const file = this.filePath(category, key);
    await mkdir(join(this.cacheDir, category), { recursive: true });
    await writeFileAtomic(file, JSON.stringify(entry), 'utf8');
  }

  private filePath(category: string, key: string): string {
    return join(this.cacheDir, sanitizeCategory(category), `${key}.json`);
  }
}

function sanitizeCategory(category: string): string {
  return category.replace(/[^A-Za-z0-9_-]/g, '_');
}
