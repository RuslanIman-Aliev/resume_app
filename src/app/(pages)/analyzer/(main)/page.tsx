import AnalyzerInfo from "@/features/analyzer/components/analyzer-info";
import AnalyzerTabs from "@/features/analyzer/components/analyzer-tabs";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analyzer | AI-Tailor",
  description: "Analyze job descriptions and match them with your resume.",
};

const AnalyzerPage = () => {
  const queryClient = getQueryClient();
  // Prefetch on the server so AnalyzerTabs hydrates without a client fetch.
  void queryClient.prefetchQuery(
    trpc.resume.getResumesAndAnalyses.queryOptions(),
  );

  return (
    <HydrateClient>
      <div>
        <section className="max-w-7xl grid grid-cols-3 gap-6 mx-auto">
          <div className="col-span-2">
            <AnalyzerTabs />
          </div>
          <AnalyzerInfo />
        </section>
      </div>
    </HydrateClient>
  );
};

export default AnalyzerPage;
