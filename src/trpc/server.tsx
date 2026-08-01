import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import {
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import { cache, type ReactNode } from "react";
import "server-only";
import { createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/_app";

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

/**
 * Streams the server-prefetched query cache to the client so components using
 * the same query keys hydrate without an extra client-side fetch.
 */
export function HydrateClient({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
