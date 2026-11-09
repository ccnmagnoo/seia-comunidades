export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DATA_ERROR'
  | 'SEIA_ERROR'
  | 'SEIA_CHALLENGE'
  | 'NETWORK_ERROR'
  | 'IO_ERROR'
  | 'CONFLICT'
  | 'UNKNOWN';

export interface SerializedError {
  code: AppErrorCode;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super('NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

export class SeiaError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SEIA_ERROR', message, details);
    this.name = 'SeiaError';
  }
}

export class SeiaChallengeError extends AppError {
  constructor(message: string, details?: unknown) {
    super('SEIA_CHALLENGE', message, details);
    this.name = 'SeiaChallengeError';
  }
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details };
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: String(error) };
}
