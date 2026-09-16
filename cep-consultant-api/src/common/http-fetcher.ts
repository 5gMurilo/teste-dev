import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import {
  HttpConnectionError,
  HttpResponseError,
  HttpTimeoutError,
} from "./http-errors.js";
import { TelemetryEvents } from "./telemetry-events.js";
import { redactUrl } from "./url-redact.js";

interface HttpFetcherOptions {
  provider: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

@Injectable()
export class HttpFetcher {
  constructor(private readonly logger: PinoLogger) {}

  async get<T>(url: string, options: HttpFetcherOptions): Promise<T> {
    const { provider, timeoutMs, headers } = options;
    const { host } = redactUrl(url);

    const startedAt = performance.now();

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(timeoutMs ?? 2000),
      });

      const durationMs = Math.round(performance.now() - startedAt);

      if (!response.ok) {
        this.logger.warn(
          {
            provider,
            host,
            status: response.status,
            duration: durationMs,
          },
          "External provider returned an Error",
        );

        throw new HttpResponseError(
          `Provider ${provider} returned HTTP status ${response.status}`,
          {
            provider,
            url,
            status: response.status,
          },
        );
      }

      this.logger.debug(
        {
          event: TelemetryEvents.PROVIDER_SUCCESS,
          provider,
          host,
          status: response.status,
          duration: durationMs,
        },
        "External provider request succeeded",
      );

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HttpResponseError) {
        throw error;
      }

      const durationMs = Math.round(performance.now() - startedAt);

      if (this.isTimeout(error)) {
        this.logger.warn(
          {
            event: TelemetryEvents.PROVIDER_TIMEOUT,
            provider,
            host,
            timeoutMs,
            durationMs,
          },
          "External provider request timeout",
        );

        throw new HttpTimeoutError(`Provider ${provider} timed out`, {
          provider,
          url,
        });
      }

      this.logger.error(
        {
          event: TelemetryEvents.PROVIDER_FAILED,
          provider,
          host,
          durationMs,
          err: error instanceof Error ? error.message : "Unknown",
        },
        "External provider request failed",
      );

      throw new HttpConnectionError(
        `Failed to connect to provider ${provider}`,
        {
          provider,
          url,
          cause: error,
        },
      );
    }
  }

  private isTimeout(error: unknown): boolean {
    return error instanceof DOMException && error.name === "TimeoutError";
  }
}
