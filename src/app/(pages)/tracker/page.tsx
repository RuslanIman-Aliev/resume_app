import MainView from "@/features/tracker/components/main-view";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application Tracker | AI-Tailor",
  description: "Track your applications, interviews, and offers in one place.",
};

const TrackerPage = () => {
  const queryClient = getQueryClient();
  // Prefetch the board on the server so MainView hydrates without a client fetch.
  void queryClient.prefetchQuery(trpc.tracker.getAll.queryOptions());

  return (
    <HydrateClient>
      <div>
        <MainView />
      </div>
    </HydrateClient>
  );
};

export default TrackerPage;
