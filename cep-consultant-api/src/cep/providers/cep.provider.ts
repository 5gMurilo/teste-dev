import type { CepAddress } from "../cep.types.js";

export interface CepProvider {
  findByCep(cep: string): Promise<CepAddress>;
}

export const CEP_PROVIDER = Symbol("CEP_PROVIDER");
export const CEP_PROVIDERS = Symbol("CEP_PROVIDERS");
