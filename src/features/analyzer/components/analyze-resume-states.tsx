import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FeedbackState } from "@/components/ui/feedback-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Cpu, FileSearch, Loader2, RefreshCcw, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

type AnalyzeResumeErrorProps = {
  onRetry?: () => void;
  isRetrying?: boolean;
};

export const AnalyzeResumeLoading = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

const analyzingSteps = [
  { icon: FileSearch, title: "Reading Job Description", desc: "Extracting core requirements and keywords" },
  { icon: Target, title: "Analyzing Resume", desc: "Mapping your experience to the role" },
  { icon: Cpu, title: "Evaluating Skills Gap", desc: "Identifying missing technical and soft skills" },
  { icon: Sparkles, title: "Generating Insights", desc: "Calculating match score and improvements" },
];

export const AnalyzeResumePending = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((current) =>
        current < analyzingSteps.length - 1 ? current + 1 : current,
      );
    }, 8500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] py-12 px-4 animate-in fade-in duration-700">
      
      <div className="relative mb-8">
        <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse" />
        <div className="bg-background border-2 border-primary/30 p-5 rounded-full relative shadow-[0_0_40px_-10px_rgba(var(--primary),0.3)]">
          <Sparkles className="h-10 w-10 text-primary animate-pulse" />
        </div>
      </div>
      
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-3xl font-bold tracking-tight">Analyzing Your Match</h2>
        <p className="text-muted-foreground max-w-125 mx-auto text-sm md:text-base">
          Our AI is performing a deep-dive comparison between your resume and the job posting. This thorough analysis takes about 30-45 seconds.
        </p>
      </div>

      <div className="w-full max-w-2xl grid sm:grid-cols-2 gap-4 mb-8">
        {analyzingSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === activeStep;
          const isCompleted = index < activeStep;

          return (
            <Card
              key={step.title}
              className={`transition-all duration-500 border ${
                isActive 
                  ? "bg-primary/10 border-primary/50 shadow-sm scale-[1.02]" 
                  : isCompleted 
                  ? "bg-card/50 border-border/50 opacity-70" 
                  : "bg-background border-border/30 opacity-40"
              }`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-full ${isActive ? "bg-primary/20 text-primary" : isCompleted ? "bg-green-500/20 text-green-500" : "bg-secondary text-muted-foreground"}`}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="space-y-1">
                  <p className={`font-semibold text-sm ${isActive ? "text-primary" : "text-foreground"}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-sm font-medium text-primary bg-primary/10 border border-primary/20 py-2.5 px-5 rounded-full shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{analyzingSteps[activeStep].title}...</span>
      </div>

    </div>
  );
};

/**
 * Shown when the job-match run failed or stopped responding.
 *
 * Separate from `AnalyzeResumeError`, which covers a failed read: this one says
 * the run is over and produced nothing. Retrying re-queues the same
 * application, so the job description the user pasted is not lost.
 *
 * @param onRetry - Re-runs the analysis for this application.
 * @param isRetrying - Disables the button while the run is being queued.
 * @param timedOut - Copy for the case where nothing reported a failure but the
 *   wait has passed the cap.
 */
export const AnalyzeResumeFailed = ({
  onRetry,
  isRetrying,
  timedOut,
}: AnalyzeResumeErrorProps & { timedOut?: boolean }) => {
  return (
    <FeedbackState
      status="error"
      layout="card"
      icon={<AlertTriangle className="h-7 w-7 text-destructive" />}
      title={
        timedOut
          ? "This match analysis is taking longer than expected."
          : "We could not finish this match analysis."
      }
      description={
        timedOut
          ? "It has not finished in the time it normally takes. You can run it again - the job description you pasted is saved."
          : "The AI response could not be processed. Running it again usually fixes it, and the job description you pasted is saved."
      }
      primaryAction={
        onRetry
          ? {
              label: isRetrying ? "Starting..." : "Run analysis again",
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
