import type { IncomingMessage } from "node:http";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule, type Params } from "nestjs-pino";
import pino from "pino";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { CepModule } from "./cep/cep.module.js";
import config from "./common/config/config.js";
import { envSchema } from "./common/config/env.validation.js";
import { getDevLogsBuffer } from "./dev-logs/dev-logs.buffer.js";
import { DevLogsModule } from "./dev-logs/dev-logs.module.js";
import { HealthModule } from "./health/health.module.js";

const devToolsEnabled =
  process.env.DEV_TOOLS_ENABLED === "true" &&
  process.env.NODE_ENV !== "production";

const redact = {
  paths: ["req.headers.authorization", "req.headers.cookie", "url"],
  remove: true,
};

function buildPinoHttpOptions(): Params["pinoHttp"] {
  if (!devToolsEnabled) {
    return {
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
      redact,
    };
  }

  const prettyStream = pino.transport({
    target: "pino-pretty",
    options: { colorize: true },
  });

  return {
    level: "debug",
    stream: pino.multistream(
      [
        { stream: prettyStream, level: "debug" },
        { stream: getDevLogsBuffer().asWritable(), level: "debug" },
      ],
      { dedupe: false },
    ),
    redact,
    autoLogging: {
      ignore: (req: IncomingMessage) =>
        /(^|\/)dev-logs(\/|\?|$)/.test(req.url ?? ""),
    },
  };
}

@Module({
  imports: [
    CepModule,
    HealthModule,
    ...(devToolsEnabled ? [DevLogsModule] : []),
    LoggerModule.forRoot({
      pinoHttp: buildPinoHttpOptions(),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validate: (config) => {
        const result = envSchema.safeParse(config);

        if (!result.success) {
          throw new Error(result.error.message);
        }

        return result.data;
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>("rateLimit.ttlMs") ?? 60000,
            limit: config.get<number>("rateLimit.maxRequests") ?? 100,
          },
        ],
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
