import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import {
  DEV_LOGS_BUFFER,
  type DevLogsBuffer,
  type DevLogsPage,
} from "./dev-logs.buffer.js";

@SkipThrottle()
@ApiExcludeController()
@Controller("dev-logs")
export class DevLogsController {
  constructor(
    @Inject(DEV_LOGS_BUFFER) private readonly buffer: DevLogsBuffer,
  ) {}

  @Get()
  getLogs(@Query("since") since?: string): DevLogsPage {
    const parsed = Number.parseInt(since ?? "", 10);

    return this.buffer.query(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    );
  }
}
