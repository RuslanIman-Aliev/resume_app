import { normalizeAppError } from "./app-error";

type ToastContext = {
  fallbackMessage?: string;
  fallbackTitle?: string;
};

export const getErrorMessage = (
  error: unknown,
  fallbackMessage = "Something went wrong.",
) => {
  return normalizeAppError(error, fallbackMessage).message;
};

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
