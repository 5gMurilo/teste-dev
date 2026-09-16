import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker.js";

describe("CircuitBreaker", () => {
  const options = {
    failureThreshold: 3,
    resetTimeoutMs: 1000,
    halfOpenMaxCalls: 2,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("transitions from CLOSED to OPEN after exactly failureThreshold failures", async () => {
    const breaker = new CircuitBreaker(options);
    const failingFn = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < options.failureThreshold; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow("boom");
    }

    expect(breaker.getState()).toBe("OPEN");
  });

  it("rejects immediately without calling fn when OPEN, throwing CircuitOpenError", async () => {
    const breaker = new CircuitBreaker(options);
    const failingFn = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < options.failureThreshold; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow("boom");
    }

    expect(breaker.getState()).toBe("OPEN");

    const fn = vi.fn().mockResolvedValue("should not run");

    await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
  });

  it("stays OPEN when elapsed equals resetTimeoutMs exactly", async () => {
    const breaker = new CircuitBreaker(options);
    const failingFn = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < options.failureThreshold; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow("boom");
    }

    vi.advanceTimersByTime(options.resetTimeoutMs);

    const fn = vi.fn().mockResolvedValue("should not run");
    await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
    expect(fn).not.toHaveBeenCalled();
    expect(breaker.getState()).toBe("OPEN");
  });

  it("transitions to HALF_OPEN when elapsed is greater than resetTimeoutMs", async () => {
    const breaker = new CircuitBreaker(options);
    const failingFn = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < options.failureThreshold; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow("boom");
    }

    vi.advanceTimersByTime(options.resetTimeoutMs + 1);

    const fn = vi.fn().mockResolvedValue("ok");
    await expect(breaker.execute(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("transitions from HALF_OPEN to CLOSED after halfOpenMaxCalls successes", async () => {
    const breaker = new CircuitBreaker(options);
    const failingFn = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < options.failureThreshold; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow("boom");
    }

    vi.advanceTimersByTime(options.resetTimeoutMs + 1);

    const successFn = vi.fn().mockResolvedValue("ok");

    for (let i = 0; i < options.halfOpenMaxCalls; i++) {
      await expect(breaker.execute(successFn)).resolves.toBe("ok");
    }

    expect(breaker.getState()).toBe("CLOSED");
  });

  it("transitions from HALF_OPEN to OPEN on a single failure", async () => {
    const breaker = new CircuitBreaker(options);
    const failingFn = vi.fn().mockRejectedValue(new Error("boom"));

    for (let i = 0; i < options.failureThreshold; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow("boom");
    }

    vi.advanceTimersByTime(options.resetTimeoutMs + 1);

    await expect(breaker.execute(failingFn)).rejects.toThrow("boom");

    expect(breaker.getState()).toBe("OPEN");
  });
});
