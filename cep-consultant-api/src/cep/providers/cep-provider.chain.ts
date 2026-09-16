import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import {
  HttpConnectionError,
  HttpResponseError,
  HttpTimeoutError,
} from "../../common/http-errors.js";
import { CepProviderUnavailableError } from "../../common/provider-errors.js";
import { TelemetryEvents } from "../../common/telemetry-events.js";
import type { CepAddress } from "../cep.types.js";
import { Semaphore } from "../resilience/semaphore.js";
import {
  CEP_PROVIDER_SELECTION_STRATEGY,
  type CepProviderSelectionStrategy,
} from "../strategies/cep-provider-selection.strategy.js";
import { CEP_PROVIDERS, type CepProvider } from "./cep.provider.js";

@Injectable()
export class CepProviderChain implements CepProvider {
  private readonly semaphore: Semaphore;
  private fallbackCount = 0;
  @Inject(CEP_PROVIDER_SELECTION_STRATEGY)
  private readonly strategy: CepProviderSelectionStrategy;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(CEP_PROVIDERS)
    private readonly providers: CepProvider[],
    config: ConfigService,
  ) {
    this.semaphore = new Semaphore(
      config.get<number>("concurrency.limit") ?? 10,
      () => {
        this.logger.warn(
          { event: TelemetryEvents.CONCURRENCY_LIMIT_REACHED },
          "Concurrency limit reached, request queued",
        );
      },
    );
  }

  async findByCep(cep: string): Promise<CepAddress> {
    const release = await this.semaphore.acquire();
    try {
      return await this.executeWithFallback(cep);
    } finally {
      release();
    }
  }

  getFallbackStats() {
    return {
      count: this.fallbackCount,
    };
  }

  private async executeWithFallback(cep: string): Promise<CepAddress> {
    const providers = this.strategy.select(this.providers);

    for (const [index, provider] of providers.entries()) {
      this.logger.debug(
        {
          event: TelemetryEvents.PROVIDER_SELECTED,
          provider: provider.constructor.name,
          cep,
          attempt: index + 1,
        },
        "Provider selected for CEP lookup",
      );

      try {
        return await provider.findByCep(cep);
      } catch (error) {
        if (!this.shouldFallback(error)) {
          throw error;
        }

        this.fallbackCount++;

        this.logger.error(
          {
            event: TelemetryEvents.PROVIDER_FALLBACK,
            provider: provider.constructor.name,
            cep,
            error: error instanceof Error ? error.name : "Unknown Error",
          },
          "CEP provider failed, trying next provider",
        );
      }
    }

    throw new CepProviderUnavailableError();
  }

  private shouldFallback(error: unknown): boolean {
    return (
      error instanceof HttpTimeoutError ||
      error instanceof HttpConnectionError ||
      (error instanceof HttpResponseError && error.details.status >= 500)
    );
  }
}
