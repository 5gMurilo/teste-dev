export default () => ({
  app: {
    port: Number(process.env.PORT ?? 8000),
    nodeEnv: process.env.NODE_ENV ?? "development",
  },
  providers: {
    ViaCepProvider: {
      baseUrl: process.env.VIA_CEP_PROVIDER_BASE_URL,
      timeoutMs: 2000,
    },
    BrasilApiProvider: {
      baseUrl: process.env.BRASIL_API_PROVIDER_BASE_URL,
      timeoutMs: 2000,
    },
  },
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    ttlSeconds: Number(process.env.REDIS_TTL_SECONDS ?? 60 * 60 * 24 * 7),
    graceSeconds: Number(process.env.REDIS_GRACE_SECONDS ?? 60 * 60 * 24),
    lockTtlMs: Number(process.env.REDIS_LOCK_TTL_MS ?? 4000),
  },
  concurrency: {
    limit: Number(process.env.CONCURRENCY_LIMIT ?? 10),
  },
  rateLimit: {
    ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60000),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
  },
  devTools: {
    enabled:
      process.env.DEV_TOOLS_ENABLED === "true" &&
      process.env.NODE_ENV !== "production",
    bufferSize: Number(process.env.DEV_LOGS_BUFFER_SIZE ?? 500),
  },
});
