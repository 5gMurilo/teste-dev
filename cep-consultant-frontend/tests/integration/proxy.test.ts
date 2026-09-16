import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiApp, createApp } from "../../server/app.js";
import { loadConfig } from "../../server/config.js";

const config = loadConfig({
  API_BASE_URL: "http://api.test/api/v1",
  API_TIMEOUT_MS: "50",
});

function stubFetch(handler: (url: string) => Response | Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  );
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const ADDRESS = {
  cep: "01001-000",
  street: "Praça da Sé",
  neighborhood: "Sé",
  city: "São Paulo",
  state: "SP",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/cep/:cep", () => {
  it("encaminha o CEP normalizado para a API e devolve o endereço", async () => {
    const spy = stubFetch(() => json(ADDRESS, 200));
    const app = createApiApp(config);

    const response = await app.request("/api/cep/01001-000");

    expect(spy.mock.calls[0]?.[0]).toBe("http://api.test/api/v1/cep/01001000");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(ADDRESS);
  });

  it("trata o CEP com e sem hífen como a mesma chamada upstream", async () => {
    const spy = stubFetch(() => json(ADDRESS, 200));
    const app = createApiApp(config);

    await app.request("/api/cep/01001000");
    await app.request("/api/cep/01001-000");

    expect(spy.mock.calls.map((call) => String(call[0]))).toEqual([
      "http://api.test/api/v1/cep/01001000",
      "http://api.test/api/v1/cep/01001000",
    ]);
  });

  it("rejeita CEP inválido sem chamar a API", async () => {
    const spy = stubFetch(() => json(ADDRESS, 200));
    const app = createApiApp(config);

    const response = await app.request("/api/cep/123");

    expect(response.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("repassa status e corpo de erro da API sem alterações", async () => {
    const body = {
      statusCode: 404,
      message: "CEP não encontrado",
      provider: "viacep",
    };
    stubFetch(() => json(body, 404));
    const app = createApiApp(config);

    const response = await app.request("/api/cep/99999999");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(body);
  });

  it("converte timeout do upstream em 408", async () => {
    stubFetch(() => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    });
    const app = createApiApp(config);

    const response = await app.request("/api/cep/01001000");

    expect(response.status).toBe(408);
  });

  it("converte falha de rede em 503", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });
    const app = createApiApp(config);

    const response = await app.request("/api/cep/01001000");

    expect(response.status).toBe(503);
  });
});

describe("GET /api/health", () => {
  it("encaminha para o health da API", async () => {
    const spy = stubFetch(() => json({ status: "ok" }, 200));
    const app = createApiApp(config);

    const response = await app.request("/api/health");

    expect(spy.mock.calls[0]?.[0]).toBe("http://api.test/api/v1/health");
    expect(response.status).toBe(200);
  });
});

describe("SSR shell", () => {
  it("injeta window.__APP_STATE__ e o markup renderizado no template", async () => {
    const app = createApp(config, {
      loadTemplate: async () =>
        '<html><head><!--app-head--></head><body><div id="root"><!--app-html--></div></body></html>',
      loadRenderer: async () => (state) => ({
        html: `<main>${state.devTools}</main>`,
        head: `<script>window.__APP_STATE__ = ${JSON.stringify(state)};</script>`,
      }),
    });

    const html = await (await app.request("/")).text();

    expect(html).toContain("window.__APP_STATE__");
    expect(html).toContain('"devTools":false');
    expect(html).toContain("<main>false</main>");
    expect(html).not.toContain("<!--app-html-->");
  });
});

describe("GET /api/dev-logs", () => {
  const gateOn = loadConfig({
    API_BASE_URL: "http://api.test/api/v1",
    DEV_TOOLS_ENABLED: "true",
    NODE_ENV: "development",
  });

  it("encaminha o since para a API quando o gate está ligado", async () => {
    const spy = stubFetch(() => json({ records: [], nextSeq: 7 }, 200));
    const app = createApiApp(gateOn);

    const response = await app.request("/api/dev-logs?since=7");

    expect(response.status).toBe(200);
    expect(spy.mock.calls[0]?.[0]).toBe(
      "http://api.test/api/v1/dev-logs?since=7",
    );
  });

  it("ignora um since não numérico em vez de repassá-lo", async () => {
    const spy = stubFetch(() => json({ records: [], nextSeq: 0 }, 200));
    const app = createApiApp(gateOn);

    await app.request("/api/dev-logs?since=../../admin");

    expect(spy.mock.calls[0]?.[0]).toBe(
      "http://api.test/api/v1/dev-logs?since=0",
    );
  });

  it("não registra a rota quando o gate está desligado", async () => {
    const app = createApiApp(config);

    expect(app.routes.some((route) => route.path.includes("dev-logs"))).toBe(
      false,
    );
    expect((await app.request("/api/dev-logs?since=0")).status).toBe(404);
  });

  it("mantém o gate fechado quando NODE_ENV é production", async () => {
    const app = createApiApp(
      loadConfig({
        API_BASE_URL: "http://api.test/api/v1",
        DEV_TOOLS_ENABLED: "true",
        NODE_ENV: "production",
      }),
    );

    expect(app.routes.some((route) => route.path.includes("dev-logs"))).toBe(
      false,
    );
  });
});

describe("createApp: catch-all de SSR", () => {
  const options = {
    loadTemplate: async () => "<html><!--app-head--><!--app-html--></html>",
    loadRenderer: async () => () => ({ html: "<div />", head: "" }),
  };

  it("devolve 404 JSON para /api/dev-logs com o gate desligado", async () => {
    const app = createApp(config, options);

    const response = await app.request("/api/dev-logs?since=0");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("ainda renderiza HTML para rotas fora de /api", async () => {
    const app = createApp(config, options);

    expect((await app.request("/")).status).toBe(200);
  });
});
