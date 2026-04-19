"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobMatchPusher } from "@/hooks/usePusher";
import {
  ApplicationData,
  KeywordsGapData,
  RequirementsMatchData,
  SkillsGapData,
} from "@/lib/types";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import {
  useParams,
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { useCallback } from "react";
import AnalyzeResumeImprovements from "./analyze-resume-improvements";
import {
  AnalyzeResumeError,
  AnalyzeResumeLoading,
} from "./analyze-resume-states";
import AnalyzeSkillsGap from "./analyze-skills-gap";
import AnalyzerResults from "./analyzer-results";
import AnalyzeKeywords from "./analyze-keywords";
import AnalyzeRequirementsMatch from "./analyze-requirements-match";

export const AnalyzeResumeClient = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get("tab") || "overview";
  const analyzeId = params?.analyzeId as string | undefined;
  const trpc = useTRPC();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    ...trpc.resume.getJobMatchResult.queryOptions({
      applicationId: analyzeId ?? "",
    }),
    retry: (failureCount, queryError) => {
      const errorCode = (queryError as { data?: { code?: string } } | null)
        ?.data?.code;

      if (errorCode === "NOT_FOUND") return false;
      return failureCount < 2;
    },
    refetchInterval: (query) => {
      const errorCode = (
        query.state.error as { data?: { code?: string } } | null
      )?.data?.code;

      if (errorCode === "NOT_FOUND") return 4000;

      return false;
    },
  });

  const errorCode = (error as { data?: { code?: string } } | null)?.data?.code;
  const isPendingAnalysis = errorCode === "NOT_FOUND";

  const handleAnalysisReady = useCallback(() => {
    refetch();
  }, [refetch]);
  useJobMatchPusher(analyzeId ?? "", handleAnalysisReady);

  if (isLoading || isPendingAnalysis) {
    return <AnalyzeResumeLoading />;
  }

  if (isError) {
    return <AnalyzeResumeError onRetry={refetch} isRetrying={isFetching} />;
  }

  const appData = data?.application;

  if (!appData) {
    return <AnalyzeResumeError onRetry={refetch} isRetrying={isFetching} />;
  }

  const rawSkillsGap = (appData as { skillsGap?: unknown }).skillsGap;
  const skillsGapData = (rawSkillsGap as SkillsGapData) || {
    soft: [],
    technical: [],
    missingCriticalSkills: [],
  };

  const rawKeywordsGap = (appData as { keywordsGap?: unknown }).keywordsGap;
  const keywordsGapData = (rawKeywordsGap as KeywordsGapData) || {
    found: [],
    missing: [],
  };
  const rawRequirementsMatch = (appData as { requirementsMatch?: unknown })
    .requirementsMatch;
  const requirementsMatchData =
    (rawRequirementsMatch as RequirementsMatchData) || {
      required: [],
      preferred: [],
    };
  const improvementsArray = (appData as unknown as { improvements?: unknown[] })
    .improvements;
  const improvementsCount = improvementsArray?.length || 0;

  const summaryObj = (
    appData as unknown as {
      summary?: { estimatedScoreWithAllImprovements?: number };
    }
  ).summary;
  const potentialScore = summaryObj?.estimatedScoreWithAllImprovements || 100;

  const navigateToImprovements = () => {
    // Navigate via URL parameters so Tabs can sync cleanly without hacking the DOM.
    router.push(`${pathname}?tab=improvements`);
  };
  return (
    <>
      <AnalyzerResults
        position={appData.jobTitle ?? ""}
        company={appData.companyName ?? ""}
        experience={appData.experience ?? ""}
        salaryRange={appData.salaryRange ?? ""}
        matchScore={appData.matchScore ?? 0}
      />

      <Tabs
        className=" text-white flex flex-col gap-1! mt-4"
        value={currentTab}
        onValueChange={(val) => router.push(`${pathname}?tab=${val}`)}
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
            value="skills-gap"
            className="text-white! py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Zap className="h-4 w-4 mr-2" />
            Skills Gap
          </TabsTrigger>
          <TabsTrigger
            value="keywords"
            className="text-white! py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Keywords
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <AnalyzeRequirementsMatch
            data={requirementsMatchData}
            improvementsCount={improvementsCount}
            potentialScore={potentialScore}
            onViewImprovements={navigateToImprovements}
          />
        </TabsContent>

        <TabsContent value="improvements" className="mt-4">
          <AnalyzeResumeImprovements
            data={appData as unknown as ApplicationData}
          />{" "}
        </TabsContent>
        <TabsContent value="skills-gap" className="mt-4">
          <AnalyzeSkillsGap data={skillsGapData} />
        </TabsContent>
        <TabsContent value="keywords" className="mt-4">
          <AnalyzeKeywords data={keywordsGapData} />
        </TabsContent>
      </Tabs>
      {/* <div className="grid lg:grid-cols-2 gap-6">
        <AnalyzerRequirements />

       
        <AnalyzerSkills />
      </div>

      <AnalyzerSuggestions /> */}
    </>
  );
};
