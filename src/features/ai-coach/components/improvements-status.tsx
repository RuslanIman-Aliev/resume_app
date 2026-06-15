import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";

type ImprovementsErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const ImprovementsSkeleton = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-6">
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-chart-2/15 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-12" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`filter-skeleton-${index}`}
                className="h-8 w-20 rounded-full"
              />
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`improvement-skeleton-${index}`}
              className="rounded-2xl border border-border/50 bg-card/60 p-5"
            >
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>

              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
              </div>

              <div className="mt-4 flex justify-end">
                <Skeleton className="h-9 w-40 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ImprovementsError = ({
  onRetry,
  isRetrying,
}: ImprovementsErrorProps) => {
  return (
    <FeedbackState
      status="error"
      layout="card"
      icon={<AlertTriangle className="h-7 w-7 text-destructive" />}
      title="We could not load improvement suggestions."
      description="Please try again in a moment."
      primaryAction={
        onRetry
          ? {
              label: isRetrying ? "Retrying..." : "Try again",
              onClick: onRetry,
              disabled: isRetrying,
              icon: isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              ),
              variant: "secondary",
            }
          : undefined
      }
    />
  );
};
