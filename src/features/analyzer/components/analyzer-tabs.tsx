"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  cn,
  getRelativeTime,
  getScoreColor,
  getStatusBadge,
} from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileTextIcon,
  RefreshCcw,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const AnalyzerTabs = () => {
  const trpc = useTRPC();
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [inputJobDescription, setInputJobDescription] = useState("");
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.resume.getResumesAndAnalyses.queryOptions(),
  );

  const orderedResumes = useMemo(() => {
    const resumes = data?.resumes ?? [];
    if (!selectedResumeId) {
      return resumes;
    }

    const selectedIndex = resumes.findIndex(
      (resume) => resume.id === selectedResumeId,
    );
    if (selectedIndex === -1) {
      return resumes;
    }

    const selected = resumes[selectedIndex];
    return [selected, ...resumes.filter((_, index) => index !== selectedIndex)];
  }, [data?.resumes, selectedResumeId]);

  const { mutate } = useMutation(
    trpc.resume.triggerJobMatchAnalysis.mutationOptions({}),
  );

  const handleClick = () => {
    mutate({
      resumeId: selectedResumeId!,
      jobDescription: inputJobDescription!,
    });
    toast.success("Analysis triggered successfully! It may take a few moments to complete.");
  };

  return (
    <Card className="w-full p-6">
      <CardHeader className="p-0">
        <div className="flex gap-2 items-center">
          <FileTextIcon className="size-6 text-primary" />
          <span className="text-lg font-semibold ">Job Description Input</span>
        </div>
        <div className="mt-2 text-muted-foreground">
          Paste the job description you want to analyze
        </div>
      </CardHeader>

      <Textarea
        placeholder="Paste the job description here..."
        className="min-h-75 max-h-100 resize-none bg-secondary/30 border-border/50 focus:border-primary/50"
        value={inputJobDescription}

        onChange={(e) => setInputJobDescription(e.target.value)}
      />

      <div className="mt-6 space-y-3">
        <h3 className="font-medium">Select your resume to compare</h3>

        <ScrollArea className="h-100 w-full rounded-md border border-border/50 bg-secondary/10 p-4">
          {isLoading ? (
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
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-base font-semibold">
                  Unable to load resumes
                </p>
                <p className="text-sm text-muted-foreground">
                  Please try again in a moment.
                </p>
              </div>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCcw
                  className={cn("h-4 w-4", isFetching && "animate-spin")}
                />
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {orderedResumes.map((resume) => {
                const latestAnalysis = resume.analysis?.[0];
                const isSelected = selectedResumeId === resume.id;

                return (
                  <div
                    key={resume.id}
                    onClick={() => setSelectedResumeId(resume.id)}
                    className={cn(
                      "relative cursor-pointer rounded-lg border p-4 transition-all hover:bg-secondary/50",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm"
                        : "border-border/50 bg-secondary/30",
                    )}
                  >
                    {isSelected && (
                      <div className="absolute right-4 top-4 text-primary">
                        <CheckCircle2 className="size-5" />
                      </div>
                    )}

                    <div className="flex flex-1 items-center gap-4 w-full">
                      <Avatar className="flex items-center justify-center rounded-lg bg-primary/10 h-12 w-12 text-sm font-bold text-primary">
                        <AvatarFallback className="text-primary h-12 w-12 shrink-0 rounded-lg bg-primary/10 text-sm">
                          <FileText className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 w-full min-w-0 pr-6">
                        <div className="flex justify-between items-center mb-1">
                          <div className="gap-2 flex items-center">
                            <span className="truncate font-semibold text-base">
                              {resume.postedRole
                                ? resume.postedRole.charAt(0).toUpperCase() +
                                  resume.postedRole.slice(1).toLowerCase()
                                : "Untitled Role"}
                            </span>
                            {getStatusBadge(resume.status)}
                          </div>

                          <div className="flex items-center gap-3">
                            {latestAnalysis?.keywords
                              ?.slice(0, 2)
                              .map((skill, index) => (
                                <Badge
                                  key={`keyword-${skill}-${index}`}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}

                            {(latestAnalysis?.keywords?.length ?? 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(latestAnalysis?.keywords?.length ?? 0) - 2}
                              </Badge>
                            )}

                            {latestAnalysis?.overallScore !== undefined && (
                              <div
                                className={cn(
                                  `${getScoreColor(latestAnalysis?.overallScore)} text-xl font-bold ml-2`,
                                )}
                              >
                                {latestAnalysis?.overallScore}%
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center gap-1 truncate max-w-50">
                              <span className="truncate">
                                {resume.resumeName
                                  ? resume.resumeName.charAt(0).toUpperCase() +
                                    resume.resumeName.slice(1).toLowerCase()
                                  : "Unnamed File"}
                              </span>
                            </div>
                            <span className="text-border">•</span>
                            <div className="flex items-center gap-1 truncate">
                              <span className="truncate">
                                Updated {getRelativeTime(resume.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <Button
        className="mt-4 p-5 w-full font-bold "
        disabled={!selectedResumeId || !inputJobDescription.trim()}
        onClick={handleClick}
      >
        <SparklesIcon className="size-4 mr-2" />
        Analyze Job Description
      </Button>
    </Card>
  );
};

export default AnalyzerTabs;
