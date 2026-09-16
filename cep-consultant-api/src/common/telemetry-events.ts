export const TelemetryEvents = {
  CACHE_HIT: "cache_hit",
  CACHE_MISS: "cache_miss",
  PROVIDER_SELECTED: "provider_selected",
  PROVIDER_SUCCESS: "provider_success",
  PROVIDER_TIMEOUT: "provider_timeout",
  PROVIDER_FAILED: "provider_failed",
  PROVIDER_FALLBACK: "provider_fallback",
  CIRCUIT_OPEN: "circuit_open",
  CIRCUIT_HALF_OPEN: "circuit_half_open",
  CONCURRENCY_LIMIT_REACHED: "concurrency_limit_reached",
} as const;
