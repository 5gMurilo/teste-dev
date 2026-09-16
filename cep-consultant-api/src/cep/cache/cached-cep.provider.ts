import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import { TelemetryEvents } from "../../common/telemetry-events.js";
import type { CepAddress } from "../cep.types.js";
import type { CepProvider } from "../providers/cep.provider.js";
import { CepProviderChain } from "../providers/cep-provider.chain.js";
import { CepCacheStore } from "./cep-cache.store.js";
import { RedisLockService } from "./redis-lock.service.js";

const POLL_INTERVAL_MS = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class CachedCepProvider implements CepProvider {
  private readonly lockTtlMs: number;

  constructor(
    private readonly chain: CepProviderChain,
    private readonly cache: CepCacheStore,
    private readonly lock: RedisLockService,
    private readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    this.logger.setContext(CachedCepProvider.name);
    this.lockTtlMs = configService.get<number>("redis.lockTtlMs")!;
  }

  async findByCep(cep: string): Promise<CepAddress> {
    const lookup = await this.cache.lookup(cep);

    if (lookup.status === "fresh") {
      this.logger.debug(
        { event: TelemetryEvents.CACHE_HIT, cep, freshness: "fresh" },
        "cache hit (fresh)",
      );
      return lookup.value;
    }

    if (lookup.status === "stale") {
      this.logger.debug(
        {
          event: TelemetryEvents.CACHE_HIT,
          cep,
          freshness: "stale",
        },
        "cache hit (stale) - serving degraded, revalidating in background",
      );
      void this.revalidateInBackground(cep);
      return lookup.value;
    }

    this.logger.debug({ event: TelemetryEvents.CACHE_MISS, cep }, "cache miss");
    return this.fetchWithSingleFlight(cep);
  }

  private async fetchWithSingleFlight(cep: string): Promise<CepAddress> {
    const lockKey = `lock:cep:${cep}`;
    const handle = await this.lock.acquire(lockKey, this.lockTtlMs);

    if (handle.redisDown) {
      this.logger.warn({ cep }, "redis unavailable, bypassing lock and cache");
      return this.chain.findByCep(cep);
    }

    if (handle.acquired) {
      return this.runAsLeader(cep, lockKey, handle.token!);
    }

    return this.waitAsFollower(cep, lockKey);
  }

  private async runAsLeader(
    cep: string,
    lockKey: string,
    token: string,
  ): Promise<CepAddress> {
    try {
      const result = await this.chain.findByCep(cep);
      await this.cache.set(cep, result);
      return result;
    } finally {
      await this.lock.release(lockKey, token);
    }
  }

  private async waitAsFollower(
    cep: string,
    lockKey: string,
  ): Promise<CepAddress> {
    const deadline = Date.now() + this.lockTtlMs;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const lookup = await this.cache.lookup(cep);
      if (lookup.status === "fresh") {
        return lookup.value;
      }

      if (!(await this.lock.exists(lockKey))) {
        break;
      }
    }

    this.logger.warn(
      { cep },
      "follower poll exhausted, calling provider directly",
    );
    return this.chain.findByCep(cep);
  }

  private async revalidateInBackground(cep: string): Promise<void> {
    const lockKey = `lock:cep:${cep}`;
    const handle = await this.lock.acquire(lockKey, this.lockTtlMs);

    if (!handle.acquired || handle.redisDown) {
      return;
    }

    try {
      const result = await this.chain.findByCep(cep);
      await this.cache.set(cep, result);
    } catch (error) {
      this.logger.warn({ cep, error }, "background revalidation failed");
    } finally {
      await this.lock.release(lockKey, handle.token!);
    }
  }
}
