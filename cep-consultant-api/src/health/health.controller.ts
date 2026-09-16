import { Controller, Get } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import { ErrorResponseDto } from "../common/dto/error-response.dto.js";
import { HealthResponseDto } from "./dto/health-response.dto.js";
import { HealthService } from "./health.service.js";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({
    description: "Service health status",
    type: HealthResponseDto,
  })
  @ApiTooManyRequestsResponse({
    description: "Rate limit exceeded",
    type: ErrorResponseDto,
  })
  async getHealth() {
    return this.healthService.getHealth();
  }
}
