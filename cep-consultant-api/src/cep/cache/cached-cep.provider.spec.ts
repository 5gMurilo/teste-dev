import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCepAddress } from "../../../test/support/fake-cep-address.js";
import { buildFakeLogger } from "../../../test/support/fake-logger.js";
import { buildStatefulCacheLockFixture } from "../../../test/support/stateful-cache-lock.fixture.js";
import type { CepAddress } from "../cep.types.js";
import type { CepProviderChain } from "../providers/cep-provider.chain.js";
import { CachedCepProvider } from "./cached-cep.provider.js";
import type { CepCacheStore } from "./cep-cache.store.js";
import type { RedisLockService } from "./redis-lock.service.js";

const LOCK_TTL_MS = 4000;

function buildConfigService(lockTtlMs = LOCK_TTL_MS): ConfigService {
  return {
    get: vi.fn().mockReturnValue(lockTtlMs),
  } as unknown as ConfigService;
}

describe("CachedCepProvider", () => {
  it("should return cached value without calling chain.findByCep", async () => {
    const value = buildCepAddress();
    const chain = { findByCep: vi.fn() } as unknown as CepProviderChain;
    const cache = {
      lookup: vi.fn().mockResolvedValue({ status: "fresh", value }),
      set: vi.fn(),
    } as unknown as CepCacheStore;
    const lock = {
      acquire: vi.fn(),
      release: vi.fn(),
      exists: vi.fn(),
    } as unknown as RedisLockService;

    const provider = new CachedCepProvider(
      chain,
      cache,
      lock,
      buildFakeLogger(),
      buildConfigService(),
    );

    const result = await provider.findByCep("01310100");

    expect(result).toEqual(value);
    expect(chain.findByCep).not.toHaveBeenCalled();
  });

  it("should call chain, return result and persist to cache (leader path, provider A succeeds)", async () => {
    const value = buildCepAddress();
    const chain = {
      findByCep: vi.fn().mockResolvedValue(value),
    } as unknown as CepProviderChain;
    const cache = {
      lookup: vi.fn().mockResolvedValue({ status: "miss" }),
      set: vi.fn().mockResolvedValue(undefined),
    } as unknown as CepCacheStore;
    const lock = {
      acquire: vi
        .fn()
        .mockResolvedValue({ acquired: true, redisDown: false, token: "t" }),
      release: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
    } as unknown as RedisLockService;

    const provider = new CachedCepProvider(
      chain,
      cache,
      lock,
      buildFakeLogger(),
      buildConfigService(),
    );

    const result = await provider.findByCep("01310100");

    expect(result).toEqual(value);
    expect(cache.set).toHaveBeenCalledWith("01310100", value);
  });

  it("should call chain, return result and persist to cache (leader path, provider A fails and chain falls back to B)", async () => {
    const value = buildCepAddress({ street: "Rua fallback B" });
    const chain = {
      findByCep: vi.fn().mockResolvedValue(value),
    } as unknown as CepProviderChain;
    const cache = {
      lookup: vi.fn().mockResolvedValue({ status: "miss" }),
      set: vi.fn().mockResolvedValue(undefined),
    } as unknown as CepCacheStore;
    const lock = {
      acquire: vi
        .fn()
        .mockResolvedValue({ acquired: true, redisDown: false, token: "t" }),
      release: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
    } as unknown as RedisLockService;

    const provider = new CachedCepProvider(
      chain,
      cache,
      lock,
      buildFakeLogger(),
      buildConfigService(),
    );

    const result = await provider.findByCep("01310100");

    expect(result).toEqual(value);
    expect(cache.set).toHaveBeenCalledWith("01310100", value);
  });

  it("should bypass lock/cache and call chain directly when redis is down", async () => {
    const value = buildCepAddress();
    const chain = {
      findByCep: vi.fn().mockResolvedValue(value),
    } as unknown as CepProviderChain;
    const cache = {
      lookup: vi.fn().mockResolvedValue({ status: "miss" }),
      set: vi.fn(),
    } as unknown as CepCacheStore;
    const lock = {
      acquire: vi.fn().mockResolvedValue({ acquired: false, redisDown: true }),
      release: vi.fn(),
      exists: vi.fn(),
    } as unknown as RedisLockService;

    const provider = new CachedCepProvider(
      chain,
      cache,
      lock,
      buildFakeLogger(),
      buildConfigService(),
    );

    const result = await provider.findByCep("01310100");

    expect(result).toEqual(value);
    expect(chain.findByCep).toHaveBeenCalledWith("01310100");
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("should bypass lock/cache and return chain result even when chain internally fell back to B", async () => {
    const value = buildCepAddress({ street: "Rua fallback B" });
    const chain = {
      findByCep: vi.fn().mockResolvedValue(value),
    } as unknown as CepProviderChain;
    const cache = {
      lookup: vi.fn().mockResolvedValue({ status: "miss" }),
      set: vi.fn(),
    } as unknown as CepCacheStore;
    const lock = {
      acquire: vi.fn().mockResolvedValue({ acquired: false, redisDown: true }),
      release: vi.fn(),
      exists: vi.fn(),
    } as unknown as RedisLockService;

    const provider = new CachedCepProvider(
      chain,
      cache,
      lock,
      buildFakeLogger(),
      buildConfigService(),
    );

    const result = await provider.findByCep("01310100");

    expect(result).toEqual(value);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("should return stale value immediately and trigger background revalidation that updates the cache", async () => {
    const staleValue = buildCepAddress({ street: "Rua antiga" });
    const freshValue = buildCepAddress({ street: "Rua nova" });

    let resolveChain!: (value: CepAddress) => void;
    const chainPromise = new Promise<CepAddress>((resolve) => {
      resolveChain = resolve;
    });

    const chain = {
      findByCep: vi.fn().mockReturnValue(chainPromise),
    } as unknown as CepProviderChain;
    const cache = {
      lookup: vi.fn().mockResolvedValue({ status: "stale", value: staleValue }),
      set: vi.fn().mockResolvedValue(undefined),
    } as unknown as CepCacheStore;
    const lock = {
      acquire: vi
        .fn()
        .mockResolvedValue({ acquired: true, redisDown: false, token: "t" }),
      release: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
    } as unknown as RedisLockService;

    const provider = new CachedCepProvider(
      chain,
      cache,
      lock,
      buildFakeLogger(),
      buildConfigService(),
    );

    const result = await provider.findByCep("01310100");
    expect(result).toEqual(staleValue);

    resolveChain(freshValue);

    await vi.waitFor(() => {
      expect(cache.set).toHaveBeenCalledWith("01310100", freshValue);
    });
  });

  describe("single-flight", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should call chain.findByCep exactly once for 100 concurrent requests on the same CEP (single-flight)", async () => {
      const value = buildCepAddress();
      const fixture = buildStatefulCacheLockFixture();
      const chain = {
        findByCep: vi.fn(() => Promise.resolve(value)),
      } as unknown as CepProviderChain;

      const provider = new CachedCepProvider(
        chain,
        fixture.cache as unknown as CepCacheStore,
        fixture.lock as unknown as RedisLockService,
        buildFakeLogger(),
        buildConfigService(60_000),
      );

      const resultsPromise = Promise.all(
        Array.from({ length: 100 }, () => provider.findByCep("01310100")),
      );

      await vi.advanceTimersByTimeAsync(5_000);

      const results = await resultsPromise;

      expect(chain.findByCep).toHaveBeenCalledTimes(1);
      for (const result of results) {
        expect(result).toEqual(value);
      }
    });
  });
});
