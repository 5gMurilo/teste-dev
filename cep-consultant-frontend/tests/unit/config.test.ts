import { describe, expect, it } from "vitest";
import { loadConfig } from "../../server/config.js";

describe("loadConfig", () => {
  it("aplica os defaults documentados em .env.example", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      nodeEnv: "development",
      port: 3000,
      host: "0.0.0.0",
      apiBaseUrl: "http://localhost:8000/api/v1",
      apiTimeoutMs: 5000,
      devToolsEnabled: false,
      devLogsClientLimit: 500,
    });
  });

  it("remove barras finais da API_BASE_URL", () => {
    expect(
      loadConfig({ API_BASE_URL: "http://api:8000/api/v1//" }).apiBaseUrl,
    ).toBe("http://api:8000/api/v1");
  });

  it.each([
    [{}, false],
    [{ DEV_TOOLS_ENABLED: "false" }, false],
    [{ DEV_TOOLS_ENABLED: "TRUE" }, false],
    [{ DEV_TOOLS_ENABLED: "1" }, false],
    [{ DEV_TOOLS_ENABLED: "true" }, true],
    [{ DEV_TOOLS_ENABLED: "true", NODE_ENV: "production" }, false],
    [{ DEV_TOOLS_ENABLED: "true", NODE_ENV: "development" }, true],
    [{ NODE_ENV: "development" }, false],
  ])("gate %o resolve para %s", (env, expected) => {
    expect(loadConfig(env).devToolsEnabled).toBe(expected);
  });

  it("rejeita portas inválidas", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
  });

  it("rejeita API_BASE_URL inválida", () => {
    expect(() => loadConfig({ API_BASE_URL: "nao-e-url" })).toThrow(
      /API_BASE_URL/,
    );
  });
});
