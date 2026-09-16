import type { CepAddress } from "../../src/cep/cep.types.js";

export function buildCepAddress(
  overrides: Partial<CepAddress> = {},
): CepAddress {
  return {
    cep: "01310100",
    street: "Avenida Paulista",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    ...overrides,
  };
}
