type ErrorOptions = {
  status?: number;
  code?: string;
  detail?: unknown;
  cause?: unknown;
};

export class MFApiError extends Error {
  status?: number;
  code?: string;
  detail?: unknown;
  retriable = false;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = 'MFApiError';
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class MFAuthError extends MFApiError {
  constructor(message = 'MF authentication failed', options: ErrorOptions = {}) {
    super(message, { code: 'MF_AUTH_ERROR', ...options });
    this.name = 'MFAuthError';
  }
}

export class MFRateLimitError extends MFApiError {
  retryAfterSec?: number;

  constructor(
    message = 'MF rate limit exceeded',
    options: ErrorOptions & { retryAfterSec?: number } = {},
  ) {
    super(message, { code: 'MF_RATE_LIMIT', status: 429, ...options });
    this.name = 'MFRateLimitError';
    this.retryAfterSec = options.retryAfterSec;
    this.retriable = true;
  }
}

export class MFServerError extends MFApiError {
  constructor(message = 'MF server error', options: ErrorOptions = {}) {
    super(message, { code: 'MF_SERVER_ERROR', ...options });
    this.name = 'MFServerError';
    this.retriable = true;
  }
}

export class MFNetworkError extends MFApiError {
  constructor(message = 'MF network error', options: ErrorOptions = {}) {
    super(message, { code: 'MF_NETWORK_ERROR', ...options });
    this.name = 'MFNetworkError';
    this.retriable = true;
  }
}

export function serializeError(error: unknown): {
  name: string;
  message: string;
  status?: number;
  code?: string;
} {
  if (error instanceof MFApiError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}
