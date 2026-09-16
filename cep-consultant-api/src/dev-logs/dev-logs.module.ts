import { Module } from "@nestjs/common";
import { DEV_LOGS_BUFFER, getDevLogsBuffer } from "./dev-logs.buffer.js";
import { DevLogsController } from "./dev-logs.controller.js";

@Module({
  controllers: [DevLogsController],
  providers: [
    {
      provide: DEV_LOGS_BUFFER,
      useFactory: getDevLogsBuffer,
    },
  ],
})
export class DevLogsModule {}
