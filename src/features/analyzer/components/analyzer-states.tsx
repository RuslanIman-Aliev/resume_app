import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackState } from "@/components/ui/feedback-state";
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export const AnalyzerLoading = () => {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`resume-skeleton-${index}`}
          className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-4"
        >
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
type AnalyzerErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const AnalyzerError = ({ onRetry, isRetrying }: AnalyzerErrorProps) => {
  return (
    <FeedbackState
      status="error"
      layout="inline"
      icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
      title="Unable to load resumes"
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
