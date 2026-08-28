"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorFeedback } from "@/lib/error-feedback";
import { delay } from "@/lib/sfdt/delay";
import { extractSfdtPayload } from "@/lib/sfdt/payload";
import { saveEditorDocx } from "@/lib/sfdt/resume-docx-api";
import { getInsertionPreview } from "@/lib/sfdt/text";
import {
  applySuggestionToEditor,
  applySuggestionViaSfdtRewrite,
  clearEditorSearchHighlights,
  forceEditorRender,
  highlightSuggestionInEditor,
  tryOpenVariants,
  waitForContainerReady,
} from "@/lib/syncfusion/document-editor";
import type { DocumentEditorLike } from "@/lib/syncfusion/document-editor-types";
import "@/lib/syncfusion/setup";
import { ApplicationData, ImprovementTip } from "@/lib/types";
import { getScoreColor } from "@/lib/format";
import { getPriorityStyles } from "@/lib/ui-config";
import { useTRPC } from "@/trpc/client";
import { DocumentEditorContainerComponent } from "@syncfusion/ej2-react-documenteditor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  CircleDot,
  Copy,
  Loader2,
  Wand2,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyDataCard } from "./empty-data-card";

const SYNCFUSION_THEME_URL =
  "https://cdn.syncfusion.com/ej2/33.2.3/material.css";

const AnalyzeResumeImprovements = ({
  data,
  resumeId,
  applicationId,
}: {
  data: ApplicationData;
  resumeId: string;
  applicationId?: string;
}) => {
  const improvementsList = data.improvements || [];
  const currentScore = data.matchScore;
  const improvedScore = data.summary?.estimatedScoreWithAllImprovements;
  const hasImprovedScore = improvedScore != null;
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [pendingImprovement, setPendingImprovement] =
    useState<ImprovementTip | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);

  // --- REFS ADDED HERE ---
  const editorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const lastLoadedResumeLinkRef = useRef<string | null>(null);
  const fetchingUrlRef = useRef<string | null>(null);

  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // True when the editor holds the plain-text fallback instead of the converted
  // DOCX. Applying a suggestion writes the editor back over the stored file, so
  // saving from this state would replace the formatted resume with plain text.
  const [isFallbackContent, setIsFallbackContent] = useState(false);

  const { data: parsedResumeData, isLoading: isParsedResumeLoading } = useQuery(
    {
      ...trpc.resume.getParsedContent.queryOptions({ resumeId }),
      enabled: isEditorDialogOpen,
      staleTime: 2 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  type MaybeResumeWithLink = {
    parsedContent?: string | null;
    resumeName?: string | null;
    postedRole?: string | null;
    resumeLink?: string | null;
  };

  const resumeLink = (
    parsedResumeData?.resume as MaybeResumeWithLink | undefined
  )?.resumeLink;
  const parsedResumeText = parsedResumeData?.resume?.parsedContent ?? "";
  const isDocumentOverlayLoading = !isDocumentReady && isDocumentLoading;

  const isSuggestionLoading = !!pendingImprovement && isParsedResumeLoading;
  const { mutateAsync: applyImprovement } = useMutation(
    trpc.resume.applyImprovement.mutationOptions(),
  );

  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    const documentEditor = editorRef.current?.documentEditor as
      | DocumentEditorLike
      | undefined;

    if (!documentEditor) {
      return;
    }

    documentEditor.serviceUrl = "";
    documentEditor.serverActionSettings = { import: "/api/Import" };

    try {
      if (documentEditor.documentEditorSettings) {
        documentEditor.documentEditorSettings.optimizeSfdt = false;
        documentEditor.documentEditorSettings.searchHighlightColor =
          "rgba(167, 243, 208, 0.8)";
      }
    } catch {
      // ignore
    }

    documentEditor.documentLoadFailed = (args) => {
      console.warn("[DocumentEditor] load failed:", args?.status);
    };
  }, [isEditorReady]);

  useEffect(() => {
    if (!isEditorDialogOpen) {
      return;
    }

    const documentEditor = editorRef.current?.documentEditor as
      | DocumentEditorLike
      | undefined;

    if (!documentEditor) {
      return;
    }

    clearEditorSearchHighlights(documentEditor);
    if (
      !pendingImprovement?.beforeText ||
      isParsedResumeLoading ||
      isDocumentLoading
    ) {
      return;
    }

    highlightSuggestionInEditor(documentEditor, pendingImprovement.beforeText);
  }, [
    isEditorDialogOpen,
    isParsedResumeLoading,
    isDocumentLoading,
    pendingImprovement?.beforeText,
  ]);

  // --- MAIN LOAD DOCUMENT EFFECT FIXES APPLIED HERE ---
  useEffect(() => {
    // 1. Guard against missing data or unprepared editor
    if (
      !isEditorDialogOpen ||
      !resumeLink ||
      isParsedResumeLoading ||
      !editorRef.current ||
      !isEditorReady
    ) {
      return;
    }

    // 2. Prevent duplicate fetches if already loaded or actively fetching
    if (
      resumeLink === lastLoadedResumeLinkRef.current ||
      resumeLink === fetchingUrlRef.current
    ) {
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      fetchingUrlRef.current = resumeLink; // Lock the fetch

      const documentEditor = editorRef.current?.documentEditor as
        | DocumentEditorLike
        | undefined;

      if (!documentEditor) {
        setIsDocumentLoading(false);
        setLoadError("Editor failed to initialize properly.");
        fetchingUrlRef.current = null;
        return;
      }

      setIsDocumentLoading(true);
      setIsDocumentReady(false);
      setLoadError(null);
      setIsFallbackContent(false);

      try {
        const response = await fetch("/api/docx-to-sfdt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: resumeLink }),
        });

        const responseText = await response.text();

        if (!response.ok) {
          let errorMessage = `API error: ${response.status}`;
          try {
            const parsed = JSON.parse(responseText) as {
              error?: string;
              details?: string;
              contentType?: string;
            };
            errorMessage =
              [parsed.error, parsed.details, parsed.contentType]
                .filter(Boolean)
                .join(" ") || errorMessage;
          } catch {}
          throw new Error(errorMessage);
        }

        const payload = extractSfdtPayload(responseText);
        if (!payload) {
          throw new Error("Empty SFDT payload");
        }

        await waitForContainerReady(editorRef.current);

        const opened = await tryOpenVariants(
          documentEditor,
          payload,
          editorRef.current,
        );
        if (!opened) {
          throw new Error("Failed to render SFDT document");
        }

        if (!cancelled) {
          forceEditorRender(documentEditor, editorRef.current);
          await delay(200);

          lastLoadedResumeLinkRef.current = resumeLink;
          setIsDocumentLoading(false);
          setIsDocumentReady(true);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load document";

        if (parsedResumeText && documentEditor?.editor) {
          const cleanText = parsedResumeText.replace(/<[^>]*>?/gm, "\n").trim();
          try {
            documentEditor.openBlank?.();
          } catch {
            // ignore
          }
          try {
            documentEditor.editor?.insertText?.(cleanText);
            forceEditorRender(documentEditor, editorRef.current);
          } catch {
            // ignore
          }
          if (!cancelled) {
            lastLoadedResumeLinkRef.current = resumeLink;
            setIsFallbackContent(true);
            setLoadError(
              `${message}. Showing extracted text only - the original formatting could not be loaded, so changes cannot be saved back to the file.`,
            );
            setIsDocumentReady(true);
          }
        } else if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          fetchingUrlRef.current = null; // Unlock the fetch
          setIsDocumentLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (fetchingUrlRef.current === resumeLink) {
        fetchingUrlRef.current = null;
      }
    };
  }, [
    isEditorDialogOpen,
    resumeLink,
    isParsedResumeLoading,
    isEditorReady,
    parsedResumeText,
  ]);

  useEffect(() => {
    if (!isEditorDialogOpen || !editorRef.current || !isEditorReady) {
      return;
    }

    const timer = setTimeout(() => {
      forceEditorRender(
        editorRef.current?.documentEditor as unknown as DocumentEditorLike,
        editorRef.current,
      );
    }, 150);

    return () => clearTimeout(timer);
  }, [
    pendingImprovement,
    isSuggestionLoading,
    loadError,
    isEditorDialogOpen,
    isEditorReady,
  ]);

  // Re-fit the document when the viewport changes width (device rotation), so
  // the zoom applyResponsiveZoom picked for the old width does not stay stale.
  useEffect(() => {
    if (!isEditorReady) {
      return;
    }

    let timeoutId = 0;
    const handleResize = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const documentEditor = editorRef.current?.documentEditor as
          | DocumentEditorLike
          | undefined;

        if (documentEditor) {
          forceEditorRender(documentEditor, editorRef.current);
        }
      }, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isEditorReady]);


  const handleQueueImprovement = (
    improvement: ImprovementTip,
    accordionKey: string,
  ) => {
    setPendingImprovement(improvement);
    setPendingKey(accordionKey);
    setIsDocumentReady(false);
    setLoadError(null);
    setIsDocumentLoading(true);
    setIsEditorDialogOpen(true);
  };

  const handleEditorDialogOpenChange = (open: boolean) => {
    setIsEditorDialogOpen(open);

    if (open) {
      setIsDocumentReady(false);
      setLoadError(null);
      setIsDocumentLoading(true);
    }

    if (!open) {
      setIsDocumentReady(false);
      setIsDocumentLoading(false);
      setLoadError(null);
      setPendingImprovement(null);
      setPendingKey(null);
      setIsApplyingSuggestion(false);
      clearEditorSearchHighlights(
        editorRef.current?.documentEditor as DocumentEditorLike | undefined,
      );
      setIsEditorReady(false);
      lastLoadedResumeLinkRef.current = null;
      // Note: editorRef.current = null is REMOVED from here
    }
  };

  // Cancelling is a decision not to touch the resume, so the editor closes with
  // it rather than leaving the user in a document they no longer have a pending
  // change for. `handleEditorDialogOpenChange` carries the rest of the teardown.
  const handleCancelPending = () => {
    handleEditorDialogOpenChange(false);
  };

  const handleApplyPending = async () => {
    if (!pendingImprovement || isApplyingSuggestion) {
      return;
    }

    setIsApplyingSuggestion(true);
    let fileSaveError: string | null = null;
    let fileWasUpdated = false;
    try {
      await applyImprovement({
        resumeId,
        applicationId,
        targetSection: pendingImprovement.targetSection,
        targetId: pendingImprovement.targetId,
        previousText: pendingImprovement.beforeText,
        newText: pendingImprovement.afterText,
      });

      let alreadyNotified = false;
      try {
        toast.success("Suggestion applied.");
        alreadyNotified = true;
      } catch {
        // ignore toast errors
      }

      const documentEditor = editorRef.current?.documentEditor as
        | DocumentEditorLike
        | undefined;

      if (documentEditor) {
        let appliedInEditor = applySuggestionToEditor(
          documentEditor,
          pendingImprovement.beforeText,
          pendingImprovement.afterText,
        );

        if (!appliedInEditor) {
          appliedInEditor = await applySuggestionViaSfdtRewrite(
            documentEditor,
            pendingImprovement.beforeText,
            pendingImprovement.afterText,
          );
        }

        if (!appliedInEditor) {
          throw new Error(
            "Could not apply suggestion to the editor document. Try another suggestion text.",
          );
        }

        await delay(200);
        forceEditorRender(documentEditor, editorRef.current);
        documentEditor.documentHelper?.renderVisiblePages?.(true);
        await delay(150);

        if (isFallbackContent) {
          // The editor is showing extracted plain text, not the converted DOCX.
          // Exporting it would upload a formatting-free document and delete the
          // original file, so the structured data update stands on its own.
          fileSaveError =
            "Resume file not updated: the document is shown as plain text because it could not be converted.";
        } else {
          try {
            const saveResult = await saveEditorDocx(documentEditor, resumeId);
            if (saveResult && typeof saveResult.resumeLink === "string") {
              fileWasUpdated = true;
              lastLoadedResumeLinkRef.current = saveResult.resumeLink;
            }
          } catch (error) {
            fileSaveError =
              error instanceof Error
                ? error.message
                : "Failed to update resume file.";
          }
        }
      }

      if (!fileWasUpdated) {
        lastLoadedResumeLinkRef.current = resumeLink ?? null;
      }

      queryClient.invalidateQueries({
        queryKey: trpc.resume.getParsedContent.queryOptions({ resumeId })
          .queryKey,
      });

      if (applicationId) {
        queryClient.invalidateQueries({
          queryKey: trpc.resume.getJobMatchResult.queryOptions({
            applicationId,
          }).queryKey,
        });
      }

      if (fileSaveError) {
        toast.error(fileSaveError);
        if (!alreadyNotified) {
          toast.success("Suggestion applied.");
        }
      } else if (fileWasUpdated) {
        if (!alreadyNotified) {
          toast.success("Suggestion applied and resume file updated.");
        }
      } else {
        if (!alreadyNotified) {
          toast.success("Suggestion applied.");
        }
      }
      setPendingImprovement(null);
      setPendingKey(null);
    } catch (error) {
      toast.error(
        getErrorFeedback(error, {
          fallbackMessage: "Failed to apply suggestion.",
        }).message,
      );
    } finally {
      setIsApplyingSuggestion(false);
    }
  };

  const unappliedImprovements = improvementsList.filter(
    (imp) => !imp.isApplied,
  );
  const appliedImprovements = improvementsList.filter((imp) => imp.isApplied);
  const pendingCount = pendingImprovement ? 1 : 0;
  const insertionPreview = pendingImprovement
    ? getInsertionPreview(parsedResumeText, pendingImprovement.beforeText)
    : null;

  if (improvementsList.length === 0) {
    return (
      <EmptyDataCard
        title="No Improvements Found"
        description="No AI improvements available yet. Run analysis to generate improvement cards."
      />
    );
  }

  const hasUnapplied = unappliedImprovements.length > 0;

  return (
    <section>
      <link rel="stylesheet" href={SYNCFUSION_THEME_URL} />
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-muted-foreground">
            Apply these suggestions to improve your resume match from{" "}
            <span className={`font-bold ${getScoreColor(currentScore || 0)}`}>
              {currentScore}%
            </span>
            {hasImprovedScore ? (
              <>
                {" "}
                to{" "}
                <span
                  className={`font-bold ${getScoreColor(improvedScore || 0)}`}
                >
                  {improvedScore}%
                </span>
              </>
            ) : (
              <>. Estimated improved score is not available yet.</>
            )}
          </p>
        </div>
      </div>
      <div>
        {hasUnapplied && (
          <Accordion type="multiple" className="mt-4 space-y-6">
            {unappliedImprovements.map((improvement) => {
              const originalIndex = improvementsList.indexOf(improvement);
              const accordionItemValue = `${improvement.targetId}-${originalIndex}`;
              const isPendingSuggestion = pendingKey === accordionItemValue;
              const isApplying = isApplyingSuggestion && isPendingSuggestion;

              return (
                <AccordionItem
                  key={accordionItemValue}
                  value={accordionItemValue}
                  className="rounded-2xl border border-border/50 bg-card/50"
                >
                  <AccordionTrigger className="px-5 pt-5 hover:no-underline focus:no-underline cursor-pointer">
                    <div className="flex flex-col items-start justify-between w-full text-left gap-2 pr-2 sm:flex-row sm:gap-4">
                      <div className="flex w-full min-w-0 flex-col gap-1.5 flex-1">
                        <div className="flex flex-wrap items-center text-lg font-semibold gap-x-3 gap-y-1.5">
                          <Badge
                            variant="outline"
                            className={`font-medium px-2 py-0 h-5 lowercase ${getPriorityStyles(
                              improvement.priority,
                            )}`}
                          >
                            {improvement.priority}
                          </Badge>
                          <h2 className="leading-none pt-0.5">
                            {improvement.title}
                          </h2>
                        </div>
                        <p className="text-sm text-muted-foreground mr-6">
                          {improvement.description}
                        </p>
                      </div>
                      {improvement.matchScoreBoost > 0 && (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary shrink-0 mt-0.5"
                        >
                          +{improvement.matchScoreBoost}% match score
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down ">
                    <div className="px-5 pt-0 pb-4">
                      <div className="mt-4 mb-4">
                        <h4 className="text-sm font-semibold mb-3">
                          Suggestions:
                        </h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {improvement.suggestions.map(
                            (tip: string, index: number) => (
                              <li
                                className="flex items-start gap-2.5"
                                key={index}
                              >
                                <CircleDot className="mt-0.75 h-4 w-4 shrink-0 text-primary" />
                                {tip}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <XIcon className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-red-500">
                              Before
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {improvement.beforeText}
                          </p>
                        </div>

                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <CheckIcon className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">
                              After
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {improvement.afterText}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button
                          variant="outline"
                          className="border-border/60 bg-card/60 min-h-11 w-full sm:min-h-0 sm:w-auto"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Suggestion
                        </Button>
                        <Button
                          className="min-h-11 w-full sm:min-h-0 sm:w-auto"
                          onClick={() =>
                            handleQueueImprovement(
                              improvement,
                              accordionItemValue,
                            )
                          }
                          disabled={isApplyingSuggestion}
                        >
                          {isApplying ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4 mr-2" />
                          )}
                          {isApplying
                            ? "Applying..."
                            : isPendingSuggestion
                              ? "View Suggestion"
                              : "Apply to Resume"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
        {appliedImprovements.length > 0 && (
          <div className="mt-8 pt-6 border-xl border-border/50">
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
              Applied Suggestions ({appliedImprovements.length})
            </h3>
            <Accordion type="multiple" className="space-y-6 opacity-60">
              {appliedImprovements.map((improvement) => {
                const originalIndex = improvementsList.indexOf(improvement);
                const accordionItemValue = `applied-${improvement.targetId}-${originalIndex}`;
                return (
                  <AccordionItem
                    key={accordionItemValue}
                    value={accordionItemValue}
                    className="rounded-2xl border border-border/30 bg-card/30"
                  >
                    <AccordionTrigger className="px-5 pt-5 hover:no-underline focus:no-underline cursor-pointer">
                      <div className="flex flex-col items-start justify-between w-full text-left gap-2 pr-2 sm:flex-row sm:gap-4">
                        <div className="flex w-full min-w-0 flex-col gap-1.5 flex-1">
                          <div className="flex flex-wrap items-center text-lg font-semibold gap-x-3 gap-y-1.5">
                            <Badge
                              variant="outline"
                              className={`font-medium px-2 py-0 h-5 lowercase opacity-60 ${getPriorityStyles(
                                improvement.priority,
                              )}`}
                            >
                              {improvement.priority}
                            </Badge>
                            <h2 className="leading-none pt-0.5">
                              {improvement.title}
                            </h2>
                          </div>
                          <p className="text-sm text-muted-foreground mr-6">
                            {improvement.description}
                          </p>
                        </div>
                        {improvement.matchScoreBoost > 0 && (
                          <Badge
                            variant="outline"
                            className="border-border/30 bg-border/20 text-muted-foreground shrink-0 mt-0.5 opacity-60"
                          >
                            +{improvement.matchScoreBoost}% match score
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="px-5 pt-0 pb-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-red-500/10 bg-red-500/2 p-4 opacity-75">
                            <div className="mb-2 flex items-center gap-2">
                              <XIcon className="h-4 w-4 text-red-500/60" />
                              <span className="font-medium text-red-500/60">
                                Before
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-through">
                              {improvement.beforeText}
                            </p>
                          </div>

                          <div className="rounded-lg border border-primary/10 bg-primary/2 p-4 opacity-75">
                            <div className="mb-2 flex items-center gap-2">
                              <CheckIcon className="h-4 w-4 text-primary/60" />
                              <span className="font-medium text-primary/60">
                                After
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {improvement.afterText}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
        <Dialog
          open={isEditorDialogOpen}
          onOpenChange={handleEditorDialogOpenChange}
        >
          <DialogTitle></DialogTitle>
          <DialogContent className="w-[95vw]! h-[95dvh]! max-h-[95dvh]! max-w-[95vw]! mx-auto">
            <div className="flex h-full flex-col space-y-3">
              <h3 className="text-base font-semibold">Resume Editor</h3>
              {isSuggestionLoading ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-4 w-full max-w-80" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <Skeleton className="h-3 w-24" />
                      <div className="mt-2 space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : pendingImprovement ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase text-emerald-700">
                          Pending suggestions: {pendingCount}
                        </p>
                        <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                          {pendingImprovement.afterText}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="min-h-11 sm:min-h-0"
                          onClick={handleApplyPending}
                          disabled={isApplyingSuggestion}
                        >
                          {isApplyingSuggestion ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckIcon className="h-4 w-4 mr-2" />
                          )}
                          Apply
                        </Button>
                        <Button
                          variant="outline"
                          className="min-h-11 sm:min-h-0"
                          onClick={handleCancelPending}
                          disabled={isApplyingSuggestion}
                        >
                          <XIcon className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <p className="text-xs font-semibold uppercase text-emerald-700/80">
                        Insertion point
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                        {insertionPreview?.isTruncated ? (
                          <span className="text-muted-foreground">...</span>
                        ) : null}
                        <span className="text-muted-foreground">
                          {insertionPreview?.prefix}
                        </span>
                        <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 text-emerald-900">
                          {insertionPreview?.match ||
                            "Target text not available."}
                        </span>
                        <span className="text-muted-foreground">
                          {insertionPreview?.suffix}
                        </span>
                        {insertionPreview?.isTruncated ? (
                          <span className="text-muted-foreground">...</span>
                        ) : null}
                      </p>
                      {!insertionPreview?.isFound ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Target text not found in the current resume preview.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              {loadError ? (
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {loadError}
                </div>
              ) : null}
              <div className="relative flex-1 min-h-0 rounded-xl border border-border/60 bg-card/60 shadow-sm document-editor-container-wrapper">
                <style>{`
                  .document-editor-container-wrapper .e-documenteditorcontainer {
                    border-radius: 0.75rem;
                    overflow: hidden;
                  }
                  .document-editor-container-wrapper .e-documenteditor {
                    height: 100% !important;
                  }
                  .document-editor-container-wrapper .e-documenteditor iframe {
                    width: 100% !important;
                    height: 100% !important;
                    background: transparent !important;
                  }
                  .document-editor-container-wrapper .e-de-search-highlight,
                  .document-editor-container-wrapper .e-de-search-highlight-selected {
                    background-color: rgba(16, 185, 129, 0.45) !important;
                  }
                  .document-editor-container-wrapper .e-de-text-target {
                    background: transparent !important;
                  }
                  .document-editor-container-wrapper > div {
                    height: 100% !important;
                  }
                `}</style>
                <DocumentEditorContainerComponent
                  ref={editorRef}
                  height="100%"
                  style={{
                    display: "block",
                    height: "100%",
                    width: "100%",
                    visibility: isDocumentOverlayLoading ? "hidden" : "visible",
                  }}
                  autoResizeOnVisibilityChange={true}
                  enableToolbar={false}
                  showPropertiesPane={false}
                  created={() => {
                    setIsEditorReady(true);
                  }}
                />
                {isDocumentOverlayLoading ? (
                  <div
                    data-testid="resume-editor-loading"
                    className="absolute inset-0 z-20 flex h-full min-h-full overflow-hidden rounded-2xl border border-border/70 bg-card/90 p-5"
                  >
                    <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
                    <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-chart-2/10 blur-3xl" />

                    <div className="relative flex h-full w-full flex-1 flex-col justify-between space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary shadow-sm">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-44" />
                            <Skeleton className="h-3 w-56" />
                          </div>
                        </div>
                        <Skeleton className="h-7 w-24 rounded-full" />
                      </div>

                      <div className="flex-1 rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        {Array.from({ length: 8 }).map((_, index) => (
                          <Skeleton
                            key={`editor-loading-line-${index}`}
                            className="h-3 w-full"
                          />
                        ))}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Skeleton className="h-9 w-20 rounded-md" />
                        <Skeleton className="h-9 w-24 rounded-md" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default AnalyzeResumeImprovements;
