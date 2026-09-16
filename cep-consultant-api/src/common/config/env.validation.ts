import z from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(8000),

  BRASIL_API_PROVIDER_BASE_URL: z
    .url()
    .nonoptional({ error: "Brasil API provider base url is required" }),

  BRASIL_API_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),

  VIA_CEP_PROVIDER_BASE_URL: z
    .url()
    .nonoptional({ error: "Via Cep provider base url is required" }),

  VIA_CEP_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),

  REDIS_URL: z.url().nonempty({ error: "Redis URL is required" }),
  REDIS_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  REDIS_GRACE_SECONDS: z.coerce.number().int().positive().default(86400),
  REDIS_LOCK_TTL_MS: z.coerce.number().int().positive().default(4000),

  CONCURRENCY_LIMIT: z.coerce.number().int().positive().default(10),

  RATE_LIMIT_TTL_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  DEV_TOOLS_ENABLED: z.enum(["true", "false"]).default("false"),
  DEV_LOGS_BUFFER_SIZE: z.coerce.number().int().positive().default(500),
});
