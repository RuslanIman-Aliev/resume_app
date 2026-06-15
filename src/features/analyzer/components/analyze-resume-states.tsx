import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCcw } from "lucide-react";

type AnalyzeResumeErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const AnalyzeResumeLoading = () => {
  return (
    <div className="space-y-6">
      <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={`resume-result-skeleton-${index}`}
            className="border-border/50 bg-card/50 backdrop-blur"
          >
            <CardContent className="py-3">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/30 bg-linear-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card
            key={`resume-section-skeleton-${index}`}
            className="border-border/50 bg-card/50 backdrop-blur py-6"
          >
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={`resume-line-skeleton-${index}-${rowIndex}`}
                  className="flex items-center gap-3"
                >
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur py-6">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton
                  key={`resume-keyword-skeleton-${index}`}
                  className="h-7 w-20 rounded-full"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-linear-to-r from-primary/5 to-transparent">
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`resume-suggestion-skeleton-${index}`}
                className="flex items-start gap-3"
              >
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const AnalyzeResumeError = ({
  onRetry,
  isRetrying,
}: AnalyzeResumeErrorProps) => {
  return (
    <FeedbackState
      status="error"
      layout="inline"
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-8"
      icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
      title="Unable to load analysis"
      description="Please try again in a moment."
      primaryAction={
        onRetry
          ? {
              label: "Retry",
              onClick: onRetry,
              disabled: isRetrying,
              icon: (
                <RefreshCcw
                  className={cn("h-4 w-4", isRetrying && "animate-spin")}
                />
              ),
              variant: "secondary",
            }
          : undefined
      }
    />
  );
};
