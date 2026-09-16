import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Redis } from "ioredis";
import { PinoLogger } from "nestjs-pino";
import type { CepAddress } from "../cep.types.js";
import { REDIS_CLIENT } from "./redis-client.provider.js";

interface CachedCepEntry {
  value: CepAddress;
  cachedAt: number;
}

export type CepCacheLookup =
  | { status: "miss" }
  | { status: "fresh"; value: CepAddress }
  | { status: "stale"; value: CepAddress };

@Injectable()
export class CepCacheStore {
  private readonly freshTtlSeconds: number;
  private readonly graceSeconds: number;
  private hits = 0;
  private misses = 0;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    this.logger.setContext(CepCacheStore.name);
    this.freshTtlSeconds = configService.get<number>("redis.ttlSeconds")!;
    this.graceSeconds = configService.get<number>("redis.graceSeconds")!;
  }

  private key(cep: string): string {
    return `cep:${cep}`;
  }

  async lookup(cep: string): Promise<CepCacheLookup> {
    try {
      const raw = await this.redis.get(this.key(cep));
      if (!raw) {
        this.misses++;
        return { status: "miss" };
      }

      const entry = JSON.parse(raw) as CachedCepEntry;
      const ageSeconds = (Date.now() - entry.cachedAt) / 1000;

      if (ageSeconds <= this.freshTtlSeconds) {
        this.hits++;
        return { status: "fresh", value: entry.value };
      }

      if (ageSeconds <= this.freshTtlSeconds + this.graceSeconds) {
        this.hits++;
        return { status: "stale", value: entry.value };
      }

      this.misses++;
      return { status: "miss" };
    } catch (error) {
      this.logger.error({ cep, error }, "cache GET failed, treating as miss");
      this.misses++;
      return { status: "miss" };
    }
  }

  async set(cep: string, value: CepAddress): Promise<void> {
    try {
      const entry: CachedCepEntry = { value, cachedAt: Date.now() };
      await this.redis.set(
        this.key(cep),
        JSON.stringify(entry),
        "EX",
        this.freshTtlSeconds + this.graceSeconds,
      );
    } catch (error) {
      this.logger.error(
        { cep, error },
        "cache SET failed, continuing without cache write",
      );
    }
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
    };
  }
}
