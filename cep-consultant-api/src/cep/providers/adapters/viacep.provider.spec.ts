import type { ConfigService } from "@nestjs/config";
import { buildFakeHttpFetcher } from "../../../../test/support/fake-http-fetcher.js";
import { buildFakeLogger } from "../../../../test/support/fake-logger.js";
import { HttpResponseError } from "../../../common/http-errors.js";
import { CepNotFoundError } from "../../../common/provider-errors.js";
import { ViaCepProvider } from "./viacep.provider.js";

function buildProvider() {
  const http = buildFakeHttpFetcher();
  const config = {
    get: vi.fn((key: string) =>
      key === "providers.ViaCepProvider.baseUrl"
        ? "https://viacep.com.br/ws/"
        : 2000,
    ),
  } as unknown as ConfigService;
  const logger = buildFakeLogger();
  const provider = new ViaCepProvider(http, config, logger);
  return { provider, http, config, logger };
}

describe("ViaCepProvider", () => {
  it("should map the raw ViaCEP response fields to CepAddress", async () => {
    const { provider, http } = buildProvider();
    vi.mocked(http.get).mockResolvedValueOnce({
      cep: "01310100",
      logradouro: "Avenida Paulista",
      bairro: "Bela Vista",
      cidade: "São Paulo",
      estado: "SP",
    });

    const result = await provider.findByCep("01310100");

    expect(result).toEqual({
      cep: "01310100",
      street: "Avenida Paulista",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    });
  });

  it("should throw CepNotFoundError when response has erro: true", async () => {
    const { provider, http } = buildProvider();
    vi.mocked(http.get).mockResolvedValueOnce({
      cep: "",
      logradouro: "",
      bairro: "",
      cidade: "",
      estado: "",
      erro: true,
    });

    await expect(provider.findByCep("00000000")).rejects.toBeInstanceOf(
      CepNotFoundError,
    );
  });

  it("should reject immediately without calling http.get when breaker is OPEN (after failureThreshold failures)", async () => {
    const { provider, http } = buildProvider();
    const eligibleError = new HttpResponseError("server error", {
      provider: "Via-CEP",
      url: "https://viacep.com.br/ws/01310100/json",
      status: 500,
    });
    vi.mocked(http.get).mockRejectedValue(eligibleError);

    for (let i = 0; i < 5; i++) {
      await expect(provider.findByCep("01310100")).rejects.toBe(eligibleError);
    }

    expect(http.get).toHaveBeenCalledTimes(5);

    await expect(provider.findByCep("01310100")).rejects.toThrow(
      "Circuit breaker is OPEN",
    );

    expect(http.get).toHaveBeenCalledTimes(5);
  });
});
