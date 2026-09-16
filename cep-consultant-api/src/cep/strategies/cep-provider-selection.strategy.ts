import type { CepProvider } from "../providers/cep.provider.js";

export interface CepProviderSelectionStrategy {
  select(providers: CepProvider[]): CepProvider[];
}

export const CEP_PROVIDER_SELECTION_STRATEGY = Symbol(
  "CEP_PROVIDER_SELECTION_STRATEGY",
);
