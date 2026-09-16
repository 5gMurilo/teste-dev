export class HttpTimeoutError extends Error {
  constructor(
    message: string,
    public readonly details: {
      provider: string;
      url: string;
    },
  ) {
    super(message);
    this.name = "HttpTimeoutError";
  }
}

export class HttpConnectionError extends Error {
  constructor(
    message: string,
    public readonly details: {
      provider: string;
      url: string;
      code?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "HttpConnectionError";
  }
}

export class HttpResponseError extends Error {
  constructor(
    message: string,
    public readonly details: {
      provider: string;
      url: string;
      status: number;
      body?: unknown;
    },
  ) {
    super(message);
    this.name = "HttpResponseError";
  }
}
