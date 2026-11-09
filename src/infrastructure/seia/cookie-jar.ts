export class CookieJar {
  private readonly cookies = new Map<string, Map<string, string>>();

  setFromResponse(host: string, setCookie: string[] | string | undefined): void {
    if (!setCookie) return;
    const values = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const value of values) {
      const pair = value.split(';', 1)[0]?.trim();
      if (!pair) continue;
      const separator = pair.indexOf('=');
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const cookieValue = pair.slice(separator + 1).trim();
      this.set(host, name, cookieValue);
    }
  }

  set(host: string, name: string, value: string): void {
    const hostCookies = this.cookies.get(host) ?? new Map<string, string>();
    hostCookies.set(name, value);
    this.cookies.set(host, hostCookies);
  }

  setHeader(host: string, cookieHeader: string): void {
    const segments = cookieHeader.split(';');
    for (const segment of segments) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      this.set(host, trimmed.slice(0, separator), trimmed.slice(separator + 1));
    }
  }

  header(host: string): string | undefined {
    const hostCookies = this.cookies.get(host);
    if (!hostCookies || hostCookies.size === 0) return undefined;
    return [...hostCookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  clear(): void {
    this.cookies.clear();
  }
}
