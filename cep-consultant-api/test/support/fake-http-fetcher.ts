import { vi } from "vitest";
import type { HttpFetcher } from "../../src/common/http-fetcher.js";

export function buildFakeHttpFetcher(): HttpFetcher {
  return {
    get: vi.fn(),
  } as unknown as HttpFetcher;
}
