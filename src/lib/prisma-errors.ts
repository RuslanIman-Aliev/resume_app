import { createAppError } from "@/lib/app-error";

/**
 * Prisma's code for "an operation depended on records that were not found".
 * A `where` clause scoped to `userId` turns "not yours" into the same code, so
 * it covers both a deleted row and one belonging to somebody else.
 */
const RECORD_NOT_FOUND = "P2025";

const isPrismaError = (error: unknown, code: string) =>
  error instanceof Error &&
  (error as { code?: unknown }).code === code &&
  error.name.startsWith("PrismaClient");

/**
 * Runs a Prisma write whose `where` clause is scoped to the caller and turns a
 * missing row into a `NOT_FOUND` the client can act on.
 *
 * Without this the driver error escapes as an unexpected 500: retryable, and
 * carrying `Invalid \`prisma.trackerPosition.update()\` invocation` plus the
 * model name into whatever the UI does with the message.
 * @param operation - The Prisma call to run
 * @param notFoundMessage - What to tell the user when the row is not theirs
 * @returns Whatever the Prisma call resolves to
 */
export const withRecordScope = async <T>(
  operation: () => Promise<T>,
  notFoundMessage: string,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (isPrismaError(error, RECORD_NOT_FOUND)) {
      throw createAppError({
        code: "NOT_FOUND",
        message: notFoundMessage,
      });
    }

    throw error;
  }
};
