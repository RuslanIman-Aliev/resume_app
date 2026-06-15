import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCcw } from "lucide-react";

type TrackerErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const TrackerLoading = () => {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-5 w-md max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, index) => (
          <Card
            key={`tracker-stat-skeleton-${index}`}
            className="border-border/50 bg-card/50"
          >
            <CardContent className="space-y-2 p-3 text-center">
              <Skeleton className="mx-auto h-8 w-12" />
              <Skeleton className="mx-auto h-3 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-card/30 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-11 w-full sm:w-80" />
          <div className="flex gap-3">
            <Skeleton className="h-11 w-11 rounded-md" />
            <Skeleton className="h-11 w-11 rounded-md" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-nowrap gap-6 overflow-x-auto pb-8">
        {Array.from({ length: 6 }).map((_, columnIndex) => (
          <Card
            key={`tracker-column-skeleton-${columnIndex}`}
            className="w-87.5 shrink-0 border-border/50 bg-card/20"
          >
            <CardHeader className="space-y-3 pb-4 pt-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div
                  key={`tracker-card-skeleton-${columnIndex}-${cardIndex}`}
                  className="space-y-3 rounded-xl border border-border/50 bg-secondary/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const TrackerError = ({ onRetry, isRetrying }: TrackerErrorProps) => {
  return (
    <FeedbackState
      status="error"
      layout="card"
      className="mt-4"
      icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
      title="Unable to load applications"
      description="Please try again in a moment."
      primaryAction={
        onRetry
          ? {
              label: "Retry",
              onClick: onRetry,
              disabled: isRetrying,
              icon: (
                <RefreshCcw
                  className={isRetrying ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                />
              ),
              variant: "secondary",
            }
          : undefined
      }
    />
  );
};
