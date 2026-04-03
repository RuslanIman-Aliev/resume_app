"use client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cn,
  getRelativeTime,
  getScoreColor,
  getStatusBadge,
} from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileText, RefreshCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RecentAnalyses = () => {
  const trpc = useTRPC();
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.resume.getLatestAnalyses.queryOptions(),
  );

  if (isLoading) {
    return (
      <section>
        <Card className="p-6">
          <div className="mb-4">
            <Skeleton className="h-5 w-36" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`recent-analysis-skeleton-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-4"
              >
                <Skeleton className="h-11 w-11 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-12 rounded-full" />
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
        </Card>
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-base font-semibold">
                Unable to load recent analyses
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
        </Card>
      </section>
    );
  }
  return (
    <section>
      <Card className="p-6">
        <h1 className="text-lg font-bold mb-2">Recent Analyses</h1>
        <ScrollArea className="h-100 w-full rounded-md border border-border/50 bg-secondary/10 p-4">
          {data?.analyses.map(
            (
              {
                resume: { id, resumeName, postedRole, status },
                overallScore,
                createdAt,
                keywords,
              },
              index,
            ) => (
              <div
                key={`recent-analysis-${id}-${index}`}
                className="cursor-pointer"
                onClick={() => router.push(`/ai-coach/${id}`)}
              >
                <div className="flex  mb-4  items-center gap-3 w-full rounded-lg border border-border/50 bg-secondary/30 p-4 transition-all hover:border-border hover:bg-secondary/50">
                  <Avatar className="flex  items-center justify-center rounded-lg bg-primary/10 h-11 w-11 text-sm font-bold text-primary">
                    <AvatarFallback className="text-primary h-11 w-11 shrink-0 rounded-lg bg-primary/10 text-sm">
                      <FileText className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="w-full">
                    <div className="flex justify-between">
                      <div className="gap-2 flex items-center">
                        <span className="truncate font-medium text-sm">
                          {postedRole
                            ? postedRole.charAt(0).toUpperCase() +
                              postedRole.slice(1).toLowerCase()
                            : ""}
                        </span>
                        {getStatusBadge(status)}
                      </div>
                      <div className="flex items-center gap-4">
                        {keywords.slice(0, 2).map((skill, index) => (
                          <Badge
                            key={`keyword-${skill}-${index}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {keywords.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{keywords.length - 2}
                          </Badge>
                        )}
                        <div
                          className={cn(
                            `${getScoreColor(overallScore)} text-2xl font-bold`,
                          )}
                        >
                          {overallScore}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground ">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1 truncate">
                          <span className="truncate ">
                            {resumeName
                              ? resumeName.charAt(0).toUpperCase() +
                                resumeName.slice(1).toLowerCase()
                              : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 truncate">
                          <span className="truncate">
                            {getRelativeTime(createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-muted-foreground">match</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}
          
        </ScrollArea>
        <div className=" flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm">
              Analyze more jobs to improve your match accuracy
            </span>
            <Link href="/resumes">
              <Button
                size="sm"
                variant="link"
                className="text-primary px-0 hover:text-primary/80"
              >
                Analyze Now
              </Button>
            </Link>
          </div>
      </Card>
    </section>
  );
};

export default RecentAnalyses;
