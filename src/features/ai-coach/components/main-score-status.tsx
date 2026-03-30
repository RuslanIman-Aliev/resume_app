import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2 } from "lucide-react";

export const MainScoreSkeleton = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-8">
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-chart-2/15 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border/50 bg-card/60 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-center">
              <div className="relative h-44 w-44">
                <div className="absolute inset-0 rounded-full border border-border/60 bg-muted/60" />
                <div className="absolute inset-4 rounded-full border border-border/60 bg-background/70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`coach-loading-${index}`}
            className="rounded-xl border border-border/50 bg-card/60 p-5"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-10" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MainScorePending = () => {
  const analysisSteps = [
    {
      title: "Parsing resume sections",
      detail: "Extracting experience, skills, and keywords.",
    },
    {
      title: "Scoring for the role",
      detail: "Matching content with the target role requirements.",
    },
    {
      title: "Drafting improvements",
      detail: "Preparing quick wins and action items.",
    },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-linear-to-br from-primary/10 via-card to-secondary/20 p-8">
      <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-chart-2/20 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                AI Coach is analyzing your resume
              </p>
              <p className="text-sm text-muted-foreground">
                Keep this tab open. Results will appear automatically.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Live status</p>
              <Badge className="border-0 bg-primary/15 text-primary">
                In progress
              </Badge>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-full animate-pulse bg-linear-to-r from-transparent via-primary/70 to-transparent" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Usually ready in about 20 seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>We will refresh automatically when analysis is done.</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/60 p-5">
          <p className="text-sm font-medium">What is happening now</p>
          <div className="mt-4 space-y-3">
            {analysisSteps.map((step) => (
              <div
                key={step.title}
                className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/60 p-3"
              >
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/70 animate-pulse" />
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MainScoreError = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-destructive/40 bg-linear-to-br from-destructive/10 via-card to-secondary/20 p-8">
      <div className="pointer-events-none absolute -top-16 left-8 h-44 w-44 rounded-full bg-destructive/20 blur-3xl" />

      <div className="relative flex min-h-48 flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/15">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="text-lg font-semibold">
            We could not load this analysis.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Please try again in a moment.
          </p>
        </div>
        <Button
          variant="secondary"
          className="gap-2"
          // onClick={() => refetch()}
          //disabled={isFetching}
        >
          {/* {isFetching ? ( */}
          <Loader2 className="h-4 w-4 animate-spin" />
          {/* // ) : (
                //   <RefreshCcw className="h-4 w-4" />
                // )} */}
          Try again
        </Button>
      </div>
    </div>
  );
};
