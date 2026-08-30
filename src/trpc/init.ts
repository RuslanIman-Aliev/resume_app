import { toPublicAppError } from "@/lib/app-error";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * Creates the shared tRPC context used by server procedures.
 */
export const createTRPCContext = cache(async () => {
  /**
   * Base context is intentionally empty. Authentication is resolved per-request
   * in `protectedProcedure`, which injects the real session as `ctx.auth`.
   * Do not put a user identity here — a static value would be trusted by any
   * non-protected procedure.
   *
   * @see: https://trpc.io/docs/server/context
   */
  return {};
});
// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
  errorFormatter({ shape, error }) {
    // An unexpected throw is the server's problem to read, not the user's, so
    // it is logged here and leaves only as the generic message. `shape.message`
    // is overwritten too: it is the raw `cause` message by default, and it is
    // what `TRPCClientError.message` ends up being on the client.
    if (error.code === "INTERNAL_SERVER_ERROR") {
      logError("trpc.procedure", error.cause ?? error);
    }

    const appError = toPublicAppError(error);

    return {
      ...shape,
      message: appError.message,
      data: {
        ...shape.data,
        appError,
      },
    };
  },
});
// Base router and procedure helpers
/**
 * Creates a namespaced tRPC router.
 */
export const createTRPCRouter = t.router;
/**
 * Creates a caller factory for invoking procedures from server code.
 */
export const createCallerFactory = t.createCallerFactory;
/**
 * Base procedure shared by all tRPC endpoints in this app.
 */
export const baseProcedure = t.procedure;
/**
 * Protected procedure that rejects unauthenticated requests.
 */
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User is not authenticated",
    });
  }

  return next({ ctx: { ...ctx, auth: session } });
});
