import { normalizeAppError } from "./app-error";

type ToastContext = {
  fallbackMessage?: string;
  fallbackTitle?: string;
};

/**
 * Extracts a normalized error message from an unknown error object.
 * @param error - The error object (can be any type)
 * @param fallbackMessage - Default message if error cannot be parsed (default: "Something went wrong.")
 * @returns Normalized error message string
 */
export const getErrorMessage = (
  error: unknown,
  fallbackMessage = "Something went wrong.",
) => {
  return normalizeAppError(error, fallbackMessage).message;
};

/**
 * Converts an error into user-friendly feedback suitable for toast notifications.
 * @param error - The error object to process
 * @param context - Optional context object with fallbackMessage and fallbackTitle
 * @returns Object with title, message, and retryable flag for UI display
 */
export const getErrorFeedback = (
  error: unknown,
  context: ToastContext = {},
) => {
  const normalized = normalizeAppError(
    error,
    context.fallbackMessage ?? "Something went wrong.",
  );

  return {
    title: context.fallbackTitle ?? normalized.message,
    message: normalized.message,
    retryable: normalized.retryable ?? true,
  };
};
