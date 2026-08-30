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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResumePagination } from "@/components/resume-pagination";
import { useUrlPage } from "@/hooks/use-url-page";
import { getErrorFeedback } from "@/lib/error-feedback";
import { formatRoleLabel } from "@/lib/format";
import { parseResumeStatusFilter } from "@/lib/resume-status";
import { getStatusBadge } from "@/lib/ui-config";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Download,
  FileDown,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Target,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferRouterOutputs } from "@trpc/server";
import { ResumeEmpty, ResumeError, ResumeLoading } from "./resume-states";

/**
 * Shape held by every cached `resume.getAll` page. The optimistic rename patch
 * rewrites entries of this type in place, so it is derived from the router
 * rather than hand-written — a change to the procedure surfaces here.
 */
type ResumeListData = inferRouterOutputs<AppRouter>["resume"]["getAll"];

/**
 * Whether the stored file is already a PDF.
 *
 * When it is, "Download" and "Download PDF" would hand back the same bytes, so
 * the menu shows a single entry instead of two that do the same thing.
 */
const isStoredAsPdf = (fileName: string | null) =>
  (fileName ?? "").toLowerCase().endsWith(".pdf");

// The document editor pulls in Syncfusion, so it loads only when a card is
// actually opened rather than with the resumes list.
const AnalyzeOriginalResume = dynamic(
  () =>
    import("@/features/analyzer/components/analyze-original-resume").then(
      (mod) => mod.AnalyzeOriginalResume,
    ),
  { ssr: false },
);

const ResumeCard = () => {
  const trpc = useTRPC();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { page: currentPage, setPage: handlePageChange } = useUrlPage();

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);
  const [modalResumeId, setModalResumeId] = useState<string | null>(null);

  const [resumeToDelete, setResumeToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [resumeToRename, setResumeToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Lets the submit handler put focus back on the field when validation
  // rejects the name, instead of leaving the dialog with nothing focused.
  const renameInputRef = useRef<HTMLInputElement>(null);

  const searchTerm = searchParams.get("search") || undefined;
  // Parsed rather than passed through: `getAll` now validates the filter as
  // an enum, and an unrecognised `?status=` must fall back to "all" instead
  // of failing the query. The resumes page prefetch parses it the same way.
  const statusFilter = parseResumeStatusFilter(
    searchParams.get("status") ?? undefined,
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    trpc.resume.getAll.queryOptions({ page: currentPage, search: searchTerm, status: statusFilter }),
  );

  const { mutate: deleteResume, isPending: isDeleting } = useMutation(
    trpc.resume.deleteResume.mutationOptions({
      onSuccess: () => {
        toast.success("Resume deleted successfully!");
        setResumeToDelete(null);
      },
      onError: (error) => {
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to delete resume.",
          }).message,
        );
        setResumeToDelete(null);
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.resume.getAll.queryKey(),
        });
        // Keeps the analyzer picker and the sidebar from listing a resume that
        // no longer exists, or listing it under its old name.
        queryClient.invalidateQueries({
          queryKey: trpc.resume.getResumesAndAnalyses.queryKey(),
        });
      },
    }),
  );

  const { mutate: renameResume, isPending: isRenaming } = useMutation(
    trpc.resume.rename.mutationOptions({
      // Patch every cached `getAll` page so the new name shows up immediately,
      // and hand the previous snapshot to onError for the rollback.
      onMutate: async (variables) => {
        const queryKey = trpc.resume.getAll.queryKey();
        await queryClient.cancelQueries({ queryKey });

        const previous = queryClient.getQueriesData<ResumeListData>({
          queryKey,
        });

        queryClient.setQueriesData<ResumeListData>({ queryKey }, (old) => {
          if (!old) return old;
          return {
            ...old,
            resumes: old.resumes.map((item) =>
              item.id === variables.resumeId
                ? { ...item, resumeName: variables.resumeName }
                : item,
            ),
          };
        });

        return { previous };
      },
      onSuccess: () => {
        toast.success("Resume renamed successfully!");
        setResumeToRename(null);
      },
      onError: (error, _variables, context) => {
        // Put back exactly what each cache entry held before the patch.
        for (const [key, snapshot] of context?.previous ?? []) {
          queryClient.setQueryData(key, snapshot);
        }
        toast.error(
          getErrorFeedback(error, {
            fallbackMessage: "Failed to rename resume.",
          }).message,
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.resume.getAll.queryKey(),
        });
        // Keeps the analyzer picker and the sidebar from listing a resume that
        // no longer exists, or listing it under its old name.
        queryClient.invalidateQueries({
          queryKey: trpc.resume.getResumesAndAnalyses.queryKey(),
        });
      },
    }),
  );

  const submitRename = () => {
    if (!resumeToRename) return;

    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Resume name cannot be empty.");
      renameInputRef.current?.focus();
      return;
    }

    // Nothing changed — close without spending a request.
    if (trimmed === resumeToRename.name) {
      setResumeToRename(null);
      return;
    }

    renameResume({ resumeId: resumeToRename.id, resumeName: trimmed });
  };

  useEffect(() => {
    if (!data?.resumes?.length) return;

    router.prefetch("/analyzer");
    for (const resume of data.resumes.slice(0, 3)) {
      router.prefetch(`/ai-coach/${resume.id}`);
    }
  }, [data?.resumes, router]);

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
          // Epoch milliseconds: the coach page reads this with `Number(...)` to
          // decide when a run has been waiting too long, and a formatted date
          // string parsed that way is NaN, which disabled the timeout entirely.
          ts: new Date().getTime().toString(),
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

  /**
   * Downloads the resume as PDF, converting it server-side when the stored file
   * is a DOCX.
   *
   * The blob comes back from our own route rather than from UploadThing, so the
   * file name and content type are the ones the route sets - a direct link to
   * the stored DOCX would save a .docx no matter what the anchor asked for.
   */
  const handleDownloadPdf = async (resumeId: string) => {
    setExportingPdfId(resumeId);
    let blobUrl: string | null = null;

    try {
      const response = await fetch("/api/resume/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Failed to export the resume as PDF.");
      }

      const blob = await response.blob();
      blobUrl = window.URL.createObjectURL(blob);

      // The route already decided the file name; mirror it so the save dialog
      // and the Content-Disposition header cannot disagree.
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const nameMatch = disposition.match(/filename="([^"]+)"/);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = nameMatch?.[1] ?? "resume.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "Failed to export the resume as PDF.",
        }).message,
      );
    } finally {
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
      setExportingPdfId(null);
    }
  };

  const pageCount = data?.pagination?.pageCount ?? 1;
  const activePage = data?.pagination?.currentPage ?? currentPage;

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
    <section className="w-full px-4 sm:px-6 md:px-10">
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
                  <div>{getStatusBadge(resume.status)}</div>
                </CardHeader>
                <CardContent className="">
                  <div className="flex flex-col pb-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer">
                          <div>
                            <div className="w-full aspect-[1/1.4] max-h-64 sm:max-h-none bg-muted border-b relative overflow-hidden">
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
                                  className="size-11 shrink-0 sm:size-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="cursor-pointer min-h-11 sm:min-h-0"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    handleDownload(
                                      resume.resumeLink,
                                      resume.resumeName!,
                                    );
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  {isStoredAsPdf(resume.fileName)
                                    ? "Download"
                                    : "Download DOCX"}
                                </DropdownMenuItem>
                                {isStoredAsPdf(resume.fileName) ? null : (
                                  <DropdownMenuItem
                                    className="cursor-pointer min-h-11 sm:min-h-0"
                                    disabled={exportingPdfId === resume.id}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleDownloadPdf(resume.id);
                                    }}
                                  >
                                    {exportingPdfId === resume.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <FileDown className="h-4 w-4 mr-2" />
                                    )}
                                    Download PDF
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="cursor-pointer min-h-11 sm:min-h-0"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    const currentName = resume.resumeName ?? "";
                                    setResumeToRename({
                                      id: resume.id,
                                      name: currentName,
                                    });
                                    setRenameValue(currentName);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />

                                {/* 3. Update Dropdown logic to open the modal instead of instantly deleting */}
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setResumeToDelete({
                                      id: resume.id,
                                      name: resume.resumeName || "this resume",
                                    });
                                  }}
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer min-h-11 sm:min-h-0"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                            <Target className="h-3.5 w-3.5" />
                            {formatRoleLabel(resume.postedRole)}
                          </p>
                        </div>

                        <div className=" flex  justify-between">
                          <div className="flex flex-wrap gap-1.5"></div>
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

                      <DialogContent className="sm:max-w-5xl! w-full h-[95dvh] overflow-y-auto p-4 sm:p-6 [&>[data-slot=dialog-close]]:size-11 sm:[&>[data-slot=dialog-close]]:size-7">
                        <DialogTitle className="sr-only">
                          {resume.resumeName} Resume Editor
                        </DialogTitle>
                        {/* Opening a card used to show the first-page snapshot,
                            which was read-only. It now opens the same editor as
                            the analyzer's "Original resume" tab, so the document
                            can be edited and saved back to the stored file.
                        <div className="relative w-full aspect-[1/1.4] bg-muted my-7">
                          {resume.resumePreviewLink ? (
                            <Image
                              src={resume.resumePreviewLink}
                              fill
                              sizes="(min-width: 640px) 672px, 100vw"
                              className="object-contain p-0"
                              alt={`${resume.resumeName} full preview`}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileText className="h-12 w-12 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        */}
                        <AnalyzeOriginalResume resumeId={resume.id} />
                      </DialogContent>
                    </Dialog>
                  </div>
                  {resume.status === "ANALYZED" ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-11 w-full sm:h-9 sm:w-auto"
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
                        className="h-11 w-full sm:h-9 sm:w-auto"
                        onClick={() => setModalResumeId(resume.id)}
                        disabled={isPending || analyzingId === resume.id}
                      >
                        {isAnalyzingCard ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
                        className="h-11 w-full sm:h-9 sm:w-auto"
                        onClick={() => handleClick(resume.id)}
                        disabled={isPending || analyzingId === resume.id}
                      >
                        {isAnalyzingCard ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
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

              {/* Re-analyze Modal */}
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
                    <AlertDialogCancel className="rounded-full h-11 sm:h-8">
                      Not now
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-full h-11 sm:h-8"
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

      {/* Rename dialog, pre-filled with the current display name. */}
      <Dialog
        open={!!resumeToRename}
        onOpenChange={(open) => {
          // Esc and outside-click both route through here; block them mid-flight
          // so the dialog cannot vanish while the mutation is still running.
          if (!open && !isRenaming) {
            setResumeToRename(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename resume</DialogTitle>
            <DialogDescription>
              This changes the display name only. The uploaded file and its
              download link stay exactly as they are.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="resume-rename-input">Resume name</Label>
              <Input
                id="resume-rename-input"
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                disabled={isRenaming}
                maxLength={120}
                autoFocus
                placeholder="e.g. Frontend Engineer 2026"
                className="h-11 sm:h-10"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isRenaming}
                onClick={() => setResumeToRename(null)}
                className="h-11 sm:h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRenaming || !renameValue.trim()}
                className="h-11 sm:h-8"
              >
                {isRenaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. The centralized Delete Confirmation Modal */}
      <AlertDialog
        open={!!resumeToDelete}
        onOpenChange={(open) => {
          // Prevent closing the modal by clicking outside while it is actively deleting
          if (!open && !isDeleting) {
            setResumeToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{resumeToDelete?.name}</strong> and remove all associated
              data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="h-11 sm:h-8">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault(); // Keep modal open until the mutation succeeds/fails
                if (resumeToDelete) {
                  deleteResume({ resumeId: resumeToDelete.id });
                }
              }}
              className="h-11 sm:h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Resume"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ResumePagination
        currentPage={activePage}
        pageCount={pageCount}
        onPageChange={handlePageChange}
      />
    </section>
  );
};

export default ResumeCard;
