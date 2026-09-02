import RecentAnalysesList from "@/features/recent-analyzer/components/recent-analyses-list";
import { getListQueryInput } from "@/features/recent-analyzer/lib/list-params";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recent Analyses | AI-Tailor",
  description:
    "Browse every job match analysis you have run, with scores and companies.",
};

const RecentAnalyzerPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const params = await searchParams;
  // The list reads its filter, sort and page from the URL, so the prefetch has
  // to be built from the same values - a prefetch of the default query would
  // land under a different key and the page would fetch again on mount.
  const queryInput = getListQueryInput({
    get: (name) => {
      const value = params[name];
      return typeof value === "string" ? value : null;
    },
  });

  const queryClient = getQueryClient();
  // Awaited, not fired and forgotten: an unresolved query leaves the server
  // rendering the loading state while the client hydrates with data already
  // in the cache, and React discards the whole subtree over the mismatch
  // (error #418). Waiting here costs the round trip but ships settled HTML.
  await queryClient.prefetchQuery(
    trpc.jobApplication.getJobApplication.queryOptions(queryInput),
  );

  return (
    <HydrateClient>
      <div className="max-w-7xl mx-auto flex flex-col my-10 px-4 sm:px-6 xl:px-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
          Recent Analyses
        </h1>
        <p className="text-muted-foreground font-medium">
          Here are your recent resume analyses.
        </p>
        <RecentAnalysesList />
      </div>
    </HydrateClient>
  );
};

export default RecentAnalyzerPage;
