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

const Page = () => {
  const queryClient = getQueryClient();
  // Prefetch on the server so the cards hydrate without a client fetch.
  void queryClient.prefetchQuery(trpc.resume.getLatest4Analyses.queryOptions());
  void queryClient.prefetchQuery(trpc.tracker.getPipelineStats.queryOptions());
  void queryClient.prefetchQuery(
    trpc.tracker.get4LatestTrackerJobs.queryOptions(),
  );
  void queryClient.prefetchQuery(trpc.tracker.getStatistics.queryOptions());
  void queryClient.prefetchQuery(
    trpc.tracker.getInterviewStagePositions.queryOptions(),
  );

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
