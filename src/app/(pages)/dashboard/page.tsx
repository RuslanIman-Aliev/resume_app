import ApplicationPipeline from "@/features/dashboard/components/application-pipeline";
import MainInfo from "@/features/dashboard/components/main-info";
import QuickActions from "@/features/dashboard/components/quick-actions";
import RecentAnalyses from "@/features/dashboard/components/recent-analyses";
import UpcomingInterviews from "@/features/dashboard/components/upcoming-interviews";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | AI-Tailor",
  description:
    "See your job search overview, recent analyses, and live interview stage.",
};

const Page = async () => {
  const queryClient = getQueryClient();
  // Prefetch on the server so the cards hydrate without a client fetch.
  // Awaited, not fired and forgotten: an unresolved query leaves the server
  // rendering the loading state while the client hydrates with data already
  // in the cache, and React discards the whole subtree over the mismatch
  // (error #418). Waiting here costs the round trip but ships settled HTML.
  // Promise.all rather than five awaits: the cards do not depend on each
  // other, and awaiting them in sequence would stack five round trips.
  await Promise.all([
    queryClient.prefetchQuery(trpc.resume.getLatest4Analyses.queryOptions()),
    queryClient.prefetchQuery(trpc.tracker.getPipelineStats.queryOptions()),
    queryClient.prefetchQuery(
      trpc.tracker.get4LatestTrackerJobs.queryOptions(),
    ),
    queryClient.prefetchQuery(trpc.tracker.getStatistics.queryOptions()),
    queryClient.prefetchQuery(
      trpc.tracker.getInterviewStagePositions.queryOptions(),
    ),
  ]);

  return (
    <HydrateClient>
      <div>
        <section className="container max-w-7xl mx-auto px-4 sm:px-6 xl:px-0 pt-10 pb-10 xl:pb-0">
          <MainInfo />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ApplicationPipeline />
              <RecentAnalyses />
            </div>

            <div className="space-y-6">
              <QuickActions />
              <UpcomingInterviews />
            </div>
          </div>
        </section>
      </div>
    </HydrateClient>
  );
};

export default Page;
