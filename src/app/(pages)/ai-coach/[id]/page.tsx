import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImprovementsSection from "@/features/ai-coach/components/improvements-section";
import MainScoreCard from "@/features/ai-coach/components/main-score-card";
import {
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAuth } from "@/lib/auth-utils";
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

  return (
    <section className="">
      <div className="max-w-7xl mx-auto flex flex-col my-10">
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
          <TabsList className="bg-background p-1">
            <TabsTrigger
              value="overview"
              className="text-white!  py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <Target className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="improvements"
              className="text-white! py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Improvements
            </TabsTrigger>
            <TabsTrigger
              value="action-plan"
              className="text-white! py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Action Plan
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="text-white! py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask AI
            </TabsTrigger>
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
  );
};

export default AiCoachPage;
