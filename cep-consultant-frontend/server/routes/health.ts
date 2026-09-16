import { Hono } from "hono";
import { callApi } from "../api-client.js";
import { ServerConfig } from "../config.js";

export function createHealthRoutes(config: ServerConfig): Hono {
  const app = new Hono();

  app.get("/health", async (c) => {
    const result = await callApi(config, "/health");
    return c.json(result.body as Record<string, unknown>, result.status as 200);
  });

  return app;
}
