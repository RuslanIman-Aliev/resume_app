"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { useResumePusher } from "@/hooks/usePusher";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  CheckCircle2,
  CloudLightning,
  Code,
  Dot,
  FileText,
  GraduationCap,
  LucideMessageCircleWarning,
  Star
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import {
  Label,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { CoachScoreCard } from "./coach-score-card";
import {
  MainScoreError,
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
  const params = useParams();
  const resumeId = params.id as string;
  const { data, isLoading, isError, error, refetch } = useQuery({
    ...trpc.resume.getAnalysisResult.queryOptions({ resumeId }),
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

      return errorCode === "NOT_FOUND" ? 4000 : false;
    },
  });

  const errorCode = (error as { data?: { code?: string } } | null)?.data?.code;
  const isPendingAnalysis = errorCode === "NOT_FOUND";
  const handleAnalysisReady = useCallback(() => {
    refetch();
  }, [refetch]);

  useResumePusher(isPendingAnalysis ? resumeId : null, handleAnalysisReady);

  console.log("Analysis data:", data);

  if (isLoading) {
    return <MainScoreSkeleton />;
  }

  if (isPendingAnalysis) {
    return <MainScorePending />;
  }

  if (isError) {
    return <MainScoreError />;
  }

  const overallScore = Math.min(
    100,
    Math.max(0, data?.analysis.overallScore ?? 0),
  );
  const displayScore = Math.round(overallScore);

  const strengths = (data?.analysis?.strengths as string[]) || [];
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-2 border border-border/50 bg-card/50">
          <CardHeader>
            <h3 className="text-xl font-semibold">Resume Score</h3>
            <p className="text-sm text-muted-foreground">
              Based on your latest resume: Software_Engineer_Resume.pdf
            </p>
          </CardHeader>
          <CardContent className="flex gap-4 items-center justify-center">
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
              {/* Add later a border and color depend on a value */}
              <Badge className="border">Good</Badge>
              <p className="text-[18px] text-muted-foreground">
                Your resume is performing well but there&apos;s room for
                improvement. Focus on the high-impact suggestions below to
                increase your score and stand out to recruiters.
              </p>
              <div className="flex w-full gap-2 mt-4">
                <div className="p-3 rounded-lg bg-primary/10 flex gap-3 flex-1 ">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div className="flex flex-col">
                    <p className="text-base">
                      {data?.analysis?.strengths.length || 0} Strengths
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
                      {data?.analysis?.improvements.length || 0} Improvements
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
              {data?.analysis.quickWins &&
              data?.analysis.quickWins.length > 0 ? (
                data?.analysis.quickWins.map((win, index) => (
                  <div
                    key={`win-${index}`}
                    className="flex gap-3 justify-between items-center"
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
                    key={`strength-${index}`}
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
          score={data?.analysis.contentQuality || 0}
          description="Clear and relevant content"
        />
        <CoachScoreCard
          icon={Code}
          title="ATS Optimization"
          score={data?.analysis.atsOptimization || 0}
          description="Keyword matching"
        />
        <CoachScoreCard
          icon={Briefcase}
          title="Experience"
          score={data?.analysis.experience || 0}
          description="Impact and achievements"
        />
        <CoachScoreCard
          icon={GraduationCap}
          title="Skills Match"
          score={data?.analysis.skillsMatch || 0}
          description="Industry relevance"
        />
      </div>
    </>
  );
};

export default MainScoreCard;
