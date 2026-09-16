import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { RedisLockService } from "../../src/cep/cache/redis-lock.service.js";
import { buildFakeLogger } from "../support/fake-logger.js";

describe("RedisLockService (integration)", () => {
  let redis: Redis;
  let service: RedisLockService;

  beforeAll(() => {
    redis = new Redis(inject("redisUrl"));
    service = new RedisLockService(redis, buildFakeLogger());
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("acquires a fresh key successfully", async () => {
    const result = await service.acquire("lock:integration:acquire", 5000);

    expect(result.acquired).toBe(true);
    expect(result.redisDown).toBe(false);
    expect(result.token).toBeTruthy();

    await service.release("lock:integration:acquire", result.token as string);
  });

  it("fails to acquire the same key before it is released", async () => {
    const first = await service.acquire("lock:integration:contended", 5000);
    expect(first.acquired).toBe(true);

    const second = await service.acquire("lock:integration:contended", 5000);
    expect(second.acquired).toBe(false);
    expect(second.redisDown).toBe(false);

    await service.release("lock:integration:contended", first.token as string);
  });

  it("does not delete the key when release is called with the wrong token", async () => {
    const acquired = await service.acquire(
      "lock:integration:wrong-token",
      5000,
    );
    expect(acquired.acquired).toBe(true);

    await service.release("lock:integration:wrong-token", "wrong-token");

    await expect(service.exists("lock:integration:wrong-token")).resolves.toBe(
      true,
    );

    await service.release(
      "lock:integration:wrong-token",
      acquired.token as string,
    );
  });

  it("deletes the key when release is called with the correct token", async () => {
    const acquired = await service.acquire(
      "lock:integration:correct-token",
      5000,
    );
    expect(acquired.acquired).toBe(true);

    await service.release(
      "lock:integration:correct-token",
      acquired.token as string,
    );

    await expect(
      service.exists("lock:integration:correct-token"),
    ).resolves.toBe(false);
  });

  it("exists reflects presence and absence correctly", async () => {
    await expect(service.exists("lock:integration:never-set")).resolves.toBe(
      false,
    );

    const acquired = await service.acquire("lock:integration:presence", 5000);
    await expect(service.exists("lock:integration:presence")).resolves.toBe(
      true,
    );

    await service.release(
      "lock:integration:presence",
      acquired.token as string,
    );
    await expect(service.exists("lock:integration:presence")).resolves.toBe(
      false,
    );
  });
});
