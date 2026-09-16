import { vi } from "vitest";
import type { CepCacheLookup } from "../../src/cep/cache/cep-cache.store.js";
import type { LockHandle } from "../../src/cep/cache/redis-lock.service.js";
import type { CepAddress } from "../../src/cep/cep.types.js";

export interface StatefulCacheLockFixture {
  cache: {
    lookup: (cep: string) => Promise<CepCacheLookup>;
    set: (cep: string, value: CepAddress) => Promise<void>;
  };
  lock: {
    acquire: (key: string, ttlMs: number) => Promise<LockHandle>;
    release: (key: string, token: string) => Promise<void>;
    exists: (key: string) => Promise<boolean>;
  };
}

/**
 * Shares real state between "leader" and "followers" so single-flight
 * scenarios behave like the real Redis-backed lock/cache: only the first
 * acquire() per key succeeds, and exists() reflects whether that lock is
 * still held, exactly as waitAsFollower() depends on.
 */
export function buildStatefulCacheLockFixture(): StatefulCacheLockFixture {
  const cacheMap = new Map<string, CepAddress>();
  const heldLocks = new Set<string>();

  return {
    cache: {
      lookup: vi.fn(async (cep: string): Promise<CepCacheLookup> => {
        const value = cacheMap.get(cep);
        return value ? { status: "fresh", value } : { status: "miss" };
      }),
      set: vi.fn(async (cep: string, value: CepAddress): Promise<void> => {
        cacheMap.set(cep, value);
      }),
    },
    lock: {
      acquire: vi.fn(async (key: string): Promise<LockHandle> => {
        if (heldLocks.has(key)) {
          return { acquired: false, redisDown: false };
        }
        heldLocks.add(key);
        return { acquired: true, redisDown: false, token: "test-token" };
      }),
      release: vi.fn(async (key: string): Promise<void> => {
        heldLocks.delete(key);
      }),
      exists: vi.fn(
        async (key: string): Promise<boolean> => heldLocks.has(key),
      ),
    },
  };
}
