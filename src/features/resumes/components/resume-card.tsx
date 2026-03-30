"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  FileText,
  Loader2,
  RefreshCcw,
  Target,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ResumeCard = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.resume.getAll.queryOptions(),
  );

  const { mutate: analyzeResume, isPending } = useMutation(
    trpc.resume.triggerAnalysis.mutationOptions({
      onSuccess: (_data, variables) => {
        toast.success("Analysis started! This will take about 20 seconds.");
        router.push(`/ai-coach/${variables.resumeId}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start analysis");
        setAnalyzingId(null);
      },
    }),
  );

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load resumes. Please try again.");
    }
  }, [isError]);

  if (isLoading) {
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
  }

  if (isError) {
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
            onClick={() => refetch()}
            variant="secondary"
            className="gap-2"
            disabled={isFetching}
          >
            <RefreshCcw className="h-4 w-4" />
            Retry loading
          </Button>
        </div>
      </div>
    );
  }

  if (!data?.resumes || data.resumes.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-linear-to-br from-primary/10 via-card to-chart-2/10 p-10">
        <div className="pointer-events-none absolute -top-20 -left-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute right-6 bottom-2 h-40 w-40 rounded-full bg-chart-2/20 blur-3xl" />

        <div className="relative flex min-h-56 flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 shadow-lg shadow-primary/20">
            <FileText className="h-8 w-8 text-primary" />
          </div>

          <div>
            <p className="text-xl font-semibold tracking-tight">
              No resumes yet
            </p>
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
  }

  function handleClick(resumeId: string): void {
    setAnalyzingId(resumeId);
    analyzeResume({ resumeId });
  }

  return (
    <section className="w-full  md:px-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {data?.resumes.map((resume) => {
          const isAnalyzingCard = analyzingId === resume.id;

          return (
            <Card
              key={resume.id}
              className={`w-full group ${
                isAnalyzingCard
                  ? "ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                  : ""
              }`}
            >
              <CardHeader className="flex items-center justify-between">
                <div>
                  <Badge>{resume.status}</Badge>
                </div>
                {/* <div className="flex items-center gap-1">
                <SparklesIcon className="text-primary size-4" />
                <span className="text-lg text-primary">{resume.score}</span>
              </div> */}
              </CardHeader>
              <CardContent className="">
                <div className="flex flex-col pb-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer">
                        <div>
                          <div className="w-full aspect-[1/1.4] bg-muted border-b relative overflow-hidden">
                            {resume.resumePreviewLink ? (
                              <Image
                                src={resume.resumePreviewLink}
                                alt={`${resume.resumeName} preview`}
                                fill
                                className="object-cover object-top transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <FileText className="h-12 w-12 text-muted-foreground/50" />
                              </div>
                            )}
                            {isAnalyzingCard ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 text-primary shadow-sm">
                                  <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                                <div className="text-sm font-semibold">
                                  Analyzing resume
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  AI Coach is preparing insights.
                                </p>
                                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full w-full animate-pulse bg-linear-to-r from-transparent via-primary/70 to-transparent" />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="pt-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                              {resume.resumeName}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                              <Target className="h-3.5 w-3.5" />
                              {resume.postedRole}
                            </p>
                          </div>

                          <div className=" flex  justify-between">
                            <div className="flex flex-wrap gap-1.5">
                              {/* {resume.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resume.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{resume.tags.length - 2}
                        </Badge>
                      )} */}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(resume.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </DialogTrigger>

                    <DialogContent className="max-w-2xl! w-screen h-[95vh] p-0 overflow-hidden">
                      <DialogTitle className="sr-only">
                        {resume.resumeName} Document Viewer
                      </DialogTitle>
                      <div className="relative w-full aspect-[1/1.4] bg-muted my-7">
                        {resume.resumePreviewLink ? (
                          <Image
                            src={resume.resumePreviewLink}
                            fill
                            className="object-contain p-0"
                            alt={`${resume.resumeName} full preview`}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex justify-end ">
                  <Button
                    variant="outline"
                    size="lg"
                    className="ml-2 cursor-pointer gap-2"
                    onClick={() => handleClick(resume.id)}
                    disabled={isPending || analyzingId === resume.id}
                  >
                    {isAnalyzingCard ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Resume"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default ResumeCard;
