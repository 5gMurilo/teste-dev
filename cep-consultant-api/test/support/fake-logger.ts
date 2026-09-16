import type { PinoLogger } from "nestjs-pino";
import { vi } from "vitest";

export function buildFakeLogger(): PinoLogger {
  return {
    setContext: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as PinoLogger;
}
