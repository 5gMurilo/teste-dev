import type { ConfigService } from "@nestjs/config";
import { buildFakeHttpFetcher } from "../../../../test/support/fake-http-fetcher.js";
import { buildFakeLogger } from "../../../../test/support/fake-logger.js";
import { HttpResponseError } from "../../../common/http-errors.js";
import { CepNotFoundError } from "../../../common/provider-errors.js";
import { BrasilApiProvider } from "./brasilapi.provider.js";

function buildProvider() {
  const http = buildFakeHttpFetcher();
  const config = {
    get: vi.fn((key: string) =>
      key === "providers.BrasilApiProvider.baseUrl"
        ? "https://brasilapi.com.br/api/cep/v1/"
        : 2000,
    ),
  } as unknown as ConfigService;
  const logger = buildFakeLogger();
  const provider = new BrasilApiProvider(http, config, logger);
  return { provider, http, config, logger };
}

describe("BrasilApiProvider", () => {
  it("should map the raw BrasilAPI response fields to CepAddress", async () => {
    const { provider, http } = buildProvider();
    vi.mocked(http.get).mockResolvedValueOnce({
      cep: "01310100",
      street: "Avenida Paulista",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
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

  it("should throw CepNotFoundError when http.get rejects with HttpResponseError status 404", async () => {
    const { provider, http } = buildProvider();
    vi.mocked(http.get).mockRejectedValueOnce(
      new HttpResponseError("not found", {
        provider: "Brasil-API",
        url: "https://brasilapi.com.br/api/cep/v1/00000000",
        status: 404,
      }),
    );

    await expect(provider.findByCep("00000000")).rejects.toBeInstanceOf(
      CepNotFoundError,
    );
  });

  it("should reject immediately without calling http.get when breaker is OPEN (after failureThreshold failures)", async () => {
    const { provider, http } = buildProvider();
    const eligibleError = new HttpResponseError("server error", {
      provider: "Brasil-API",
      url: "https://brasilapi.com.br/api/cep/v1/01310100",
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
