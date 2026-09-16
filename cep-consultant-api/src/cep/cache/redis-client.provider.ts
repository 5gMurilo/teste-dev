import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { PinoLogger } from "nestjs-pino";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService, logger: PinoLogger) => {
    const url = configService.get<string>("redis.url");

    const client = new Redis(url as string, {
      commandTimeout: 1000,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 20) return null;
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    client.on("error", (error) => logger.error(`Redis error ${error.message}`));
    client.on("connect", () => logger.debug("Redis connected"));
    client.on("reconnecting", (ms: number) =>
      logger.warn(`Redis recoonecting in ${ms}ms`),
    );

    client.defineCommand("releaseLock", {
      numberOfKeys: 1,
      lua: `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `,
    });

    return client;
  },
  inject: [ConfigService, PinoLogger],
};
