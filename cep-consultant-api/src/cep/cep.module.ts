import { Module } from "@nestjs/common";
import { HttpFetcher } from "../common/http-fetcher.js";
import { CachedCepProvider } from "./cache/cached-cep.provider.js";
import { CepCacheStore } from "./cache/cep-cache.store.js";
import { redisClientProvider } from "./cache/redis-client.provider.js";
import { RedisLockService } from "./cache/redis-lock.service.js";
import { CepController } from "./cep.controller.js";
import { CepService } from "./cep.service.js";
import { BrasilApiProvider } from "./providers/adapters/brasilapi.provider.js";
import { ViaCepProvider } from "./providers/adapters/viacep.provider.js";
import {
  CEP_PROVIDER,
  CEP_PROVIDERS,
  type CepProvider,
} from "./providers/cep.provider.js";
import { CepProviderChain } from "./providers/cep-provider.chain.js";
import { CEP_PROVIDER_SELECTION_STRATEGY } from "./strategies/cep-provider-selection.strategy.js";
import { CepRoundRobinSelection } from "./strategies/cep-round-robin.strategy.js";

const CEP_PROVIDER_ADAPTERS = [ViaCepProvider, BrasilApiProvider];

@Module({
  controllers: [CepController],
  providers: [
    CepService,
    HttpFetcher,
    ViaCepProvider,
    BrasilApiProvider,
    CepProviderChain,
    redisClientProvider,
    CepCacheStore,
    RedisLockService,
    CachedCepProvider,
    CepRoundRobinSelection,
    {
      provide: CEP_PROVIDER_SELECTION_STRATEGY,
      useExisting: CepRoundRobinSelection,
    },
    {
      provide: CEP_PROVIDER,
      useExisting: CachedCepProvider,
    },
    {
      provide: CEP_PROVIDERS,
      useFactory: (...instances: CepProvider[]) => instances,
      inject: CEP_PROVIDER_ADAPTERS,
    },
  ],
  exports: [CepProviderChain, ViaCepProvider, BrasilApiProvider, CepCacheStore],
})
export class CepModule {}
