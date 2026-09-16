import type { ConfigService } from "@nestjs/config";
import { buildCepAddress } from "../../../test/support/fake-cep-address.js";
import { buildFakeLogger } from "../../../test/support/fake-logger.js";
import {
  HttpConnectionError,
  HttpResponseError,
  HttpTimeoutError,
} from "../../common/http-errors.js";
import {
  CepNotFoundError,
  CepProviderUnavailableError,
} from "../../common/provider-errors.js";
import { CircuitOpenError } from "../resilience/circuit-breaker.js";
import type { CepProvider } from "./cep.provider.js";
import { CepProviderChain } from "./cep-provider.chain.js";

function buildFakeProvider(): CepProvider {
  return { findByCep: vi.fn() } as unknown as CepProvider;
}

function buildChain(providers: CepProvider[]) {
  const logger = buildFakeLogger();
  const config = {
    get: vi.fn().mockReturnValue(10),
  } as unknown as ConfigService;
  const chain = new CepProviderChain(logger, providers, config);
  const strategy = { select: vi.fn((ps: CepProvider[]) => ps) };
  Object.assign(chain, { strategy });
  return { chain, logger, config, strategy };
}

describe("CepProviderChain", () => {
  it("should fallback to next provider on HttpTimeoutError", async () => {
    const providerA = buildFakeProvider();
    const providerB = buildFakeProvider();
    vi.mocked(providerA.findByCep).mockRejectedValueOnce(
      new HttpTimeoutError("timeout", { provider: "A", url: "http://a" }),
    );
    const address = buildCepAddress();
    vi.mocked(providerB.findByCep).mockResolvedValueOnce(address);

    const { chain } = buildChain([providerA, providerB]);

    const result = await chain.findByCep("01310100");

    expect(result).toEqual(address);
    expect(providerB.findByCep).toHaveBeenCalledWith("01310100");
  });

  it("should fallback to next provider on HttpResponseError >= 500", async () => {
    const providerA = buildFakeProvider();
    const providerB = buildFakeProvider();
    vi.mocked(providerA.findByCep).mockRejectedValueOnce(
      new HttpResponseError("server error", {
        provider: "A",
        url: "http://a",
        status: 500,
      }),
    );
    const address = buildCepAddress();
    vi.mocked(providerB.findByCep).mockResolvedValueOnce(address);

    const { chain } = buildChain([providerA, providerB]);

    const result = await chain.findByCep("01310100");

    expect(result).toEqual(address);
    expect(providerB.findByCep).toHaveBeenCalledWith("01310100");
  });

  it("should fallback to next provider on HttpConnectionError", async () => {
    const providerA = buildFakeProvider();
    const providerB = buildFakeProvider();
    vi.mocked(providerA.findByCep).mockRejectedValueOnce(
      new HttpConnectionError("connection reset", {
        provider: "A",
        url: "http://a",
      }),
    );
    const address = buildCepAddress();
    vi.mocked(providerB.findByCep).mockResolvedValueOnce(address);

    const { chain } = buildChain([providerA, providerB]);

    const result = await chain.findByCep("01310100");

    expect(result).toEqual(address);
    expect(providerB.findByCep).toHaveBeenCalledWith("01310100");
  });

  it("should not fallback and rethrow on CepNotFoundError", async () => {
    const providerA = buildFakeProvider();
    const providerB = buildFakeProvider();
    const notFoundError = new CepNotFoundError("A");
    vi.mocked(providerA.findByCep).mockRejectedValueOnce(notFoundError);

    const { chain } = buildChain([providerA, providerB]);

    await expect(chain.findByCep("01310100")).rejects.toBe(notFoundError);
    expect(providerB.findByCep).not.toHaveBeenCalled();
  });

  it("should throw CepProviderUnavailableError when all providers fail with fallback-eligible errors", async () => {
    const providerA = buildFakeProvider();
    const providerB = buildFakeProvider();
    vi.mocked(providerA.findByCep).mockRejectedValueOnce(
      new HttpConnectionError("connection reset", {
        provider: "A",
        url: "http://a",
      }),
    );
    vi.mocked(providerB.findByCep).mockRejectedValueOnce(
      new HttpConnectionError("connection reset", {
        provider: "B",
        url: "http://b",
      }),
    );

    const { chain } = buildChain([providerA, providerB]);

    await expect(chain.findByCep("01310100")).rejects.toBeInstanceOf(
      CepProviderUnavailableError,
    );
  });

  it("documents known bug: circuit OPEN on provider A does not trigger fallback to B", async () => {
    const providerA = buildFakeProvider();
    const providerB = buildFakeProvider();
    const circuitOpenError = new CircuitOpenError();
    vi.mocked(providerA.findByCep).mockRejectedValueOnce(circuitOpenError);
    vi.mocked(providerB.findByCep).mockResolvedValueOnce(buildCepAddress());

    const { chain } = buildChain([providerA, providerB]);

    await expect(chain.findByCep("01310100")).rejects.toBe(circuitOpenError);
    expect(providerB.findByCep).not.toHaveBeenCalled();
  });
});
