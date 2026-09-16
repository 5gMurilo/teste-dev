import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { DomainExceptionFilter } from "./common/filters/http-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new DomainExceptionFilter());

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

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    methods: "GET,HEAD",
  });
  app.use(helmet());

  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle("CEP Consultant API")
      .setDescription("Resolves Brazilian postal codes (CEP) into address data")
      .setVersion("1.0")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document);
  }

  const port = process.env.PORT ?? 8000;
  await app.listen(port);

  if (isDevelopment) {
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger UI available at: http://localhost:${port}/api`);
  }
}
await bootstrap();
