import { normalizeCep } from "./cep.js";
import { messageForStatus, UNEXPECTED_ERROR_MESSAGE } from "./errors.js";
import { CepAddress } from "./types.js";

export class CepLookupError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CepLookupError";
    this.status = status;
  }
}

/** Sempre um path relativo: o browser nunca conhece o endereço da API. */
export async function lookupCep(
  value: string,
  signal?: AbortSignal,
): Promise<CepAddress> {
  const cep = normalizeCep(value);

  let response: Response;
  try {
    response = await fetch(`/api/cep/${cep}`, {
      headers: { accept: "application/json" },
      signal,
    });
  } catch {
    throw new CepLookupError(503, messageForStatus(503));
  }

  if (!response.ok) {
    throw new CepLookupError(
      response.status,
      messageForStatus(response.status),
    );
  }

  try {
    return (await response.json()) as CepAddress;
  } catch {
    throw new CepLookupError(response.status, UNEXPECTED_ERROR_MESSAGE);
  }
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/health", {
      headers: { accept: "application/json" },
      signal,
    });
    return response.ok;
  } catch {
    return false;
  }
}
