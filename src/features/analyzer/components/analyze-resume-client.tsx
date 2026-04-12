"use client";

import { useParams } from "next/navigation";
import AnalyzerRequirements from "./analyzer-requirements";
import AnalyzerResults from "./analyzer-results";
import AnalyzerSkills from "./analyzer-skills";
import AnalyzerSuggestions from "./analyzer-suggestions";
import {
  AnalyzeResumeError,
  AnalyzeResumeLoading,
} from "./analyze-resume-states";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useJobMatchPusher } from "@/hooks/usePusher";

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

      <div className="grid lg:grid-cols-2 gap-6">
        <AnalyzerRequirements />

        {/* Second card */}
        <AnalyzerSkills />
      </div>

      <AnalyzerSuggestions />
    </>
  );
};
