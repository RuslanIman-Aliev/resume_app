import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, RefreshCcw } from "lucide-react";

type ResumeErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const ResumeError = ({ onRetry, isRetrying }: ResumeErrorProps) => {
  return (
    <FeedbackState
      status="error"
      layout="card"
      icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
      title="Resume feed is temporarily offline"
      description="We couldn't load your resumes right now. Please retry in a moment."
      primaryAction={
        onRetry
          ? {
              label: "Retry loading",
              onClick: onRetry,
              disabled: isRetrying,
              icon: <RefreshCcw className="h-4 w-4" />,
              variant: "secondary",
            }
          : undefined
      }
    />
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
    <FeedbackState
      status="default"
      layout="card"
      icon={<FileText className="h-8 w-8 text-primary" />}
      title="No resumes yet"
      description="Upload your first resume to unlock AI scoring, role-fit insights, and improvement tracking."
      extra={
        <Badge className="border-0 bg-primary/15 text-primary">
          Best results with PDF files
        </Badge>
      }
    />
  );
};
