import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, RefreshCcw } from "lucide-react";

type ResumeErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const ResumeError = ({ onRetry, isRetrying }: ResumeErrorProps) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-destructive/40 bg-linear-to-br from-destructive/10 via-card to-secondary/40 p-10">
      <div className="pointer-events-none absolute -top-16 left-8 h-44 w-44 rounded-full bg-destructive/20 blur-3xl" />

      <div className="relative flex min-h-56 flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/50 bg-destructive/15 shadow-lg shadow-destructive/20">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        <div>
          <p className="text-xl font-semibold tracking-tight">
            Resume feed is temporarily offline
          </p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            We couldn&apos;t load your resumes right now. Please retry in a
            moment.
          </p>
        </div>

        <Button
          onClick={onRetry}
          variant="secondary"
          className="gap-2"
          disabled={isRetrying || !onRetry}
        >
          <RefreshCcw className="h-4 w-4" />
          Retry loading
        </Button>
      </div>
    </div>
  );
};

export const ResumeLoading = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-8">
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-chart-2/15 blur-3xl" />

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card
              key={`resume-skeleton-${index}`}
              className="border border-border/50 bg-card/60"
            >
              <CardHeader className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-10" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="aspect-[1/1.4] w-full rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Skeleton className="h-10 w-32 rounded-md" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ResumeEmpty = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-linear-to-br from-primary/10 via-card to-chart-2/10 p-10">
      <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute right-6 bottom-2 h-40 w-40 rounded-full bg-chart-2/20 blur-3xl" />

      <div className="relative flex min-h-56 flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 shadow-lg shadow-primary/20">
          <FileText className="h-8 w-8 text-primary" />
        </div>

        <div>
          <p className="text-xl font-semibold tracking-tight">No resumes yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Upload your first resume to unlock AI scoring, role-fit insights,
            and improvement tracking.
          </p>
        </div>

        <Badge className="border-0 bg-primary/15 text-primary">
          Best results with PDF files
        </Badge>
      </div>
    </div>
  );
};
