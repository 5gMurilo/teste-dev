import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinoLogger } from "nestjs-pino";
import { HttpResponseError } from "../../../common/http-errors.js";
import { HttpFetcher } from "../../../common/http-fetcher.js";
import { CepNotFoundError } from "../../../common/provider-errors.js";
import { TelemetryEvents } from "../../../common/telemetry-events.js";
import type { CepAddress } from "../../cep.types.js";
import { CircuitBreaker } from "../../resilience/circuit-breaker.js";
import type { CepProvider } from "../cep.provider.js";

interface BrasilApiProviderResponse {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  ibge: Record<string, string>;
}

@Injectable()
export class BrasilApiProvider implements CepProvider {
  private readonly breaker: CircuitBreaker;

  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpFetcher,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.baseUrl = this.config.get<string>(
      "providers.BrasilApiProvider.baseUrl",
    )!;
    const provider = this.CEP_PROVIDER_KEY;
    this.breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 15000,
      halfOpenMaxCalls: 3,
      onTransition: (_from, to) => {
        if (to === "OPEN") {
          this.logger.warn(
            { event: TelemetryEvents.CIRCUIT_OPEN, provider },
            "Circuit breaker opened",
          );
        }
        if (to === "HALF_OPEN") {
          this.logger.warn(
            { event: TelemetryEvents.CIRCUIT_HALF_OPEN, provider },
            "Circuit breaker half-opened",
          );
        }
      },
      onReject: () => {
        this.logger.warn(
          { event: TelemetryEvents.CIRCUIT_OPEN, provider },
          "Circuit breaker rejected call",
        );
      },
    });
  }

  private readonly CEP_PROVIDER_KEY = "Brasil-API";

  async findByCep(cep: string): Promise<CepAddress> {
    return this.breaker.execute(
      async () => {
        try {
          const response = await this.http.get<BrasilApiProviderResponse>(
            `${this.baseUrl}${cep}`,
            {
              provider: this.CEP_PROVIDER_KEY,
              timeoutMs: this.config.get<number>(
                "providers.BrasilApiProvider.timeoutMs",
              ),
            },
          );

          return {
            cep: response.cep,
            street: response.street,
            neighborhood: response.neighborhood,
            city: response.city,
            state: response.state,
          };
        } catch (error) {
          throw this.mapError(error);
        }
      },
      (error) => !(error instanceof CepNotFoundError),
    );
  }

  getHealth() {
    return {
      breaker: this.breaker.getState(),
    };
  }

  private mapError(error: unknown) {
    if (error instanceof HttpResponseError && error.details.status === 404) {
      return new CepNotFoundError(
        this.CEP_PROVIDER_KEY,
        error.message,
        error.details.status,
      );
    }

    return error as Error;
  }
}
