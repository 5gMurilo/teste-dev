export interface ServerConfig {
  nodeEnv: string;
  isProduction: boolean;
  servePrebuilt: boolean;
  port: number;
  host: string;
  apiBaseUrl: string;
  apiTimeoutMs: number;
  devToolsEnabled: boolean;
  devLogsClientLimit: number;
}

function readInt(
  name: string,
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Variável de ambiente ${name} deve ser um inteiro positivo, recebido: "${raw}"`,
    );
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const apiBaseUrl = (
    env.API_BASE_URL ?? "http://localhost:8000/api/v1"
  ).replace(/\/+$/, "");

  try {
    new URL(apiBaseUrl);
  } catch {
    throw new Error(`API_BASE_URL inválida: "${apiBaseUrl}"`);
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    servePrebuilt: env.SSR_MODE === "prebuilt" || nodeEnv === "production",
    port: readInt("PORT", env.PORT, 3000),
    host: env.HOST ?? "0.0.0.0",
    apiBaseUrl,
    apiTimeoutMs: readInt("API_TIMEOUT_MS", env.API_TIMEOUT_MS, 5000),
    devToolsEnabled:
      env.DEV_TOOLS_ENABLED === "true" && nodeEnv !== "production",
    devLogsClientLimit: readInt(
      "DEV_LOGS_CLIENT_LIMIT",
      env.DEV_LOGS_CLIENT_LIMIT,
      500,
    ),
  };
}
