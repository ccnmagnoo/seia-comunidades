export class RateLimiter {
  private chain: Promise<void> = Promise.resolve();
  private lastStartedAt = 0;

  constructor(private readonly delayMs: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.chain.then(async () => {
      const elapsed = Date.now() - this.lastStartedAt;
      const wait = Math.max(0, this.delayMs - elapsed);
      if (wait > 0) await sleep(wait);
      this.lastStartedAt = Date.now();
      return task();
    });

    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
