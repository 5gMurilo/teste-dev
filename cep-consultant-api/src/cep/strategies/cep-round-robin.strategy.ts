import { Injectable } from "@nestjs/common";
import type { CepProvider } from "../providers/cep.provider.js";
import type { CepProviderSelectionStrategy } from "./cep-provider-selection.strategy.js";

@Injectable()
export class CepRoundRobinSelection implements CepProviderSelectionStrategy {
  private currentIndex = 0;

  select(providers: CepProvider[]): CepProvider[] {
    if (providers.length === 0) {
      return [];
    }

    const startIndex = this.currentIndex;

    this.currentIndex = (this.currentIndex + 1) % providers.length;

    return [...providers.slice(startIndex), ...providers.slice(0, startIndex)];
  }
}
