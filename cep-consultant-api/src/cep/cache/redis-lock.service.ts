import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import { PinoLogger } from "nestjs-pino";
import { REDIS_CLIENT } from "./redis-client.provider.js";

export interface LockHandle {
  acquired: boolean;
  redisDown: boolean;
  token?: string;
}

const RELEASE_SCRIPT = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
`;

@Injectable()
export class RedisLockService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RedisLockService.name);
  }

  async acquire(key: string, ttlMs: number): Promise<LockHandle> {
    const token = randomUUID();
    try {
      const result = await this.redis.set(key, token, "PX", ttlMs, "NX");

      return { acquired: result === "OK", redisDown: false, token };
    } catch (error) {
      this.logger.error(
        { key, error },
        "lock acquire failed, treating Redis as unavailable",
      );
      return { acquired: false, redisDown: true };
    }
  }

  async release(key: string, token: string): Promise<void> {
    try {
      await this.redis.eval(RELEASE_SCRIPT, 1, key, token);
    } catch (error) {
      this.logger.error({ key, error }, "lock release failed");
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch {
      return false;
    }
  }
}
