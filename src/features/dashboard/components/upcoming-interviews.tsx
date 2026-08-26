"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const stageLabels: Record<string, string> = {
  screening: "Screening",
  interview: "Interview",
};

const stageColors: Record<string, string> = {
  screening: "bg-chart-4/10 text-chart-4",
  interview: "bg-chart-2/10 text-chart-2",
};

const UpcomingInterviews = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.tracker.getInterviewStagePositions.queryOptions(),
  );

  if (isLoading) {
    return (
      <section>
        <Card className="p-6">
          <div className="mb-4">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`interview-skeleton-${index}`}
                className="space-y-2 px-4 py-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </Card>
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        <Card className="p-6">
          <FeedbackState
            status="error"
            layout="inline"
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            title="Unable to load your interview stage"
            description="Please try again in a moment."
            primaryAction={{
              label: "Retry",
              onClick: () => refetch(),
              disabled: isFetching,
              icon: (
                <RefreshCcw
                  className={cn("h-4 w-4", isFetching && "animate-spin")}
                />
              ),
              variant: "secondary",
            }}
          />
        </Card>
      </section>
    );
  }

  return (
    <section>
      <Card className="p-6">
        <h1 className="text-lg font-bold mb-2">Interview Stage</h1>
        {!data?.length ? (
          <FeedbackState
            status="default"
            layout="inline"
            className="py-10 animate-in fade-in duration-500"
            icon={<CalendarClock className="h-8 w-8 text-primary/50" />}
            title="No interviews in play"
            description="Move a tracked job to Screening or Interview and it will show up here."
            primaryAction={{
              label: "Open tracker",
              onClick: () => router.push("/tracker"),
              variant: "secondary",
            }}
          />
        ) : (
          data.map(({ id, company, position, status, updatedAt }) => (
            <div
              key={id}
              className="cursor-pointer"
              onMouseEnter={() => router.prefetch("/tracker")}
              onClick={() => router.push("/tracker")}
            >
              <div className="flex flex-col w-full rounded-lg py-2 px-4 transition-all hover:border-border hover:bg-secondary/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{company}</div>
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${stageColors[status] ?? ""}`}
                  >
                    {stageLabels[status] ?? status}
                  </Badge>
                </div>

                <div className="truncate text-muted-foreground">{position}</div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Updated {getRelativeTime(updatedAt)}
                </div>
              </div>
            </div>
          ))
        )}
        <Button
          asChild
          variant="outline"
          className="w-full mt-2 h-11 sm:h-9"
          size="sm"
        >
          <Link href="/tracker" prefetch>
            Open Tracker
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </Card>
    </section>
  );
};

export default UpcomingInterviews;
