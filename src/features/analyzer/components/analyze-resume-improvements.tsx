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
import { getErrorFeedback } from "@/lib/error-feedback";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { registerLicense } from "@syncfusion/ej2-base";
import {
  DocumentEditorContainerComponent,
  Toolbar,
} from "@syncfusion/ej2-react-documenteditor";
import { toast } from "sonner";

const syncfusionLicense = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE?.trim();

if (syncfusionLicense) {
  registerLicense(syncfusionLicense);
}

const SYNCFUSION_THEME_URL =
  "https://cdn.syncfusion.com/ej2/33.2.3/material.css";

DocumentEditorContainerComponent.Inject(Toolbar);

/**
 * Narrow editor surface used by this component to avoid hard coupling
 * to the full Syncfusion type definitions.
 *
 * All properties are optional to tolerate editor versions that may
 * not expose the same API surface.
 */
type DocumentEditorLike = {
  isDocumentLoaded?: boolean;
  documentEditorSettings?: {
    optimizeSfdt?: boolean;
    searchHighlightColor?: string;
  };
  serviceUrl?: string;
  serverActionSettings?: Record<string, string>;
  documentLoadFailed?: (args?: { status?: unknown }) => void;
  documentHelper?: {
    renderVisiblePages?: (force?: boolean) => void;
    clearSelectionHighlight?: () => void;
  };
  search?: {
    find?: (text: string) => void;
    findAll?: (text: string) => void;
    replaceAll?: (searchText: string, replaceText: string) => void;
    replace?: (searchText: string, replaceText: string) => void;
  };
  searchResults?: {
    length?: number;
    navigateTo?: (index: number) => void;
    clear?: () => void;
  };
  editor?: {
    insertText?: (text: string) => void;
  };
  saveAsBlob?: (format: string) => Promise<Blob>;
  serialize?: () => string;
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

type InsertionPreview = {
  prefix: string;
  match: string;
  suffix: string;
  isTruncated: boolean;
  isFound: boolean;
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

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

const getInsertionPreview = (
  resumeText: string,
  beforeText: string,
): InsertionPreview => {
  if (!beforeText) {
    return {
      prefix: "",
      match: "",
      suffix: "",
      isTruncated: false,
      isFound: false,
    };
  }

  const cleanText = stripHtml(resumeText);
  if (!cleanText) {
    return {
      prefix: "",
      match: beforeText,
      suffix: "",
      isTruncated: false,
      isFound: false,
    };
  }

  const index = cleanText.indexOf(beforeText);
  if (index === -1) {
    return {
      prefix: "",
      match: beforeText,
      suffix: "",
      isTruncated: false,
      isFound: false,
    };
  }

  const contextLength = 120;
  const start = Math.max(0, index - contextLength);
  const end = Math.min(
    cleanText.length,
    index + beforeText.length + contextLength,
  );

  return {
    prefix: cleanText.slice(start, index),
    match: beforeText,
    suffix: cleanText.slice(index + beforeText.length, end),
    isTruncated: start > 0 || end < cleanText.length,
    isFound: true,
  };
};

const clearEditorSearchHighlights = (documentEditor?: DocumentEditorLike) => {
  try {
    documentEditor?.searchResults?.clear?.();
  } catch {
    // ignore search clear errors
  }
};

const serializedDocumentHasSuggestion = (
  documentEditor: DocumentEditorLike,
  beforeText: string,
  afterText: string,
) => {
  try {
    const serialized = documentEditor.serialize?.();
    if (typeof serialized !== "string" || !serialized.trim()) {
      return false;
    }

    const containsAfterText = serialized.includes(afterText);
    const stillContainsBeforeText = beforeText
      ? serialized.includes(beforeText)
      : false;

    return containsAfterText && (!beforeText || !stillContainsBeforeText);
  } catch {
    return false;
  }
};

const highlightSuggestionInEditor = (
  documentEditor: DocumentEditorLike | undefined,
  beforeText: string,
) => {
  if (!documentEditor || !beforeText) return;

  clearEditorSearchHighlights(documentEditor);

  try {
    if (documentEditor.search?.findAll) {
      documentEditor.search.findAll(beforeText);
    } else {
      documentEditor.search?.find?.(beforeText);
    }
    documentEditor.searchResults?.navigateTo?.(1);
    documentEditor.documentHelper?.clearSelectionHighlight?.();
    documentEditor.documentHelper?.renderVisiblePages?.(true);
  } catch {
    // ignore search errors
  }
};

/**
 * Applies a suggestion directly into the editor content.
 *
 * @param documentEditor - Editor instance (may be undefined while mounting)
 * @param beforeText - Text to find in the editor (must be non-empty)
 * @param afterText - Replacement text (must be non-empty)
 * @returns True when a replacement was executed, otherwise false
 *
 * Behavior:
 * - Prefers search.replaceAll when available.
 * - Falls back to findAll + insertText at the first match.
 * - Does not persist changes to the backend; caller must save separately.
 */
const applySuggestionToEditor = (
  documentEditor: DocumentEditorLike | undefined,
  beforeText: string,
  afterText: string,
) => {
  if (!documentEditor || !beforeText || !afterText) return false;

  try {
    if (typeof documentEditor.search?.replaceAll === "function") {
      documentEditor.search.replaceAll(beforeText, afterText);
      if (
        serializedDocumentHasSuggestion(documentEditor, beforeText, afterText)
      ) {
        return true;
      }
    }
  } catch {
    // ignore replaceAll errors
  }

  try {
    if (typeof documentEditor.search?.replace === "function") {
      documentEditor.search.replace(beforeText, afterText);
      if (
        serializedDocumentHasSuggestion(documentEditor, beforeText, afterText)
      ) {
        return true;
      }
    }
  } catch {
    // ignore replace errors
  }

  try {
    documentEditor.search?.findAll?.(beforeText);
    const resultsLength = documentEditor.searchResults?.length ?? 0;
    if (resultsLength > 0) {
      documentEditor.searchResults?.navigateTo?.(1);
      documentEditor.editor?.insertText?.(afterText);
      documentEditor.searchResults?.clear?.();
      if (
        serializedDocumentHasSuggestion(documentEditor, beforeText, afterText)
      ) {
        return true;
      }
    }
  } catch {
    // ignore fallback replace errors
  }

  return false;
};

const replaceInSfdtNode = (
  node: unknown,
  beforeText: string,
  afterText: string,
): { next: unknown; changed: boolean } => {
  if (typeof node === "string") {
    if (!node.includes(beforeText)) {
      return { next: node, changed: false };
    }
    return {
      next: node.split(beforeText).join(afterText),
      changed: true,
    };
  }

  if (Array.isArray(node)) {
    let changed = false;
    const next = node.map((item) => {
      const result = replaceInSfdtNode(item, beforeText, afterText);
      changed = changed || result.changed;
      return result.next;
    });
    return { next, changed };
  }

  if (node && typeof node === "object") {
    let changed = false;
    const record = node as Record<string, unknown>;
    const nextRecord: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const result = replaceInSfdtNode(value, beforeText, afterText);
      nextRecord[key] = result.next;
      changed = changed || result.changed;
    }

    return { next: nextRecord, changed };
  }

  return { next: node, changed: false };
};

const applySuggestionViaSfdtRewrite = async (
  documentEditor: DocumentEditorLike | undefined,
  beforeText: string,
  afterText: string,
) => {
  if (!documentEditor || !beforeText || !afterText) return false;

  if (typeof documentEditor.serialize !== "function") return false;

  try {
    const sfdtText = documentEditor.serialize();
    if (!sfdtText?.trim()) return false;

    const sfdt = JSON.parse(sfdtText) as Record<string, unknown>;
    const result = replaceInSfdtNode(sfdt, beforeText, afterText);
    if (!result.changed) return false;

    if (typeof documentEditor.openAsync === "function") {
      await documentEditor.openAsync(result.next as Record<string, unknown>);
    } else {
      documentEditor.open(result.next as Record<string, unknown>);
    }

    await delay(250);
    return true;
  } catch {
    return false;
  }
};

/**
 * Exports the current editor content as DOCX and uploads it.
 *
 * @param documentEditor - Editor instance with saveAsBlob support
 * @param resumeId - Resume id used by the API to update resumeLink
 * @returns API response JSON (expected { resumeLink: string }) or
 *   { skipped: true } when export is not supported.
 * @throws When DOCX export fails or the API responds with an error.
 */
const saveEditorDocx = async (
  documentEditor: DocumentEditorLike | undefined,
  resumeId: string,
) => {
  if (!documentEditor?.saveAsBlob) {
    return { skipped: true };
  }

  let blob: Blob | null = null;
  /**
   * Resume-improvements editor keeps the same document loading and upload flow
   * as the original editor, but it also coordinates suggestion application,
   * in-editor text replacement, and per-suggestion save to the backend.
   */
  try {
    blob = await documentEditor.saveAsBlob("Docx");
  } catch {
    try {
      blob = await documentEditor.saveAsBlob("docx");
    } catch {
      blob = null;
    }
  }

  if (!blob) {
    throw new Error("Failed to export DOCX from editor.");
  }

  const formData = new FormData();
  formData.append("resumeId", resumeId);
  formData.append("file", blob, `resume-${resumeId}.docx`);

  // Log blob info to help debug upload content vs saved file mismatch.
  try {
    console.log("[SFDT] saveEditorDocx uploading blob info", {
      size: (blob as Blob).size,
      type: (blob as Blob).type,
      name: `resume-${resumeId}.docx`,
    });
  } catch {
    // ignore logging errors
  }

  const response = await fetch("/api/resume/save-docx", {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();

  try {
    console.log("[SFDT] saveEditorDocx response", {
      status: response.status,
      ok: response.ok,
      body: responseText,
    });
  } catch {
    // ignore logging errors
  }

  if (!response.ok) {
    let errorMessage = "Failed to update resume file.";
    try {
      const parsed = JSON.parse(responseText) as { error?: string };
      errorMessage = parsed.error || errorMessage;
    } catch {
      if (responseText) {
        errorMessage = responseText;
      }
    }
    throw new Error(errorMessage);
  }

  try {
    return responseText ? JSON.parse(responseText) : { success: true };
  } catch {
    return { success: true };
  }
};

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
    if (loaded || domPages > 0) return true;
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

          if (
            documentEditor.isDocumentLoaded ||
            domPages > 0 ||
            pageCount > 0
          ) {
            return true;
          }

          try {
            documentEditor.openBlank?.();
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
  const editorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const lastLoadedResumeLinkRef = useRef<string | null>(null);
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

  // `getParsedContent` may not include `resumeLink` in its response type
  // (server deliberately omits it). Narrow the resume shape locally to
  // safely access an optional `resumeLink` when present without changing
  // the trpc-generated types.
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
  // When a pending suggestion is queued, we only show the skeleton while
  // the parsed resume content is loading. The document loading overlay is a
  // separate visual state and should not prevent showing the pending UI.
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

  /**
   * Keep the suggestion preview synchronized with the currently loaded resume
   * once the document is ready, and clear highlights while the editor reloads.
   */
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

  /**
   * Loads the resume into Syncfusion, preferring the API-converted SFDT but
   * falling back to plain text when the conversion output cannot be rendered.
   */
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

    if (isDocumentReady && resumeLink === lastLoadedResumeLinkRef.current) {
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
          lastLoadedResumeLinkRef.current = resumeLink;
          setIsDocumentLoading(false);
          setIsDocumentReady(true);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load document";
        console.warn("Failed to load SFDT:", error);

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
    isDocumentReady,
    parsedResumeText,
  ]);

  const handleQueueImprovement = (
    improvement: ImprovementTip,
    accordionKey: string,
  ) => {
    setPendingImprovement(improvement);
    setPendingKey(accordionKey);
    // Show loading overlay immediately when opening the editor dialog
    setIsDocumentReady(false);
    setLoadError(null);
    setIsDocumentLoading(true);
    setIsEditorDialogOpen(true);
  };

  const handleEditorDialogOpenChange = (open: boolean) => {
    setIsEditorDialogOpen(open);

    if (open) {
      // Ensure loading overlay appears immediately while the editor and
      // document begin initialization and network fetches.
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
      /**
       * Apply the selected suggestion, persist the structured resume update, and
       * upload the edited DOCX so the stored resumeLink always points at the
       * latest file version.
       */
      editorRef.current = null;
    }
  };

  const handleCancelPending = () => {
    setPendingImprovement(null);
    setPendingKey(null);
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

      // Notify immediately that the suggestion was applied to the backend
      // so UI tests do not race on later editor/file upload steps.
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

        try {
          // Debug: inspect editor serialization for presence of applied text
          if (typeof documentEditor.serialize === "function") {
            const serialized = documentEditor.serialize();

            console.log("[SFDT] appliedInEditor", {
              appliedInEditor,
              serializedLength: serialized?.length ?? 0,
              containsAfterText: !!pendingImprovement.afterText
                ? serialized.indexOf(pendingImprovement.afterText) !== -1
                : false,
              containsBeforeText: !!pendingImprovement.beforeText
                ? serialized.indexOf(pendingImprovement.beforeText) !== -1
                : false,
            });
          }
        } catch {
          // ignore logging errors
        }

        await delay(200);
        forceEditorRender(documentEditor, editorRef.current);
        documentEditor.documentHelper?.renderVisiblePages?.(true);
        await delay(150);

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

      // Prevent the editor from being reloaded by the load effect while we
      // refresh parsed content. If we uploaded a new file, preserve the
      // returned resume link (already set above). Otherwise, mark the
      // current resumeLink as loaded so the effect will skip re-opening it.
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
        <Dialog
          open={isEditorDialogOpen}
          onOpenChange={handleEditorDialogOpenChange}
        >
          <DialogTitle></DialogTitle>
          <DialogContent className="w-[95vw]! h-[95vh]! max-h-[95vh]! max-w-[95vw]! mx-auto">
            <div className="flex h-full flex-col space-y-3">
              <h3 className="text-base font-semibold">Resume Editor</h3>
              {isSuggestionLoading ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-4 w-80" />
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
