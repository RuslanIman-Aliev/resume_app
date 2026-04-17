"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobMatchPusher } from "@/hooks/usePusher";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Target, TrendingUp, Zap } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import AnalyzeResumeImprovements from "./analyze-resume-improvements";
import {
  AnalyzeResumeError,
  AnalyzeResumeLoading,
} from "./analyze-resume-states";
import AnalyzerResults from "./analyzer-results";
import { ApplicationData } from "@/lib/types";

export const AnalyzeResumeClient = () => {
  const params = useParams();
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
  console.log("Application data:", appData);

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
            <Zap className="h-4 w-4 mr-2" />
            Skills Gap
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="text-white! py-1 px-3 data-[state=active]:text-black! data-[state=active]:bg-primary!"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Keywords
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {/* <MainScoreCard /> */}
        </TabsContent>

        <TabsContent value="improvements" className="mt-4">
          <AnalyzeResumeImprovements
            data={appData as unknown as ApplicationData}
          />{" "}
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
