import { ServerConfig } from "./config.js";

export interface UpstreamResult {
  status: number;
  body: unknown;
}

const TIMEOUT_BODY = {
  statusCode: 408,
  message: "Tempo de resposta esgotado ao consultar a API.",
};

const UNAVAILABLE_BODY = {
  statusCode: 503,
  message: "Serviço indisponível no momento.",
};

export async function callApi(
  config: ServerConfig,
  path: string,
): Promise<UpstreamResult> {
  let response: Response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(config.apiTimeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return timedOut
      ? { status: 408, body: TIMEOUT_BODY }
      : { status: 503, body: UNAVAILABLE_BODY };
  }

  const text = await response.text();
  if (text === "") {
    return { status: response.status, body: {} };
  }

  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    return {
      status: 502,
      body: { statusCode: 502, message: "Resposta inválida recebida da API." },
    };
  }
}
