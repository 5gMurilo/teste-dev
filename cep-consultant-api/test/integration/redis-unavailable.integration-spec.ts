import type { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CepCacheStore } from "../../src/cep/cache/cep-cache.store.js";
import { RedisLockService } from "../../src/cep/cache/redis-lock.service.js";
import { buildFakeLogger } from "../support/fake-logger.js";

function buildConfigService(): ConfigService {
  return {
    get: () => 100,
  } as unknown as ConfigService;
}

describe("Redis unavailable (integration)", () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis("redis://127.0.0.1:1", {
      enableOfflineQueue: false,
      commandTimeout: 1000,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
  });

  afterAll(async () => {
    try {
      redis.disconnect();
    } catch {}
  });

  it("CepCacheStore.lookup returns miss without throwing", async () => {
    const store = new CepCacheStore(
      redis,
      buildFakeLogger(),
      buildConfigService(),
    );

    await expect(store.lookup("01310100")).resolves.toEqual({ status: "miss" });
  });

  it("RedisLockService.acquire returns redisDown:true", async () => {
    const service = new RedisLockService(redis, buildFakeLogger());

    const result = await service.acquire("lock:cep:01310100", 1000);

    expect(result.acquired).toBe(false);
    expect(result.redisDown).toBe(true);
  });
});
