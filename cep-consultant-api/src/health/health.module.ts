import { Module } from "@nestjs/common";
import { CepModule } from "../cep/cep.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

@Module({
  imports: [CepModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
