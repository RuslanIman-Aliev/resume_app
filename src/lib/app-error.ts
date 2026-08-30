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

/**
 * The codes an `AppError` is allowed to carry - the tRPC code table, which is
 * also the vocabulary `createAppError` accepts.
 *
 * The list exists so `isAppError` can tell an error this app authored from a
 * foreign object that merely happens to have `code` and `message`. Prisma is
 * the case that motivated it: `PrismaClientKnownRequestError` carries
 * `code: "P2025"` and a message, so a shape check alone accepted it as an
 * `AppError` and passed the raw driver message (table and column names
 * included) straight to the client.
 */
const appErrorCodes = new Set<string>([
  "PARSE_ERROR",
  "BAD_REQUEST",
  "INTERNAL_SERVER_ERROR",
  "NOT_IMPLEMENTED",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "UNAUTHORIZED",
  "PAYMENT_REQUIRED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_CONTENT",
  "PRECONDITION_REQUIRED",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
]);

/**
 * The message a client gets for a failure nobody wrote a message for.
 *
 * Anything an unexpected throw carries - a driver message, a stack, an
 * internal URL - stops at the server; the real error is logged there instead.
 */
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * Type guard to check if a value is a valid AppError object.
 *
 * Deliberately narrow: an `AppError` is a plain object this app built, whose
 * code comes from the tRPC table. Throwables are rejected outright - every
 * `AppError` in the codebase is created as a literal or attached as the
 * `cause` of a `TRPCError`, never thrown as an `Error` itself - which keeps
 * foreign errors (Prisma, OpenAI, `fetch`) from being mistaken for one and
 * having their internals forwarded to the client.
 * @param value - Unknown value to check
 * @returns Boolean indicating if value is an AppError this app authored
 */
export const isAppError = (value: unknown): value is AppError => {
  if (!isRecord(value) || value instanceof Error) {
    return false;
  }

  return (
    typeof value.code === "string" &&
    appErrorCodes.has(value.code) &&
    typeof value.message === "string"
  );
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

/**
 * Builds the `AppError` the server is willing to put on the wire.
 *
 * Only two kinds of message reach the client: one this app wrote for a
 * `TRPCError` it threw on purpose, and the generic fallback. An unexpected
 * throw - a Prisma constraint violation, a failed `fetch`, a parser blowing up
 * - is reduced to `INTERNAL_SERVER_ERROR` with `GENERIC_ERROR_MESSAGE`, since
 * its message is written for whoever reads the server logs, not for the person
 * looking at a toast.
 * @param error - The error tRPC caught, usually a `TRPCError`
 * @param fallbackMessage - Message used when the error carries none of its own
 * @returns An AppError safe to serialize into the response
 */
export const toPublicAppError = (
  error: unknown,
  fallbackMessage = GENERIC_ERROR_MESSAGE,
): AppError => {
  // Thrown through `createAppError`, so the message was written for the user.
  if (isRecord(error) && isAppError(error.cause)) {
    return {
      code: error.cause.code,
      message: error.cause.message,
      details: error.cause.details,
      retryable: error.cause.retryable ?? getRetryableState(error.cause.code),
    };
  }

  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable ?? getRetryableState(error.code),
    };
  }

  const code =
    isRecord(error) &&
    typeof error.code === "string" &&
    appErrorCodes.has(error.code)
      ? error.code
      : "INTERNAL_SERVER_ERROR";

  // A `TRPCError` built from another error keeps that error's message, so an
  // internal failure is only allowed to speak for itself when nothing was
  // wrapped - that is, when the code path threw the 500 deliberately.
  const wrapsForeignError =
    code === "INTERNAL_SERVER_ERROR" &&
    isRecord(error) &&
    error.cause !== undefined &&
    error.cause !== null;

  const message =
    !wrapsForeignError &&
    isRecord(error) &&
    typeof error.message === "string" &&
    error.message.length > 0
      ? error.message
      : fallbackMessage;

  return {
    code,
    message,
    retryable: getRetryableState(code),
  };
};
