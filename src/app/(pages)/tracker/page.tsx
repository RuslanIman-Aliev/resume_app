import MainView from "@/features/tracker/components/main-view";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Tracker | AI-Tailor",
  description: "Track your applications, interviews, and offers in one place.",
};

const TrackerPage = async () => {
  const queryClient = getQueryClient();
  // Prefetch the board on the server so MainView hydrates without a client
  // fetch.
  // Awaited, not fired and forgotten: an unresolved query leaves the server
  // rendering the loading state while the client hydrates with data already
  // in the cache, and React discards the whole subtree over the mismatch
  // (error #418). Waiting here costs the round trip but ships settled HTML.
  await queryClient.prefetchQuery(trpc.tracker.getAll.queryOptions());

  return (
    <HydrateClient>
      <div>
        <MainView />
      </div>
    </HydrateClient>
  );
};

export default TrackerPage;
