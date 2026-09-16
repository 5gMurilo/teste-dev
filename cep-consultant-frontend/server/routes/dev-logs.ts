import { Hono } from "hono";
import { callApi } from "../api-client.js";
import { ServerConfig } from "../config.js";

export function createDevLogsRoutes(config: ServerConfig): Hono {
  const app = new Hono();

  app.get("/dev-logs", async (c) => {
    const raw = c.req.query("since") ?? "0";
    const since = /^\d+$/.test(raw) ? raw : "0";
    const result = await callApi(config, `/dev-logs?since=${since}`);
    return c.json(result.body as Record<string, unknown>, result.status as 200);
  });

  return app;
}
