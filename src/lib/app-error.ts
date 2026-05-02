import { TRPCError } from "@trpc/server";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";

export type AppErrorDetails = Record<string, unknown>;

export type AppError = {
  code: string;
  message: string;
  details?: AppErrorDetails;
  retryable?: boolean;
};

const retryableCodes = new Set([
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "TIMEOUT",
  "TOO_MANY_REQUESTS",
]);

const nonRetryableCodes = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "PRECONDITION_FAILED",
  "CONFLICT",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * Type guard to check if a value is a valid AppError object.
 * @param value - Unknown value to check
 * @returns Boolean indicating if value is an AppError with required code and message
 */
export const isAppError = (value: unknown): value is AppError => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === "string" && typeof value.message === "string";
};

/**
 * Converts an AppError to a TRPC error for use in server procedures.
 * @param error - The AppError object to convert
 * @returns TRPCError instance with error code and message
 */
export const createAppError = (error: AppError) => {
  return new TRPCError({
    code: error.code as TRPC_ERROR_CODE_KEY,
    message: error.message,
    cause: error,
  });
};

/**
 * Determines if an error code is retryable based on predefined lists.
 * Retryable errors are typically transient server issues, non-retryable are client errors.
 * @param code - Error code to check (e.g., 'INTERNAL_SERVER_ERROR', 'BAD_REQUEST')
 * @returns Boolean indicating if the error should be retried
 */
export const getRetryableState = (code: string) => {
  if (retryableCodes.has(code)) {
    return true;
  }

  if (nonRetryableCodes.has(code)) {
    return false;
  }

  return code !== "BAD_REQUEST";
};

/**
 * Normalizes various error formats into a consistent AppError object.
 * Extracts error information from AppError, TRPCError, or generic Error objects.
 * Automatically determines if the error is retryable based on error code.
 * @param error - Unknown error object from any source
 * @param fallbackMessage - Default message if error details cannot be extracted
 * @returns Normalized AppError with code, message, and retryable flag
 */
export const normalizeAppError = (
  error: unknown,
  fallbackMessage = "Something went wrong.",
): AppError => {
  if (isAppError(error)) {
    return {
      ...error,
      retryable: error.retryable ?? getRetryableState(error.code),
    };
  }

  if (isRecord(error) && isAppError(error.cause)) {
    return {
      ...error.cause,
      retryable: error.cause.retryable ?? getRetryableState(error.cause.code),
    };
  }

  if (
    isRecord(error) &&
    isRecord(error.data) &&
    isAppError(error.data.appError)
  ) {
    return {
      ...error.data.appError,
      retryable:
        error.data.appError.retryable ??
        getRetryableState(error.data.appError.code),
    };
  }

  const message =
    isRecord(error) && typeof error.message === "string"
      ? error.message
      : fallbackMessage;

  return {
    code: "INTERNAL_SERVER_ERROR",
    message,
    retryable: true,
  };
};
