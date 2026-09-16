import { Injectable } from "@nestjs/common";
import { CepCacheStore } from "../cep/cache/cep-cache.store.js";
import { BrasilApiProvider } from "../cep/providers/adapters/brasilapi.provider.js";
import { ViaCepProvider } from "../cep/providers/adapters/viacep.provider.js";
import { CepProviderChain } from "../cep/providers/cep-provider.chain.js";

@Injectable()
export class HealthService {
  constructor(
    private readonly viaCepProvider: ViaCepProvider,
    private readonly brasilApiProvider: BrasilApiProvider,
    private readonly cacheStore: CepCacheStore,
    private readonly chain: CepProviderChain,
  ) {}

  async getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        viaCep: this.viaCepProvider.getHealth(),
        brasilApi: this.brasilApiProvider.getHealth(),
      },
      cache: this.cacheStore.getStats(),
      fallback: this.chain.getFallbackStats(),
    };
  }
}
