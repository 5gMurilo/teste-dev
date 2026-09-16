import type { INestApplication } from "@nestjs/common";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { Redis } from "ioredis";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, inject, it, vi } from "vitest";
import type { CepService } from "../../src/cep/cep.service.js";
import type { DevLogsPage } from "../../src/dev-logs/dev-logs.buffer.js";
import { buildCepAddress } from "../support/fake-cep-address.js";

const CEP = "01310100";

interface BootedApp {
  app: INestApplication;
  cepService: CepService;
}

async function bootApp(
  env: Record<string, string | undefined>,
): Promise<BootedApp> {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  vi.resetModules();
  const { AppModule } = await import("../../src/app.module.js");
  const { CepService: CepServiceToken } = await import(
    "../../src/cep/cep.service.js"
  );
  const { CepProviderChain } = await import(
    "../../src/cep/providers/cep-provider.chain.js"
  );
  const { REDIS_CLIENT } = await import(
    "../../src/cep/cache/redis-client.provider.js"
  );

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CepProviderChain)
    .useValue({
      findByCep: async (cep: string) => buildCepAddress({ cep }),
      getFallbackStats: () => ({}),
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
    prefix: "api/v",
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  const redisClient = app.get<Redis>(REDIS_CLIENT, { strict: false });
  await vi.waitFor(() => redisClient.ping(), { timeout: 10000 });

  return { app, cepService: app.get(CepServiceToken, { strict: false }) };
}

function baseEnv(): Record<string, string> {
  return {
    NODE_ENV: "development",
    REDIS_URL: inject("redisUrl"),
    BRASIL_API_PROVIDER_BASE_URL: "https://brasilapi.com.br",
    VIA_CEP_PROVIDER_BASE_URL: "https://viacep.com.br",
  };
}

describe("dev-logs (integration)", () => {
  describe("with the gate enabled", () => {
    let app: INestApplication;
    let cepService: CepService;
    let redis: Redis;

    beforeAll(async () => {
      redis = new Redis(inject("redisUrl"));
      await redis.flushall();
      ({ app, cepService } = await bootApp({
        ...baseEnv(),
        DEV_TOOLS_ENABLED: "true",
      }));
    });

    afterAll(async () => {
      await app.close();
      await redis.quit();
    });

    it("records cache_miss then cache_hit for two successive CEP lookups", async () => {
      await cepService.findByCep(CEP);
      await cepService.findByCep(CEP);

      const response = await request(app.getHttpServer())
        .get("/api/v1/dev-logs")
        .expect(200);
      const page = response.body as DevLogsPage;

      const events = page.records
        .filter(
          (record) =>
            record.event === "cache_miss" || record.event === "cache_hit",
        )
        .map((record) => ({ event: record.event, cep: record.cep }));

      expect(events).toEqual([
        { event: "cache_miss", cep: CEP },
        { event: "cache_hit", cep: CEP },
      ]);
    });

    it("surfaces the dev-tools settings through ConfigService", () => {
      const configService = app.get(ConfigService);

      expect(configService.get<boolean>("devTools.enabled")).toBe(true);
      expect(configService.get<number>("devTools.bufferSize")).toBe(500);
    });

    it("exposes the request method and path of completed requests", async () => {
      await request(app.getHttpServer()).get("/api/v1/health").expect(200);

      const response = await request(app.getHttpServer())
        .get("/api/v1/dev-logs")
        .expect(200);
      const page = response.body as DevLogsPage;

      const requestRecords = page.records.filter(
        (record) => (record.req as { url?: string } | undefined)?.url,
      );

      expect(requestRecords.at(-1)?.req).toMatchObject({
        method: "GET",
        url: "/api/v1/health",
      });
    });

    it("does not log its own polls, so a repeated poll returns no records", async () => {
      const first = await request(app.getHttpServer())
        .get("/api/v1/dev-logs")
        .expect(200);
      const firstPage = first.body as DevLogsPage;

      const second = await request(app.getHttpServer())
        .get(`/api/v1/dev-logs?since=${firstPage.nextSeq}`)
        .expect(200);
      const secondPage = second.body as DevLogsPage;

      const third = await request(app.getHttpServer())
        .get(`/api/v1/dev-logs?since=${secondPage.nextSeq}`)
        .expect(200);
      const thirdPage = third.body as DevLogsPage;

      expect(secondPage.records).toHaveLength(0);
      expect(thirdPage.records).toHaveLength(0);
      expect(thirdPage.nextSeq).toBe(firstPage.nextSeq);
    });
  });

  describe("with the gate disabled", () => {
    let app: INestApplication;

    afterAll(async () => {
      await app?.close();
    });

    it("returns 404 when DEV_TOOLS_ENABLED is absent", async () => {
      ({ app } = await bootApp({
        ...baseEnv(),
        DEV_TOOLS_ENABLED: undefined,
      }));

      await request(app.getHttpServer()).get("/api/v1/dev-logs").expect(404);
    });
  });
});
