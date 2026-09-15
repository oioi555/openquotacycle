class NowTickerController {
  now = $state(Date.now());

  private interval: ReturnType<typeof setInterval> | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  start(options: { enabled?: boolean; intervalMs?: number; stopAfterMs?: number | null } = {}): void {
    this.stop();
    const { enabled = true, intervalMs = 1000, stopAfterMs = null } = options;
    if (!enabled) return;

    this.now = Date.now();
    this.interval = setInterval(() => {
      this.now = Date.now();
    }, intervalMs);

    if (stopAfterMs !== null && stopAfterMs !== undefined) {
      if (stopAfterMs <= 0) {
        this.stop();
        return;
      }
      this.timeout = setTimeout(() => this.stop(), stopAfterMs);
    }
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

export { NowTickerController };

export const nowTicker = new NowTickerController();
