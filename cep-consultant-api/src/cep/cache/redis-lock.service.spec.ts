import type { Redis } from "ioredis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFakeLogger } from "../../../test/support/fake-logger.js";
import { buildFakeRedisClient } from "../../../test/support/fake-redis-client.js";
import { RedisLockService } from "./redis-lock.service.js";

describe("RedisLockService", () => {
  let redis: Redis;
  let service: RedisLockService;

  beforeEach(() => {
    redis = buildFakeRedisClient();
    service = new RedisLockService(redis, buildFakeLogger());
  });

  describe("acquire", () => {
    it("returns acquired:true with a token when redis.set with NX resolves OK", async () => {
      vi.mocked(redis.set).mockResolvedValue("OK");

      const result = await service.acquire("lock:cep:01310100", 4000);

      expect(result.acquired).toBe(true);
      expect(result.redisDown).toBe(false);
      expect(result.token).toBeTruthy();
    });

    it("returns acquired:false when the key already exists (redis.set resolves null)", async () => {
      vi.mocked(redis.set).mockResolvedValue(null as unknown as "OK");

      const result = await service.acquire("lock:cep:01310100", 4000);

      expect(result.acquired).toBe(false);
      expect(result.redisDown).toBe(false);
    });

    it("returns acquired:false and redisDown:true without a token when redis.set throws", async () => {
      vi.mocked(redis.set).mockRejectedValue(new Error("connection refused"));

      const result = await service.acquire("lock:cep:01310100", 4000);

      expect(result).toEqual({ acquired: false, redisDown: true });
      expect(result.token).toBeUndefined();
    });
  });

  describe("release", () => {
    it("calls redis.eval with the Lua script, key, and token", async () => {
      vi.mocked(redis.eval).mockResolvedValue(1);

      await service.release("lock:cep:01310100", "token-abc");

      expect(redis.eval).toHaveBeenCalledWith(
        expect.stringContaining("redis.call"),
        1,
        "lock:cep:01310100",
        "token-abc",
      );
    });

    it("does not throw when redis.eval throws", async () => {
      vi.mocked(redis.eval).mockRejectedValue(new Error("connection refused"));

      await expect(
        service.release("lock:cep:01310100", "token-abc"),
      ).resolves.toBeUndefined();
    });
  });

  describe("exists", () => {
    it("returns true when redis.exists resolves 1", async () => {
      vi.mocked(redis.exists).mockResolvedValue(1);

      await expect(service.exists("lock:cep:01310100")).resolves.toBe(true);
    });

    it("returns false when redis.exists resolves 0", async () => {
      vi.mocked(redis.exists).mockResolvedValue(0);

      await expect(service.exists("lock:cep:01310100")).resolves.toBe(false);
    });

    it("returns false when redis.exists throws", async () => {
      vi.mocked(redis.exists).mockRejectedValue(
        new Error("connection refused"),
      );

      await expect(service.exists("lock:cep:01310100")).resolves.toBe(false);
    });
  });
});
