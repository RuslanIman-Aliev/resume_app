import { AnalyzeResumeClient } from "@/features/analyzer/components/analyze-resume-client";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

type PageProps = {
  params: Promise<{ analyzeId: string }>;
};

const getApplicationMetadata = cache(async (analyzeId: string) => {
  const session = await requireAuth();
  return prisma.jobApplication.findFirst({
    where: { id: analyzeId, userId: session.user.id },
    select: {
      jobTitle: true,
      companyName: true,
      resume: {
        select: {
          resumeName: true,
          postedRole: true,
        },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const application = await getApplicationMetadata(resolvedParams.analyzeId);

  if (!application) {
    return {
      title: "Resume Analysis | AI-Tailor",
      description: "Review AI insights and suggestions for your resume.",
    };
  }

  const resumeName = application.resume.resumeName?.trim() || "Resume";
  const role =
    application.jobTitle?.trim() || application.resume.postedRole?.trim();
  const company = application.companyName?.trim();
  const roleLabel = role ? (company ? `${role} at ${company}` : role) : null;
  const title = roleLabel
    ? `Resume Analysis for ${resumeName} — ${roleLabel} | AI-Tailor`
    : `Resume Analysis for ${resumeName} | AI-Tailor`;
  const description = roleLabel
    ? `AI insights for ${resumeName} targeting ${roleLabel}.`
    : `AI insights and suggestions for ${resumeName}.`;

  return { title, description };
}

const AnalyzeResume = async ({ params }: PageProps) => {
  const { analyzeId } = await params;
  const application = await getApplicationMetadata(analyzeId);

  if (!application) {
    notFound();
  }

  const queryClient = getQueryClient();
  // Prefetch so AnalyzeResumeClient hydrates without a client fetch. A match
  // still being analyzed resolves to NOT_FOUND, which is not dehydrated, so
  // the client falls back to its own fetch-and-poll path.
  void queryClient.prefetchQuery(
    trpc.resume.getJobMatchResult.queryOptions({ applicationId: analyzeId }),
  );

  return (
    <HydrateClient>
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 pb-6">
        {/* <Button
          variant={"ghost"}
          asChild
          className="hover:bg-primary! hover:text-black"
        >
          <Link href="/analyzer" className="text-sm font-medium">
            &larr; Back to Analyzer
          </Link>
        </Button> */}

        <div className="flex min-h-0 flex-1 flex-col">
          <AnalyzeResumeClient />
        </div>
      </div>
    </HydrateClient>
  );
};

export default AnalyzeResume;
