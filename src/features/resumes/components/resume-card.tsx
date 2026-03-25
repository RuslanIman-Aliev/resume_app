"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  FileText,
  Loader2,
  RefreshCcw,
  Target,
} from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";

const ResumeCard = () => {
  const trpc = useTRPC();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    trpc.resume.getAll.queryOptions(),
  );

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load resumes. Please try again.");
    }
  }, [isError, error]);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-10">
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-chart-2/15 blur-3xl" />

        <div className="relative flex min-h-56 flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 shadow-lg shadow-primary/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight">
              Building your resume command center
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fetching files, scores, and role signals...
            </p>
          </div>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-muted/70">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-destructive/40 bg-gradient-to-br from-destructive/10 via-card to-secondary/40 p-10">
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
      <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-primary/10 via-card to-chart-2/10 p-10">
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

  return (
    <section className="w-full  md:px-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {data?.resumes.map((resume) => (
          <Card key={resume.id} className=" w-full group">
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
              <div className="flex flex-col pb-5">
                <div>
                  <div className="w-full aspect-[1/1.4]  bg-muted border-b relative overflow-hidden">
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

                  <div className="mt-3 flex  justify-between">
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
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default ResumeCard;
