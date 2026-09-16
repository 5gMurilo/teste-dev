import type { Redis } from "ioredis";
import { vi } from "vitest";

export function buildFakeRedisClient(): Redis {
  return {
    get: vi.fn(),
    set: vi.fn(),
    eval: vi.fn(),
    exists: vi.fn(),
  } as unknown as Redis;
}
