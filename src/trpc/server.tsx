import "server-only";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { createTRPCClient, httpLink } from "@trpc/client";
import { cache } from "react";
import { createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";
import type { AppRouter } from "./routers/_app";

/**
 * Server-side singleton QueryClient for data caching across requests.
 * Uses React cache to memoize the client within a request lifecycle.
 */
export const getQueryClient = cache(makeQueryClient);

/**
 * Server-side tRPC instance for invoking procedures directly from server components.
 * Bypasses HTTP layer for efficient server-to-server communication.
 */
export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});
createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient<AppRouter>({
    links: [httpLink({ url: "..." })],
  }),
  queryClient: getQueryClient,
});
