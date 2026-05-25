"use client";

import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationData, ImprovementTip } from "@/lib/types";
import { getScoreColor } from "@/lib/utils";
import {
  CheckIcon,
  CircleDot,
  Copy,
  Wand2,
  XIcon,
  Loader2,
} from "lucide-react";
import { EmptyDataCard } from "./empty-data-card";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { registerLicense } from "@syncfusion/ej2-base";
import {
  DocumentEditorContainerComponent,
  Toolbar,
} from "@syncfusion/ej2-react-documenteditor";

registerLicense(process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE ?? "");

const SYNCFUSION_THEME_URL =
  "https://cdn.syncfusion.com/ej2/33.2.3/material.css";

DocumentEditorContainerComponent.Inject(Toolbar);

type DocumentEditorLike = {
  isDocumentLoaded?: boolean;
  documentEditorSettings?: { optimizeSfdt?: boolean };
  documentHelper?: { renderVisiblePages?: (force?: boolean) => void };
  open: (data: string | Record<string, unknown>) => void;
  openAsync?: (data: string | Record<string, unknown>) => Promise<void>;
  openBlank?: () => void;
  pageCount?: number;
  resize?: () => void;
  zoomFactor?: number;
};

type SfdtVariant = {
  kind: "object" | "rawString";
  value: string | Record<string, unknown>;
};

const getPriorityStyles = (priority: string) => {
  switch (priority.toLowerCase()) {
    case "high":
    case "critical":
      return "border-red-500/30 text-red-500 bg-red-500/10";
    case "medium":
      return "border-yellow-500/30 text-yellow-500 bg-yellow-500/10";
    default:
      return "border-blue-500/30 text-blue-500 bg-blue-500/10";
  }
};

const isSfdtLike = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.sec) || Array.isArray(record.sections);
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const summarizeSfdtPayload = (payload: string) => {
  const summary: Record<string, unknown> = {
    length: payload.length,
    isJson: false,
  };

  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    summary.isJson = true;
    summary.keys = Object.keys(parsed).slice(0, 8);
    summary.optimizeSfdt = parsed.optimizeSfdt === true;
    summary.hasSec = Array.isArray((parsed as { sec?: unknown }).sec);
    summary.hasSections = Array.isArray(
      (parsed as { sections?: unknown }).sections,
    );
    if (Array.isArray((parsed as { sec?: unknown[] }).sec)) {
      summary.secCount = (parsed as { sec: unknown[] }).sec.length;
    }
    if (Array.isArray((parsed as { sections?: unknown[] }).sections)) {
      summary.sectionsCount = (
        parsed as { sections: unknown[] }
      ).sections.length;
    }
  } catch {
    // non-JSON payload
  }

  return summary;
};

const getEditorContainerElement = (
  container: DocumentEditorContainerComponent | null,
) => {
  const maybe = container as unknown as { element?: HTMLElement };
  return maybe?.element ?? null;
};

const logContainerState = (container: HTMLElement | null, label: string) => {
  if (!container) {
    console.log("[SFDT] container missing", label);
    return;
  }

  const rect = container.getBoundingClientRect();
  const style = window.getComputedStyle(container);
  console.log(`[SFDT] container ${label}`, {
    width: rect.width,
    height: rect.height,
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
  });
};

const waitForContainerReady = async (
  container: DocumentEditorContainerComponent | null,
) => {
  for (let i = 0; i < 10; i += 1) {
    const element = getEditorContainerElement(container);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return true;
      }
    }
    await delay(100);
  }

  return false;
};

const forceEditorRender = (
  documentEditor: DocumentEditorLike,
  container: DocumentEditorContainerComponent | null,
) => {
  try {
    if (documentEditor.zoomFactor != null && documentEditor.zoomFactor < 0.2) {
      documentEditor.zoomFactor = 1;
    }
  } catch {
    // ignore zoom errors
  }

  try {
    documentEditor.resize?.();
  } catch {
    // ignore resize errors
  }

  try {
    container?.resize?.();
  } catch {
    // ignore container resize errors
  }

  try {
    documentEditor.documentHelper?.renderVisiblePages?.(true);
  } catch {
    // ignore render errors
  }
};

const ensureLoaded = async (documentEditor: DocumentEditorLike) => {
  for (let i = 0; i < 10; i += 1) {
    const loaded = !!documentEditor?.isDocumentLoaded;
    const domPages = document.querySelectorAll(".e-de-page").length;
    if (loaded && domPages > 0) return true;
    await delay(250);
  }
  return !!documentEditor?.isDocumentLoaded;
};

const tryOpenVariants = async (
  documentEditor: DocumentEditorLike,
  sfdtText: string,
  container: DocumentEditorContainerComponent | null,
) => {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(sfdtText) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  const variants: Array<SfdtVariant> = [];
  if (parsed) {
    variants.push({ kind: "object", value: parsed });
  }
  variants.push({ kind: "rawString", value: sfdtText });

  const optimizeOptions = [true, false];
  const methods: Array<"open" | "openAsync"> = ["open", "openAsync"];

  for (const variant of variants) {
    for (const optimize of optimizeOptions) {
      for (const method of methods) {
        try {
          if (documentEditor.documentEditorSettings) {
            try {
              documentEditor.documentEditorSettings.optimizeSfdt = optimize;
            } catch {
              // ignore optimize flag issues
            }
          }

          if (method === "open") {
            documentEditor.open(variant.value);
          } else if (typeof documentEditor.openAsync === "function") {
            await documentEditor.openAsync(variant.value);
          }

          await delay(900);
          await ensureLoaded(documentEditor);
          forceEditorRender(documentEditor, container);
          await delay(200);
          const domPages = document.querySelectorAll(".e-de-page").length;
          const pageCount = documentEditor.pageCount || 0;

          if (domPages > 0 || pageCount > 0) {
            return true;
          }

          try {
            documentEditor.openBlank();
          } catch {
            // ignore
          }
          await delay(200);
        } catch {
          // ignore variant errors
        }
      }
    }
  }

  return false;
};

const extractSfdtPayload = (responseText: string) => {
  let payload = responseText.trim();
  if (!payload) return "";

  if (payload.startsWith('"') && payload.endsWith('"')) {
    try {
      payload = JSON.parse(payload);
    } catch {
      // keep original payload
    }
  }

  if (payload.startsWith("{")) {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (typeof parsed.sfdt === "string") {
        return parsed.sfdt;
      }
      if (isSfdtLike(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch {
      // keep original payload
    }
  }

  return payload;
};

const AnalyzeResumeImprovements = ({
  data,
  resumeId,
  applicationId: _applicationId,
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
  const [applyingId] = useState<string | null>(null);
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  const editorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data: parsedResumeData, isLoading: isParsedResumeLoading } = useQuery(
    {
      ...trpc.resume.getParsedContent.queryOptions({ resumeId }),
      enabled: isEditorDialogOpen,
      staleTime: 2 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const resumeLink = parsedResumeData?.resume?.resumeLink;
  const parsedResumeText = parsedResumeData?.resume?.parsedContent ?? "";

  useEffect(() => {
    if (!isEditorDialogOpen) {
      setIsDocumentReady(false);
      setLoadError(null);
    }
  }, [isEditorDialogOpen]);

  useEffect(() => {
    if (!isEditorDialogOpen) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const documentEditor = editorRef.current?.documentEditor as
        | DocumentEditorLike
        | undefined;
      const domPages = document.querySelectorAll(".e-de-page").length;
      const pageCount = documentEditor?.pageCount ?? 0;

      if (domPages > 0 || pageCount > 0) {
        setIsDocumentReady(true);
        setIsDocumentLoading(false);
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isEditorDialogOpen]);

  useEffect(() => {
    if (
      !isEditorDialogOpen ||
      !resumeLink ||
      isParsedResumeLoading ||
      !editorRef.current ||
      !isEditorReady
    ) {
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      const documentEditor = editorRef.current?.documentEditor as
        | DocumentEditorLike
        | undefined;
      if (!documentEditor) {
        return;
      }

      setIsDocumentLoading(true);
      setIsDocumentReady(false);
      setLoadError(null);

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
          } catch {
            // keep fallback message
          }
          throw new Error(errorMessage);
        }

        const payload = extractSfdtPayload(responseText);
        if (!payload) {
          throw new Error("Empty SFDT payload");
        }

        console.log("[SFDT] payload summary:", summarizeSfdtPayload(payload));
        logContainerState(
          getEditorContainerElement(editorRef.current),
          "before-open",
        );

        const containerReady = await waitForContainerReady(editorRef.current);
        if (!containerReady) {
          console.warn("[SFDT] container not ready before open");
        }

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
          console.log("[SFDT] render state:", {
            pageCount: documentEditor.pageCount ?? 0,
            domPages: document.querySelectorAll(".e-de-page").length,
          });
          logContainerState(
            getEditorContainerElement(editorRef.current),
            "after-open",
          );
          setIsDocumentReady(true);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load document";
        console.warn("Failed to load SFDT:", error);

        if (parsedResumeText && documentEditor?.editor) {
          const cleanText = parsedResumeText.replace(/<[^>]*>?/gm, "\n").trim();
          try {
            documentEditor.openBlank();
          } catch {
            // ignore
          }
          try {
            documentEditor.editor.insertText(cleanText);
            forceEditorRender(documentEditor, editorRef.current);
          } catch {
            // ignore
          }
          if (!cancelled) {
            setLoadError(null);
            setIsDocumentReady(true);
          }
        } else if (!cancelled) {
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setIsDocumentLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [
    isEditorDialogOpen,
    resumeLink,
    isParsedResumeLoading,
    isEditorReady,
    parsedResumeText,
  ]);

  const handleOpenEditor = () => {
    setIsEditorDialogOpen(true);
  };

  const unappliedImprovements = improvementsList.filter(
    (imp) => !imp.isApplied,
  );
  const appliedImprovements = improvementsList.filter((imp) => imp.isApplied);
  const isEditorLoading =
    !isDocumentReady && (isParsedResumeLoading || isDocumentLoading);

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
              const isApplying = applyingId === accordionItemValue;

              return (
                <AccordionItem
                  key={accordionItemValue}
                  value={accordionItemValue}
                  className="rounded-2xl border border-border/50 bg-card/50"
                >
                  <AccordionTrigger className="px-5 pt-5 hover:no-underline focus:no-underline cursor-pointer">
                    <div className="flex items-start justify-between w-full text-left gap-4 pr-2">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center text-lg font-semibold gap-3">
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
                      {improvement.matchScoreBoost != null && (
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
                      <div className="mt-4 flex justify-end gap-3">
                        <Button
                          variant="outline"
                          className="border-border/60 bg-card/60"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Suggestion
                        </Button>
                        <Button
                          onClick={handleOpenEditor}
                          disabled={isApplying}
                        >
                          {isApplying ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Wand2 className="h-4 w-4 mr-2" />
                          )}
                          {isApplying ? "Applying..." : "Apply to Resume"}
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
                      <div className="flex items-start justify-between w-full text-left gap-4 pr-2">
                        <div className="flex flex-col gap-1.5 flex-1">
                          <div className="flex items-center text-lg font-semibold gap-3">
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
                        {improvement.matchScoreBoost != null && (
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
        <Dialog open={isEditorDialogOpen} onOpenChange={setIsEditorDialogOpen}>
          <DialogTitle></DialogTitle>
          <DialogContent className="w-[95vw]! h-[95vh]! max-h-[95vh]! max-w-[95vw]! mx-auto">
            <div className="flex h-full flex-col space-y-3">
              <h3 className="text-base font-semibold">Resume Editor</h3>
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
                  style={{ display: "block", height: "100%", width: "100%" }}
                  autoResizeOnVisibilityChange={true}
                  enableToolbar={false}
                  showPropertiesPane={false}
                  created={() => {
                    const documentEditor = editorRef.current?.documentEditor;
                    if (documentEditor) {
                      documentEditor.serviceUrl = "";
                      documentEditor.serverActionSettings = {
                        import: "/api/Import",
                      };
                      try {
                        if (documentEditor.documentEditorSettings) {
                          documentEditor.documentEditorSettings.optimizeSfdt = false;
                        }
                      } catch {
                        // ignore
                      }
                      documentEditor.documentLoadFailed = (args) => {
                        console.warn(
                          "[DocumentEditor] load failed:",
                          args?.status,
                        );
                      };
                    }
                    setIsEditorReady(true);
                  }}
                />
                {isEditorLoading ? (
                  <div
                    data-testid="resume-editor-loading"
                    className="absolute inset-0 overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-5"
                  >
                    <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                    <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-chart-2/15 blur-3xl" />

                    <div className="relative space-y-4">
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

                      <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        {Array.from({ length: 8 }).map((_, index) => (
                          <Skeleton
                            key={`editor-loading-line-${index}`}
                            className="h-3 w-full"
                          />
                        ))}
                      </div>

                      <div className="flex justify-end gap-2">
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
