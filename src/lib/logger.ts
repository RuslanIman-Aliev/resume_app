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
