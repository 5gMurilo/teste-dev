import type { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { CepCacheStore } from "../../src/cep/cache/cep-cache.store.js";
import type { CepAddress } from "../../src/cep/cep.types.js";
import { buildCepAddress } from "../support/fake-cep-address.js";
import { buildFakeLogger } from "../support/fake-logger.js";

const FRESH_TTL_SECONDS = 2;
const GRACE_SECONDS = 2;

function buildConfigService(): ConfigService {
  return {
    get: (key: string) =>
      (
        ({
          "redis.ttlSeconds": FRESH_TTL_SECONDS,
          "redis.graceSeconds": GRACE_SECONDS,
        }) as Record<string, number>
      )[key],
  } as unknown as ConfigService;
}

describe("CepCacheStore (integration)", () => {
  let redis: Redis;
  let store: CepCacheStore;

  beforeAll(() => {
    redis = new Redis(inject("redisUrl"));
    store = new CepCacheStore(redis, buildFakeLogger(), buildConfigService());
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("returns fresh right after set()", async () => {
    const value = buildCepAddress();

    await store.set("01310100", value);
    const result = await store.lookup("01310100");

    expect(result).toEqual({ status: "fresh", value });
  });

  it("returns stale when cachedAt is retroactively beyond freshTtlSeconds but within grace", async () => {
    const value: CepAddress = buildCepAddress({ cep: "20040020" });
    const cachedAt = Date.now() - (FRESH_TTL_SECONDS + 1) * 1000;
    await redis.set(
      "cep:20040020",
      JSON.stringify({ value, cachedAt }),
      "EX",
      60,
    );

    const result = await store.lookup("20040020");

    expect(result).toEqual({ status: "stale", value });
  });

  it("returns miss when cachedAt is retroactively beyond freshTtlSeconds + graceSeconds", async () => {
    const value: CepAddress = buildCepAddress({ cep: "30140071" });
    const cachedAt =
      Date.now() - (FRESH_TTL_SECONDS + GRACE_SECONDS + 1) * 1000;
    await redis.set(
      "cep:30140071",
      JSON.stringify({ value, cachedAt }),
      "EX",
      60,
    );

    const result = await store.lookup("30140071");

    expect(result).toEqual({ status: "miss" });
  });

  it("returns miss for a nonexistent key", async () => {
    const result = await store.lookup("99999999");

    expect(result).toEqual({ status: "miss" });
  });
});
