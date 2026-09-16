export class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(
    private readonly maxConcurrency: number,
    private readonly onQueue?: () => void,
  ) {}

  async acquire(): Promise<() => void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return () => this.release();
    }

    this.onQueue?.();

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.running++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}
