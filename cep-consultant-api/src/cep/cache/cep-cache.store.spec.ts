import type { ConfigService } from "@nestjs/config";
import type { Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCepAddress } from "../../../test/support/fake-cep-address.js";
import { buildFakeLogger } from "../../../test/support/fake-logger.js";
import { buildFakeRedisClient } from "../../../test/support/fake-redis-client.js";
import { CepCacheStore } from "./cep-cache.store.js";

const FRESH_TTL_SECONDS = 100;
const GRACE_SECONDS = 50;

function buildConfigService(): ConfigService {
  return {
    get: vi.fn(
      (key: string) =>
        ({
          "redis.ttlSeconds": FRESH_TTL_SECONDS,
          "redis.graceSeconds": GRACE_SECONDS,
        })[key],
    ),
  } as unknown as ConfigService;
}

function buildStore(redis: Redis) {
  return new CepCacheStore(redis, buildFakeLogger(), buildConfigService());
}

describe("CepCacheStore", () => {
  let redis: Redis;

  beforeEach(() => {
    redis = buildFakeRedisClient();
  });

  describe("lookup", () => {
    it("returns miss when redis.get resolves null", async () => {
      vi.mocked(redis.get).mockResolvedValue(null);
      const store = buildStore(redis);

      const result = await store.lookup("01310100");

      expect(result).toEqual({ status: "miss" });
    });

    it("returns fresh when entry age is within freshTtlSeconds", async () => {
      const value = buildCepAddress();
      const cachedAt = Date.now() - (FRESH_TTL_SECONDS - 1) * 1000;
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ value, cachedAt }),
      );
      const store = buildStore(redis);

      const result = await store.lookup("01310100");

      expect(result).toEqual({ status: "fresh", value });
    });

    it("returns stale when age is beyond fresh but within freshTtlSeconds + graceSeconds", async () => {
      const value = buildCepAddress();
      const cachedAt =
        Date.now() - (FRESH_TTL_SECONDS + GRACE_SECONDS) * 1000 + 1000;
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ value, cachedAt }),
      );
      const store = buildStore(redis);

      const result = await store.lookup("01310100");

      expect(result).toEqual({ status: "stale", value });
    });

    it("returns miss when age exceeds freshTtlSeconds + graceSeconds", async () => {
      const value = buildCepAddress();
      const cachedAt =
        Date.now() - (FRESH_TTL_SECONDS + GRACE_SECONDS) * 1000 - 1000;
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ value, cachedAt }),
      );
      const store = buildStore(redis);

      const result = await store.lookup("01310100");

      expect(result).toEqual({ status: "miss" });
    });

    it("treats malformed JSON from redis.get as miss without throwing", async () => {
      vi.mocked(redis.get).mockResolvedValue("{not-json");
      const store = buildStore(redis);

      const result = await store.lookup("01310100");

      expect(result).toEqual({ status: "miss" });
    });

    it("returns miss without throwing when redis.get rejects", async () => {
      vi.mocked(redis.get).mockRejectedValue(new Error("connection refused"));
      const store = buildStore(redis);

      const result = await store.lookup("01310100");

      expect(result).toEqual({ status: "miss" });
    });
  });

  describe("set", () => {
    it("calls redis.set with the right key format and a JSON payload including cachedAt", async () => {
      vi.mocked(redis.set).mockResolvedValue("OK");
      const store = buildStore(redis);
      const value = buildCepAddress();

      await store.set("01310100", value);

      expect(redis.set).toHaveBeenCalledTimes(1);
      const [key, payload, exArg, ttlArg] = vi.mocked(redis.set).mock
        .calls[0] as unknown as [string, string, string, number];
      expect(key).toBe("cep:01310100");
      expect(exArg).toBe("EX");
      expect(ttlArg).toBe(FRESH_TTL_SECONDS + GRACE_SECONDS);
      const parsed = JSON.parse(payload as string);
      expect(parsed.value).toEqual(value);
      expect(typeof parsed.cachedAt).toBe("number");
    });

    it("resolves without throwing when redis.set rejects", async () => {
      vi.mocked(redis.set).mockRejectedValue(new Error("connection refused"));
      const store = buildStore(redis);

      await expect(
        store.set("01310100", buildCepAddress()),
      ).resolves.toBeUndefined();
    });
  });
});
