"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useResumePusher } from "@/hooks/usePusher";
import {
  ANALYSIS_POLL_INTERVAL_MS,
  hasAnalysisTimedOut,
} from "@/lib/analysis-polling";
import { getErrorFeedback } from "@/lib/error-feedback";
import { getScoreBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  CheckCircle2,
  CloudLightning,
  Code,
  Dot,
  FileText,
  GraduationCap,
  LucideMessageCircleWarning,
  Star,
} from "lucide-react";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect } from "react";
import {
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { toast } from "sonner";
import { CoachScoreCard } from "./coach-score-card";
import {
  MainScoreAnalysisFailed,
  MainScoreError,
  MainScoreNotAnalyzed,
  MainScorePending,
  MainScoreSkeleton,
} from "./main-score-status";

const chartConfig = {
  matchScore: {
    label: "Match Score",
  },
  safari: {
    label: "Match Score",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const MainScoreCard = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const resumeId = params.id as string;
  const analysisParam = searchParams.get("analysis");
  const analysisStartedAt = Number(searchParams.get("ts")) || 0;

  const { data, isLoading, isError, refetch } = useQuery({
    ...trpc.resume.getAnalysisResult.queryOptions({ resumeId }),
    retry: (failureCount, queryError) => {
      const errorCode = (queryError as { data?: { code?: string } } | null)
        ?.data?.code;

      // NOT_FOUND now means the resume does not exist or is not ours, which no
      // number of retries will change.
      if (errorCode === "NOT_FOUND") return false;
      return failureCount < 2;
    },
    // Polls only while a run this page is waiting on could still land. A
    // resume that already has results, one whose run was marked FAILED, and one
    // that was never analysed all stop the poll on the spot; the timeout covers
    // a run that died without recording anything.
    refetchInterval: (query) => {
      const result = query.state.data;
      if (!result || result.analysis || result.status === "FAILED") {
        return false;
      }
      if (analysisParam !== "1") return false;
      if (hasAnalysisTimedOut(analysisStartedAt || null)) return false;

      return ANALYSIS_POLL_INTERVAL_MS;
    },
  });

  const analysis = data?.analysis ?? null;
  const analysisStatus = data?.status;
  const analysisTimedOut = hasAnalysisTimedOut(analysisStartedAt || null);

  // "Analysing" is now a claim the page only makes about a run it actually
  // started and that has neither failed nor outrun the timeout.
  const isAwaitingAnalysis =
    !analysis &&
    analysisParam === "1" &&
    analysisStatus !== "FAILED" &&
    !analysisTimedOut;

  const clearAnalysisParams = useCallback(() => {
    if (analysisParam !== "1") return;
    const paramsToUpdate = new URLSearchParams(searchParams);
    paramsToUpdate.delete("analysis");
    paramsToUpdate.delete("ts");
    const nextUrl = paramsToUpdate.toString()
      ? `${pathname}?${paramsToUpdate.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [analysisParam, pathname, router, searchParams]);

  const handleAnalysisReady = useCallback(() => {
    clearAnalysisParams();
  }, [clearAnalysisParams]);

  useEffect(() => {
    if (!isAwaitingAnalysis || !analysisStartedAt) return;
    const createdAt = data?.analysis?.createdAt
      ? new Date(data.analysis.createdAt).getTime()
      : 0;
    if (createdAt && createdAt >= analysisStartedAt) {
      clearAnalysisParams();
    }
  }, [
    analysisStartedAt,
    isAwaitingAnalysis,
    clearAnalysisParams,
    data?.analysis?.createdAt,
  ]);

  const { mutate: startAnalysis, isPending: isStartingAnalysis } = useMutation(
    trpc.resume.triggerAnalysis.mutationOptions({
      onSuccess: () => {
        queryClient.removeQueries({
          queryKey: trpc.resume.getAnalysisResult.queryOptions({ resumeId })
            .queryKey,
        });
        queryClient.removeQueries({
          queryKey: trpc.resume.getImprovements.queryOptions({ resumeId })
            .queryKey,
        });

        // Re-arms the wait on this same page: `analysis=1` turns polling back
        // on and `ts` restarts the timeout clock.
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("analysis", "1");
        nextParams.set("ts", new Date().getTime().toString());
        router.replace(`${pathname}?${nextParams.toString()}`, {
          scroll: false,
        });

        toast.success("Analysis started! This will take about 20 seconds.");
      },
      onError: (error) => {
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to start analysis",
          }).message,
        );
      },
    }),
  );

  const handleStartAnalysis = useCallback(() => {
    startAnalysis({ resumeId });
  }, [resumeId, startAnalysis]);

  const handleAnalysisFailed = useCallback(() => {
    toast.error("The analysis could not be completed.");
  }, []);

  useResumePusher(
    isAwaitingAnalysis ? resumeId : null,
    handleAnalysisReady,
    handleAnalysisFailed,
  );

  const analysisId = data?.analysis?.id;
  useEffect(() => {
    if (!analysisId) return;

    // Depend on the analysis id (a primitive) rather than the analysis object,
    // whose identity changes on every poll refetch and would otherwise
    // re-invalidate resume.getAll on every interval tick.
    queryClient.invalidateQueries({
      queryKey: trpc.resume.getAll.queryKey(),
      refetchType: "active",
    });
  }, [analysisId, queryClient, trpc]);

  if (isLoading) {
    return <MainScoreSkeleton />;
  }

  if (isError) {
    return <MainScoreError onRetry={() => refetch()} />;
  }

  if (!analysis) {
    if (analysisStatus === "FAILED") {
      return (
        <MainScoreAnalysisFailed
          onRetry={handleStartAnalysis}
          isRetrying={isStartingAnalysis}
        />
      );
    }

    if (isAwaitingAnalysis) {
      return <MainScorePending />;
    }

    // Waited past the cap on a run that never reported anything either way.
    if (analysisParam === "1") {
      return (
        <MainScoreAnalysisFailed
          onRetry={handleStartAnalysis}
          isRetrying={isStartingAnalysis}
          timedOut
        />
      );
    }

    return (
      <MainScoreNotAnalyzed
        onRetry={handleStartAnalysis}
        isRetrying={isStartingAnalysis}
      />
    );
  }

  const overallScore = Math.min(100, Math.max(0, analysis.overallScore ?? 0));
  const displayScore = Math.round(overallScore);
  const scoreBand = getScoreBand(displayScore);

  const strengths = (analysis.strengths as string[]) || [];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border border-border/50 bg-card/50">
          <CardHeader>
            <h3 className="text-xl font-semibold">Resume Score</h3>
            <p className="text-sm text-muted-foreground">
              Based on your latest resume:{" "}
              {analysis.resume?.resumeName || "Untitled Resume"}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 items-center justify-center md:flex-row">
            <div>
              <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square min-h-62.5"
              >
                <RadialBarChart
                  data={[{ matchScore: overallScore }]}
                  startAngle={90}
                  endAngle={-270}
                  outerRadius={100}
                  innerRadius={70}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <PolarGrid
                    gridType="circle"
                    radialLines={false}
                    stroke="none"
                    className="first:fill-muted last:fill-background"
                    polarRadius={[100, 70]}
                  />
                  <RadialBar
                    dataKey="matchScore"
                    background
                    fill="var(--primary)"
                    cornerRadius={10}
                  />
                  <PolarRadiusAxis
                    tick={false}
                    tickLine={false}
                    axisLine={false}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-4xl font-bold"
                              >
                                {displayScore}%
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground"
                              >
                                Match Score
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                </RadialBarChart>
              </ChartContainer>
            </div>

            <div className="flex flex-col gap-2">
              {/* Verdict and copy both come from the score itself; see
                  SCORE_BANDS for the thresholds they share with the number. */}
              <Badge
                variant="outline"
                className={cn("w-fit border", scoreBand.badgeClass)}
              >
                {scoreBand.label}
              </Badge>
              <p className="text-[18px] text-muted-foreground">
                {scoreBand.summary}
              </p>
              <div className="flex w-full flex-col gap-2 mt-4 sm:flex-row">
                <div className="p-3 rounded-lg bg-primary/10 flex gap-3 flex-1 ">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div className="flex flex-col">
                    <p className="text-base">
                      {analysis.strengths.length || 0} Strengths
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Areas performing well
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 flex gap-3 flex-1">
                  <LucideMessageCircleWarning className="h-6 w-6 text-yellow-400" />
                  <div className="flex flex-col">
                    <p className="text-base">
                      {analysis.improvements.length || 0} Improvements
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suggested changes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="border border-border/50 bg-card/50">
            <CardHeader className="flex gap-3 items-center">
              <CloudLightning className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Quick Wins</h3>
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
              {analysis.quickWins &&
              analysis.quickWins.length > 0 ? (
                analysis.quickWins.map((win, index) => (
                  <div
                    key={`${win.title}-${index}`}
                    className="flex flex-col gap-1 justify-between items-start sm:flex-row sm:gap-3 sm:items-center"
                  >
                    <div className="flex items-center">
                      <Dot className="h-10 w-10 text-primary  mt-1" />
                      <p className="text-sm text-muted-foreground">
                        {win.title}
                      </p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <Badge
                        variant="outline"
                        className="border-yellow-400 text-yellow-400"
                      >
                        {win.impact}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {win.timeEstimate}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No quick wins identified.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/50">
            <CardHeader className="flex gap-3 items-center">
              <Star className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold">Strengths</h3>
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
              {strengths && strengths.length > 0 ? (
                strengths.map((strength, index) => (
                  <div
                    key={`${strength}-${index}`}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                    <p className="text-sm text-muted-foreground">{strength}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No strengths identified.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        <CoachScoreCard
          icon={FileText}
          title="Content Quality"
          score={analysis.contentQuality || 0}
          description="Clear and relevant content"
        />
        <CoachScoreCard
          icon={Code}
          title="ATS Optimization"
          score={analysis.atsOptimization || 0}
          description="Keyword matching"
        />
        <CoachScoreCard
          icon={Briefcase}
          title="Experience"
          score={analysis.experience || 0}
          description="Impact and achievements"
        />
        <CoachScoreCard
          icon={GraduationCap}
          title="Skills Match"
          score={analysis.skillsMatch || 0}
          description="Industry relevance"
        />
      </div>
    </>
  );
};

export default MainScoreCard;
