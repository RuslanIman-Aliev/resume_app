"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { CheckCircle2, LucideMessageCircleWarning, Star } from "lucide-react";
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";

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
                  data={[{ matchScore: 75 }]}
                  startAngle={0}
                  endAngle={250}
                  outerRadius={100}
                  innerRadius={70}
                >
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
                                75
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
                    <p className="text-base">5 Improvements</p>
                    <p className="text-sm text-muted-foreground">
                      Areas performing well
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 flex gap-3 flex-1">
                  <LucideMessageCircleWarning className="h-6 w-6 text-yellow-400" />
                  <div className="flex flex-col">
                    <p className="text-base">5 Improvements</p>
                    <p className="text-sm text-muted-foreground">
                      Suggested changes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div>
          <Card className="border border-border/50 bg-card/50">
            <CardHeader className="flex gap-3 items-center">
              <Star className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-semibold">Strengths</h3>
            </CardHeader>

            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                <p className="text-sm text-muted-foreground">
                  Your resume effectively highlights your key skills and
                  experiences.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                <p className="text-sm text-muted-foreground">
                  Your resume effectively highlights your key skills and
                  experiences.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                <p className="text-sm text-muted-foreground">
                  Your resume effectively highlights your key skills and
                  experiences.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default MainScoreCard;
