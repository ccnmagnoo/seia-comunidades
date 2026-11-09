import http from 'node:http';
import https from 'node:https';
import type { IncomingHttpHeaders } from 'node:http';
import type { Logger } from '../../shared/logger';
import { AppError, SeiaChallengeError } from '../../shared/errors';
import { CookieJar } from './cookie-jar';
import { HttpCache } from './http-cache';
import { RateLimiter, sleep } from './rate-limiter';
import { solveCookieChallenge } from './challenge-solver';

export interface HttpClientOptions {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  maxRetries: number;
  delayMs: number;
  cache: HttpCache;
  logger: Logger;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: URLSearchParams;
  category: string;
  ttlHours: number;
  forceRefresh?: boolean;
  allowStale?: boolean;
  accept?: string;
}

export interface HttpResponse {
  status: number;
  url: string;
  headers: IncomingHttpHeaders;
  text: string;
  fromCache: boolean;
  stale: boolean;
}

const MAX_REDIRECTS = 6;
const MAX_BODY_BYTES = 25 * 1024 * 1024;

export class SeiaHttpClient {
  private readonly jar = new CookieJar();
  private readonly limiter: RateLimiter;

  constructor(private readonly options: HttpClientOptions) {
    this.limiter = new RateLimiter(options.delayMs);
  }

  async request(pathOrUrl: string, requestOptions: RequestOptions): Promise<HttpResponse> {
    const method = requestOptions.method ?? 'GET';
    const url = new URL(pathOrUrl, this.options.baseUrl).toString();
    const bodyText = requestOptions.body?.toString();
    const cacheKey = HttpCache.key(method, url, bodyText);

    if (!requestOptions.forceRefresh) {
      const cached = await this.options.cache.get(
        requestOptions.category,
        cacheKey,
        requestOptions.ttlHours,
        false,
      );
      if (cached) {
        return {
          status: cached.entry.status,
          url,
          headers: cached.entry.headers,
          text: cached.entry.text,
          fromCache: true,
          stale: cached.stale,
        };
      }
    }

    try {
      const response = await this.limiter.run(() =>
        this.executeWithRetries(url, method, bodyText, requestOptions),
      );

      await this.options.cache.set(requestOptions.category, cacheKey, {
        fetchedAt: new Date().toISOString(),
        status: response.status,
        headers: response.headers as Record<string, string | string[]>,
        text: response.text,
      });

      return { ...response, fromCache: false, stale: false };
    } catch (error) {
      const stale = await this.options.cache.get(
        requestOptions.category,
        cacheKey,
        requestOptions.ttlHours,
        true,
      );
      if (stale && requestOptions.allowStale !== false) {
        this.options.logger.warn('SEIA no disponible; usando caché vencida', {
          url,
          age: stale.entry.fetchedAt,
        });
        return {
          status: stale.entry.status,
          url,
          headers: stale.entry.headers,
          text: stale.entry.text,
          fromCache: true,
          stale: true,
        };
      }
      throw error;
    }
  }

  private async executeWithRetries(
    url: string,
    method: 'GET' | 'POST',
    body: string | undefined,
    requestOptions: RequestOptions,
  ): Promise<Omit<HttpResponse, 'fromCache' | 'stale'>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      try {
        const response = await this.followRedirects(url, method, body, requestOptions);

        if (isChallenge(response.text, response.headers)) {
          const cookie = solveCookieChallenge(response.text);
          if (!cookie) {
            throw new SeiaChallengeError(
              'SEIA pidió verificación JavaScript y no fue posible resolverla automáticamente.',
              { url },
            );
          }
          const host = new URL(response.url).host;
          this.jar.setHeader(host, cookie);
          this.options.logger.info('Challenge SEIA resuelto; reintentando', { host });
          const retried = await this.followRedirects(
            url,
            method,
            body,
            requestOptions,
            true,
          );
          if (!isChallenge(retried.text, retried.headers)) return retried;
          throw new SeiaChallengeError('El challenge SEIA persistió.', { url });
        }

        if (shouldRetryStatus(response.status) && attempt < this.options.maxRetries) {
          const wait = retryAfterMs(response.headers) ?? backoff(attempt);
          this.options.logger.warn('SEIA respondió con estado reintentable', {
            status: response.status,
            attempt,
            wait,
          });
          await sleep(wait);
          continue;
        }

        return response;
      } catch (error) {
        if (error instanceof SeiaChallengeError) throw error;
        lastError = error;
        if (attempt < this.options.maxRetries) {
          const wait = backoff(attempt);
          this.options.logger.warn('Error de red con SEIA; reintentando', {
            attempt,
            wait,
            error: error instanceof Error ? error.message : String(error),
          });
          await sleep(wait);
          continue;
        }
      }
    }

    throw new AppError(
      'NETWORK_ERROR',
      'No fue posible comunicarse con el portal SEIA.',
      lastError instanceof Error ? lastError.message : String(lastError),
    );
  }

  private async followRedirects(
    initialUrl: string,
    method: 'GET' | 'POST',
    body: string | undefined,
    requestOptions: RequestOptions,
    challengeRetry = false,
  ): Promise<Omit<HttpResponse, 'fromCache' | 'stale'>> {
    let currentUrl = initialUrl;
    let currentMethod = method;
    let currentBody = body;

    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await this.requestOnce(
        currentUrl,
        currentMethod,
        currentBody,
        requestOptions,
        challengeRetry,
      );

      if (isRedirect(response.status) && response.headers.location) {
        const next = new URL(response.headers.location, currentUrl);
        if (next.protocol !== 'https:' && next.protocol !== 'http:') {
          throw new AppError('SEIA_ERROR', `Redirección no permitida: ${next.toString()}`);
        }
        currentUrl = next.toString();
        if (response.status === 303 || (response.status < 308 && currentMethod === 'POST')) {
          currentMethod = 'GET';
          currentBody = undefined;
        }
        continue;
      }

      return response;
    }

    throw new AppError('SEIA_ERROR', 'Demasiadas redirecciones desde SEIA.');
  }

  private requestOnce(
    urlString: string,
    method: 'GET' | 'POST',
    body: string | undefined,
    requestOptions: RequestOptions,
    _challengeRetry: boolean,
  ): Promise<Omit<HttpResponse, 'fromCache' | 'stale'>> {
    const url = new URL(urlString);
    const transport = url.protocol === 'https:' ? https : http;
    const cookie = this.jar.header(url.host);

    const headers: Record<string, string | number> = {
      'User-Agent': this.options.userAgent,
      Accept: requestOptions.accept ?? 'text/html,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.5',
      Connection: 'Keep-Alive',
    };
    if (cookie) headers.Cookie = cookie;
    if (method === 'POST' && body !== undefined) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    return new Promise((resolve, reject) => {
      const request = transport.request(
        url,
        { method, headers },
        (response) => {
          const chunks: Buffer[] = [];
          let total = 0;

          response.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > MAX_BODY_BYTES) {
              response.destroy(new Error('Respuesta de SEIA demasiado grande'));
              return;
            }
            chunks.push(chunk);
          });

          response.on('end', () => {
            const headersOut = response.headers;
            this.jar.setFromResponse(url.host, headersOut['set-cookie']);
            const contentType = headersOut['content-type'] ?? '';
            const text = decodeBody(Buffer.concat(chunks), contentType);
            resolve({
              status: response.statusCode ?? 0,
              url: url.toString(),
              headers: headersOut,
              text,
            });
          });
        },
      );

      request.setTimeout(this.options.timeoutMs, () => {
        request.destroy(new Error('Tiempo de espera agotado'));
      });
      request.on('error', reject);
      if (method === 'POST' && body !== undefined) request.write(body);
      request.end();
    });
  }
}

function decodeBody(buffer: Buffer, contentType: string): string {
  const charset = /charset\s*=\s*"?([^";]+)"?/i.exec(contentType)?.[1]?.toLowerCase() ?? '';
  if (
    charset.includes('iso-8859-1') ||
    charset.includes('latin') ||
    charset.includes('windows-1252')
  ) {
    return new TextDecoder('windows-1252').decode(buffer);
  }
  if (charset.includes('utf-8') || charset.includes('utf8')) {
    return new TextDecoder('utf-8').decode(buffer);
  }

  // El visor de documentos (infofirma) no declara charset y usa ISO-8859-1.
  // Intentamos UTF-8 estricto y, si falla, caemos a windows-1252.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryAfterMs(headers: IncomingHttpHeaders): number | undefined {
  const value = headers['retry-after'];
  if (!value || Array.isArray(value)) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return undefined;
}

function backoff(attempt: number): number {
  return 700 * 2 ** attempt + Math.floor(Math.random() * 300);
}

function isChallenge(text: string, headers: IncomingHttpHeaders): boolean {
  const contentType = headers['content-type'];
  const type = Array.isArray(contentType) ? contentType.join(';') : (contentType ?? '');
  if (!type.includes('html')) return false;
  if (text.length > 20_000) return false;
  return /eval\(function\(p,a,c,k,e,d\)/.test(text) || /document\.cookie/.test(text);
}
