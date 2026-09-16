import { Hono } from "hono";
import { callApi } from "../api-client.js";
import { ServerConfig } from "../config.js";

export function createCepRoutes(config: ServerConfig): Hono {
  const app = new Hono();

  app.get("/cep/:cep", async (c) => {
    const raw = c.req.param("cep");
    const normalized = raw.replace(/\D/g, "");

    if (!/^\d{8}$/.test(normalized)) {
      return c.json(
        { statusCode: 400, message: "CEP em formato inválido." },
        400,
      );
    }

    const result = await callApi(config, `/cep/${normalized}`);
    return c.json(result.body as Record<string, unknown>, result.status as 200);
  });

  return app;
}
