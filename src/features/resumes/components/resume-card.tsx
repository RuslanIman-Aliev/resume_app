"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  SparklesIcon,
  Target,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ResumeEmpty, ResumeError, ResumeLoading } from "./resume-states";
import { getErrorFeedback } from "@/lib/error-feedback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ResumeCard = () => {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { replace } = useRouter();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [modalResumeId, setModalResumeId] = useState<string | null>(null);
  const currentPage = Number(searchParams.get("page")) || 1;

  const handlePageChange = useCallback(
    (pageNumber: number) => {
      const params = new URLSearchParams(searchParams);
      params.set("page", pageNumber.toString());
      replace(`${pathname}?${params.toString()}`, { scroll: true });
    },
    [searchParams, pathname, replace],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.resume.getAll.queryOptions({ page: currentPage }),
  );

  useEffect(() => {
    if (!data?.resumes?.length) return;

    router.prefetch("/analyzer");
    for (const resume of data.resumes.slice(0, 3)) {
      router.prefetch(`/ai-coach/${resume.id}`);
    }
  }, [data?.resumes, router]);

  // When the server clamps an out-of-range page, redirect the URL to match
  useEffect(() => {
    if (
      data?.pagination?.currentPage &&
      data.pagination.currentPage !== currentPage
    ) {
      handlePageChange(data.pagination.currentPage);
    }
  }, [data?.pagination?.currentPage, currentPage, handlePageChange]);

  const { mutate: analyzeResume, isPending } = useMutation(
    trpc.resume.triggerAnalysis.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.removeQueries({
          queryKey: trpc.resume.getAnalysisResult.queryOptions({
            resumeId: variables.resumeId,
          }).queryKey,
        });

        queryClient.removeQueries({
          queryKey: trpc.resume.getImprovements.queryOptions({
            resumeId: variables.resumeId,
          }).queryKey,
        });

        toast.success("Analysis started! This will take about 20 seconds.");

        const analysisParams = new URLSearchParams({
          analysis: "1",
          ts: new Date().toString(),
        });
        router.push(`/ai-coach/${variables.resumeId}?${analysisParams}`);
      },
      onError: (error) => {
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to start analysis",
          }).message,
        );
        setAnalyzingId(null);
      },
    }),
  );

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const pageCount = data?.pagination?.pageCount ?? 1;

  if (isLoading) {
    return <ResumeLoading />;
  }

  if (isError) {
    return <ResumeError onRetry={refetch} isRetrying={isFetching} />;
  }

  if (data?.pagination?.totalCount === 0) {
    return <ResumeEmpty />;
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
            <Fragment key={resume.id}>
              <Card
                className={`w-full group ${
                  isAnalyzingCard
                    ? "ring-2 ring-primary/30 shadow-lg shadow-primary/10"
                    : ""
                }`}
              >
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <Badge>{resume.status}</Badge>
                    {/* <div className="flex items-center gap-1">
                <SparklesIcon className="text-primary size-4" />
                <span className="text-lg text-primary">{resume.matchScore}</span>
              </div> */}
                  </div>
                  {/*  */}
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
                                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                  loading="lazy"
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
                        </div>
                      </DialogTrigger>

                      <div className="pt-2">
                        <div className="min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-lg truncate">
                              {resume.resumeName}
                            </h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleDownload(
                                      resume.resumeLink,
                                      resume.resumeName!,
                                    );
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                  {resume.status === "ANALYZED" ? (
                    <div className="flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => router.push(`/ai-coach/${resume.id}`)}
                        onMouseEnter={() =>
                          router.prefetch(`/ai-coach/${resume.id}`)
                        }
                        onFocus={() =>
                          router.prefetch(`/ai-coach/${resume.id}`)
                        }
                        disabled={isPending || analyzingId === resume.id}
                      >
                        See Resume Insights &rarr;
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setModalResumeId(resume.id)}
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
                  ) : (
                    <div className="flex justify-end ">
                      <Button
                        variant="outline"
                        size="lg"
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
                  )}
                </CardContent>
              </Card>
              <AlertDialog
                open={modalResumeId === resume.id}
                onOpenChange={(open) => {
                  if (!open) setModalResumeId(null);
                }}
              >
                <AlertDialogContent className=" overflow-hidden rounded-[20px] border border-white/10 bg-background/70 p-6 sm:max-w-md shadow-[0_30px_90px_-55px_hsl(var(--primary)/0.65)] ring-1 ring-white/10 backdrop-blur-xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-90 data-open:slide-in-from-bottom-6 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:slide-out-to-bottom-6">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[20px] bg-[conic-gradient(from_180deg_at_50%_50%,hsl(var(--primary)/0.55),transparent_30%,hsl(var(--secondary)/0.45),transparent_60%,hsl(var(--primary)/0.55))] opacity-70 animate-[spin_14s_linear_infinite]"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0.5 rounded-[18px] bg-linear-to-br from-background/95 via-background/80 to-secondary/20"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/70 to-transparent opacity-70 animate-pulse"
                  />
                  <AlertDialogHeader className="relative z-10 gap-3 place-items-start text-left">
                    <div className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]">
                      Re-analysis
                    </div>
                    <AlertDialogTitle className="text-xl tracking-tight">
                      Re-analyze {resume.resumeName || "this resume"}?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      You have already analyzed this resume. Re-analyzing will
                      update the score and overwrite previous insights based on
                      your latest edits.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="relative z-10 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                    Takes about 20 seconds. We will refresh automatically.
                  </div>

                  <AlertDialogFooter className="relative z-10 mx-0 mb-0 border-0 bg-transparent p-0 pt-3">
                    <AlertDialogCancel className="rounded-full">
                      Not now
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-full"
                      onClick={() => {
                        handleClick(resume.id);
                        setModalResumeId(null);
                      }}
                    >
                      Re-analyze
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </Fragment>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className="mt-8 mb-4 border-t pt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: pageCount }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      onClick={() => handlePageChange(pageNumber)}
                      isActive={currentPage === pageNumber}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    handlePageChange(Math.min(currentPage + 1, pageCount))
                  }
                  className={
                    currentPage === pageCount
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </section>
  );
};

export default ResumeCard;
