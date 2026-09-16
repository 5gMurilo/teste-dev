export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitOpenError extends Error {
  constructor(message = "Circuit breaker is OPEN") {
    super(message);
    this.name = "CircuitOpenError";
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  onTransition?: (from: CircuitState, to: CircuitState) => void;
  onReject?: () => void;
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime?: number;
  private halfOpenCalls = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitState {
    return this.state;
  }

  async execute<T>(
    fn: () => Promise<T>,
    isFailure: (error: unknown) => boolean = () => true,
  ): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - (this.lastFailureTime ?? 0);
      if (elapsed > this.options.resetTimeoutMs) {
        this.transitionTo("HALF_OPEN");
        this.halfOpenCalls = 0;
      } else {
        this.options.onReject?.();
        throw new CircuitOpenError();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (isFailure(error)) {
        this.onFailure();
      }
      throw error;
    }
  }

  private transitionTo(nextState: CircuitState): void {
    const previousState = this.state;
    this.state = nextState;
    this.options.onTransition?.(previousState, nextState);
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.halfOpenCalls++;
      if (this.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        this.transitionTo("CLOSED");
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (
      this.state === "HALF_OPEN" ||
      this.failures >= this.options.failureThreshold
    ) {
      this.transitionTo("OPEN");
    }
  }
}
