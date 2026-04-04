import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <p className="text-base font-semibold">Unable to load resumes</p>
        <p className="text-sm text-muted-foreground">
          Please try again in a moment.
        </p>
      </div>
      <Button
        variant="secondary"
        className="gap-2"
        onClick={onRetry}
        disabled={isRetrying || !onRetry}
      >
        <RefreshCcw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
        Retry
      </Button>
    </div>
  );
};
