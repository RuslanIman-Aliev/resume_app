/**
 * Logs errors with structured formatting to console for debugging and monitoring.
 * Extracts error properties if Error instance, otherwise converts to string.
 * @param context - Context description identifying where the error occurred
 * @param error - The error object (can be Error, string, or any type)
 * @param details - Optional additional metadata to include in the log
 */
export const logError = (
  context: string,
  error: unknown,
  details?: Record<string, unknown>,
) => {
  const payload = {
    ...details,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
          }
        : { message: String(error) },
  };

  console.error(context, payload);
};
