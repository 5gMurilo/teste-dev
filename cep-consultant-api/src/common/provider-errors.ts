export class CepNotFoundError extends Error {
  constructor(
    public readonly provider: string,
    public readonly originalMessage?: string,
    public readonly originalStatus?: number,
  ) {
    super(
      originalMessage
        ? `[${provider}] CEP not found: ${originalMessage}`
        : `[${provider}] CEP not found`,
    );
    this.name = "CepNotFoundError";
  }
}

export class CepProviderUnavailableError extends Error {
  constructor() {
    super("All CEP providers are unavailable.");
    this.name = "CepProviderUnavailableError";
  }
}
