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

export const isAppError = (value: unknown): value is AppError => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === "string" && typeof value.message === "string";
};

export const createAppError = (error: AppError) => {
  return new TRPCError({
    code: error.code as TRPC_ERROR_CODE_KEY,
    message: error.message,
    cause: error,
  });
};

export const getRetryableState = (code: string) => {
  if (retryableCodes.has(code)) {
    return true;
  }

  if (nonRetryableCodes.has(code)) {
    return false;
  }

  return code !== "BAD_REQUEST";
};

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
