import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImprovementsSection from "@/features/ai-coach/components/improvements-section";
import MainScoreCard from "@/features/ai-coach/components/main-score-card";
import { Sparkles, Target, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAuth } from "@/lib/auth-utils";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import prisma from "@/lib/db";

type PageProps = {
  params: Promise<{ id: string }>;
};

const getResumeMetadata = cache(async (id: string) => {
  const session = await requireAuth();
  return prisma.resume.findFirst({
    where: { id, userId: session.user.id },
    select: { resumeName: true, postedRole: true },
  });
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resume = await getResumeMetadata(resolvedParams.id);

  if (!resume) {
    return {
      title: "AI Career Coach | AI-Tailor",
      description:
        "Get personalized AI guidance and improvement plans for your resume.",
    };
  }

  const resumeName = resume.resumeName?.trim() || "Resume";
  const role = resume.postedRole?.trim();
  const title = role
    ? `AI Coach for ${resumeName} — ${role} | AI-Tailor`
    : `AI Coach for ${resumeName} | AI-Tailor`;
  const description = role
    ? `Personalized AI coaching for ${resumeName} targeting ${role}.`
    : `Personalized AI coaching for ${resumeName}.`;

  return { title, description };
}

const AiCoachPage = async ({ params }: PageProps) => {
  const { id } = await params;
  const resume = await getResumeMetadata(id);

  if (!resume) {
    notFound();
  }

  const queryClient = getQueryClient();
  // Both tabs read the same analysis row, so prefetching here lets the
  // Overview and Improvements panels hydrate without a client fetch.
  void queryClient.prefetchQuery(
    trpc.resume.getAnalysisResult.queryOptions({ resumeId: id }),
  );
  void queryClient.prefetchQuery(
    trpc.resume.getImprovements.queryOptions({ resumeId: id }),
  );

  return (
    <HydrateClient>
      <section className="">
        <div className="max-w-7xl mx-auto flex flex-col my-10 px-4 sm:px-6 xl:px-0">
          <div className="flex flex-row gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-bold mb-4">AI Career Coach</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            Get personalized AI-powered suggestions to improve your resume,
            prepare for interviews, and land your dream job faster.
          </p>
          <Tabs
            className=" text-white flex flex-col gap-1! mt-4"
            defaultValue="overview"
          >
            <TabsList className="bg-background p-1 w-full max-w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-auto md:w-fit md:justify-center md:overflow-x-visible md:group-data-horizontal/tabs:h-8">
              <TabsTrigger
                value="overview"
                className="text-white!  py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
              >
                <Target className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="improvements"
                className="text-white! py-1 px-3 h-auto min-h-11 flex-none md:h-[calc(100%-1px)] md:min-h-0 md:flex-1 data-[state=active]:text-black! data-[state=active]:bg-primary!"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Improvements
              </TabsTrigger>
              {/* Action Plan and Ask AI are not built yet. They stay out of the
                  tab list until they have content — a tab that opens onto an
                  empty panel reads as a broken page, not as a coming feature. */}
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <MainScoreCard />
            </TabsContent>

            <TabsContent value="improvements" className="mt-4">
              <ImprovementsSection />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </HydrateClient>
  );
};

export default AiCoachPage;
