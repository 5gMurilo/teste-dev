import { buildFakeLogger } from "../../test/support/fake-logger.js";
import {
  HttpConnectionError,
  HttpResponseError,
  HttpTimeoutError,
} from "./http-errors.js";
import { HttpFetcher } from "./http-fetcher.js";

describe("HttpFetcher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws HttpTimeoutError when fetch rejects with a TimeoutError DOMException", async () => {
    const logger = buildFakeLogger();
    const fetcher = new HttpFetcher(logger);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("", "TimeoutError")),
    );

    await expect(
      fetcher.get("https://example.com", { provider: "test" }),
    ).rejects.toThrow(HttpTimeoutError);
  });

  it("throws HttpConnectionError when fetch rejects with a generic network error", async () => {
    const logger = buildFakeLogger();
    const fetcher = new HttpFetcher(logger);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(
      fetcher.get("https://example.com", { provider: "test" }),
    ).rejects.toThrow(HttpConnectionError);
  });

  it("throws HttpResponseError with status 404 on HTTP 4xx responses", async () => {
    const logger = buildFakeLogger();
    const fetcher = new HttpFetcher(logger);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    await expect(
      fetcher.get("https://example.com", { provider: "test" }),
    ).rejects.toMatchObject({
      constructor: HttpResponseError,
      details: { status: 404 },
    });
  });

  it("throws HttpResponseError with status 500 on HTTP 5xx responses", async () => {
    const logger = buildFakeLogger();
    const fetcher = new HttpFetcher(logger);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(
      fetcher.get("https://example.com", { provider: "test" }),
    ).rejects.toMatchObject({
      constructor: HttpResponseError,
      details: { status: 500 },
    });
  });

  it("throws HttpConnectionError when the response body is malformed JSON", async () => {
    const logger = buildFakeLogger();
    const fetcher = new HttpFetcher(logger);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
      }),
    );

    await expect(
      fetcher.get("https://example.com", { provider: "test" }),
    ).rejects.toThrow(HttpConnectionError);
  });
});
