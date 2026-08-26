"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTrackerStatusPresentation,
  PIPELINE_STAGE_ORDER,
  TRACKER_STATUS_CONFIG,
} from "@/lib/ui-config";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  Plus,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ApplicationPipeline = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const {
    data: applications,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery(trpc.tracker.get4LatestTrackerJobs.queryOptions());
  const {
    data: pipeline,
    isLoading: isPipelineLoading,
    isError: isPipelineError,
    refetch: refetchPipeline,
    isFetching: isPipelineFetching,
  } = useQuery(trpc.tracker.getPipelineStats.queryOptions());

  if (isLoading || isPipelineLoading) {
    return (
      <section>
        <Card className="p-6">
          <div className="mb-4">
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="mb-6 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              {PIPELINE_STAGE_ORDER.map((status) => (
                <div
                  key={`pipeline-stage-skeleton-${status}`}
                  className="flex flex-col items-center gap-1"
                >
                  <Skeleton className="h-3 w-4" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`application-skeleton-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-4"
              >
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-2 w-16 rounded-full" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    );
  }

  if (isError || isPipelineError) {
    return (
      <section>
        <Card className="p-6">
          <FeedbackState
            status="error"
            layout="inline"
            icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
            title="Unable to load your application pipeline"
            description="Please try again in a moment."
            primaryAction={{
              label: "Retry",
              onClick: () => {
                refetch();
                refetchPipeline();
              },
              disabled: isFetching || isPipelineFetching,
              icon: (
                <RefreshCcw
                  className={cn(
                    "h-4 w-4",
                    (isFetching || isPipelineFetching) && "animate-spin",
                  )}
                />
              ),
              variant: "secondary",
            }}
          />
        </Card>
      </section>
    );
  }

  // Config supplies label/color, the tracker supplies the count.
  const stages = PIPELINE_STAGE_ORDER.map((status) => ({
    id: status,
    label: TRACKER_STATUS_CONFIG[status].label,
    barClass: TRACKER_STATUS_CONFIG[status].barClass,
    count: pipeline?.counts[status] ?? 0,
  }));
  const totalApplications = stages.reduce((acc, stage) => acc + stage.count, 0);
  return (
    <section>
      <Card className="p-6">
        <h1 className="text-lg font-bold mb-2">Application Pipeline</h1>
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-2">
            {totalApplications === 0 ? (
              <div className="h-2 w-full rounded-full bg-muted" />
            ) : (
              stages.map((stage) => (
                <div
                  key={stage.id}
                  className={`h-2 ${stage.barClass} rounded-full transition-all`}
                  style={{
                    width: `${(stage.count / totalApplications) * 100}%`,
                    minWidth: stage.count > 0 ? "8px" : "0",
                  }}
                />
              ))
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {stages.map((stage) => (
              <div key={stage.id} className="flex flex-col items-center">
                <span className="font-medium text-foreground">
                  {stage.count}
                </span>
                <span>{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
        {!applications?.length ? (
          <FeedbackState
            status="default"
            layout="inline"
            className="py-14 animate-in fade-in duration-500"
            icon={
              <div className="relative">
                <Briefcase className="h-8 w-8 text-primary/50" />
                <div className="absolute -bottom-4 -right-4 flex h-7 w-7 items-center justify-center rounded-full border bg-background text-primary">
                  <Plus className="h-3.5 w-3.5" />
                </div>
              </div>
            }
            title="No applications tracked yet"
            description="Add a job to your tracker to follow it from saved all the way to offer."
            primaryAction={{
              label: "Open tracker",
              onClick: () => router.push("/tracker"),
              variant: "secondary",
            }}
          />
        ) : (
          applications.map(
            ({
              id,
              company,
              position: role,
              location,
              status: stage,
              matchScore,
              createdAt: appliedDate,
            }) => (
              <div
                key={id}
                className="cursor-pointer"
                onMouseEnter={() => router.prefetch("/tracker")}
                onClick={() => router.push("/tracker")}
              >
                <div className="flex  mb-4  items-center gap-3 w-full rounded-lg border border-border/50 bg-secondary/30 p-4 transition-all hover:border-border hover:bg-secondary/50">
                  <Avatar className="flex  items-center justify-center rounded-lg bg-primary/10 h-11 w-11 text-sm font-bold text-primary">
                    <AvatarFallback className="text-primary h-11 w-11 shrink-0 rounded-lg bg-primary/10 text-sm">
                      {company.charAt(0).toUpperCase() +
                        company.slice(1, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="w-full min-w-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-0">
                      <div className="gap-2 flex items-center min-w-0">
                        <span className="truncate font-medium text-sm">
                          {role}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getTrackerStatusPresentation(stage).badgeClass}`}
                        >
                          {getTrackerStatusPresentation(stage).label}
                        </Badge>
                      </div>
                      {matchScore !== null && (
                        <div className="flex items-center gap-1 shrink-0">
                          <p className="text-muted-foreground">Match </p>
                          <Progress value={matchScore} className="w-16 h-2" />
                          <div className="text-primary">{matchScore}%</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{company}</span>
                        </div>

                        {location && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(appliedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          )
        )}
        <div className=" flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-muted-foreground sm:flex-row">
          <Briefcase className="h-4 w-4" />
          <span className="text-sm">
            Track every application to see where your offers come from
          </span>
          <Button
            asChild
            size="sm"
            variant="link"
            className="text-primary px-0 hover:text-primary/80 h-11 sm:h-7"
          >
            <Link href="/tracker" prefetch>
              Open Tracker
            </Link>
          </Button>
        </div>
      </Card>
    </section>
  );
};

export default ApplicationPipeline;
