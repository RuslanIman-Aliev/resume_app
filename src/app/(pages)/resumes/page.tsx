import ResumeCard from "@/features/resumes/components/resume-card";
import ResumeManager from "@/features/resumes/components/resume-manager";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resumes | AI-Tailor",
  description: "Manage your resumes, analyze them, and track improvements.",
};

const firstValue = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined;

const ResumesPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const params = await searchParams;

  const queryClient = getQueryClient();
  // ResumeCard derives its input from the same URL params, so this must mirror
  // `useUrlPage()` and its `searchParams` reads exactly — a different input
  // produces a different query key and the prefetch is silently wasted.
  void queryClient.prefetchQuery(
    trpc.resume.getAll.queryOptions({
      page: Number(firstValue(params.page)) || 1,
      search: firstValue(params.search),
      status: firstValue(params.status),
    }),
  );

  return (
    <HydrateClient>
      <div className="flex flex-col container w-full mx-auto pt-10">
        <ResumeManager />
        <ResumeCard />
      </div>
    </HydrateClient>
  );
};

export default ResumesPage;
