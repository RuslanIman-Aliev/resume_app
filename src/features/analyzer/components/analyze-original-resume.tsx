"use client";

import { Button } from "@/components/ui/button";
import { decodeBase64ToText } from "@/lib/sfdt/base64";
import { extractSfdtFromZipBase64 } from "@/lib/sfdt/extract-zip";
import { isSfdtLike } from "@/lib/sfdt/is-sfdt";
import { saveEditorDocx } from "@/lib/sfdt/resume-docx-api";
import {
  applyResponsiveZoom,
  tryOpenVariants,
} from "@/lib/syncfusion/document-editor";
import "@/lib/syncfusion/setup";
import { useTRPC } from "@/trpc/client";
import { DocumentEditorContainerComponent } from "@syncfusion/ej2-react-documenteditor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const SYNCFUSION_THEME_URL =
  "https://cdn.syncfusion.com/ej2/33.2.3/material.css";

type DocumentEditorLike = {
  isDocumentLoaded?: boolean;
  documentEditorSettings?: {
    optimizeSfdt?: boolean;
  };
  documentHelper?: {
    viewer?: { pages?: unknown[] };
    renderVisiblePages?: (force?: boolean) => void;
    cachedPages?: unknown[];
  };
  selection?: { toString?: () => string };
  pageCount?: number;
  zoomFactor?: number;
  pageOutline?: unknown;
  open: (data: string | Record<string, unknown> | Blob) => void;
  openAsync?: (data: string | Record<string, unknown> | Blob) => Promise<void>;
  openBlank?: () => void;
  resize?: () => void;
  serialize: () => string;
  saveAsBlob?: (format: string) => Promise<Blob>;
  editor?: { insertText: (text: string) => void };
  serviceUrl?: string;
  serverActionSettings?: Record<string, string>;
  documentLoadFailed?: (args?: { status?: unknown }) => void;
};

export const AnalyzeOriginalResume = ({ resumeId }: { resumeId: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const editorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const lastLoadedResumeLinkRef = useRef<string | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // True when the editor holds the plain-text fallback instead of the converted
  // DOCX. Saving from this state would upload a formatting-free document and
  // delete the original file, so the save path refuses it.
  const [isFallbackContent, setIsFallbackContent] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);

  const { data, isLoading } = useQuery({
    ...trpc.resume.getParsedContent.queryOptions({ resumeId }),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // `getParsedContent` response may omit `resumeLink`; narrow locally
  type MaybeResumeWithLink = {
    parsedContent?: string | null;
    resumeName?: string | null;
    postedRole?: string | null;
    resumeLink?: string | null;
  };

  const resumeLink = (data?.resume as MaybeResumeWithLink | undefined)
    ?.resumeLink;
  const parsedResumeText = data?.resume?.parsedContent ?? "";

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
      }
    } catch {
      // ignore optimizeSfdt errors
    }

    documentEditor.documentLoadFailed = (args) => {
      console.warn("[DocumentEditor] load failed:", args?.status);
    };
  }, [isEditorReady]);

  /**
   * Save the current DOCX to UploadThing and invalidate parsed-content cache
   * so the UI reflects the newly uploaded resume immediately.
   */
  const handleSaveDocument = useCallback(async () => {
    if (isSavingDocument) {
      return;
    }

    if (isFallbackContent) {
      toast.error(
        "This document is shown as plain text, so saving would overwrite the original file.",
      );
      return;
    }

    const editor = editorRef.current?.documentEditor as
      | DocumentEditorLike
      | undefined;

    if (!editor) {
      return;
    }

    setIsSavingDocument(true);

    try {
      const saveResult = await saveEditorDocx(editor, resumeId);

      if (saveResult && typeof saveResult.resumeLink === "string") {
        lastLoadedResumeLinkRef.current = saveResult.resumeLink;
      }

      await queryClient.invalidateQueries({
        queryKey: trpc.resume.getParsedContent.queryOptions({ resumeId })
          .queryKey,
      });

      // The save also rewrites parsedContent and the preview image, so the
      // resume list is refreshed rather than left showing the old thumbnail.
      queryClient.invalidateQueries({
        queryKey: trpc.resume.getAll.queryKey(),
        refetchType: "active",
      });

      toast.success("Resume saved and uploaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save resume.",
      );
    } finally {
      setIsSavingDocument(false);
    }
  }, [isFallbackContent, isSavingDocument, queryClient, resumeId, trpc]);

  /**
   * Cancel discards the in-memory editor state and forces the file to be
   * reloaded from the last persisted resumeLink on the next open.
   */
  const handleCancelDocument = useCallback(() => {
    if (isDocumentLoading || isSavingDocument) {
      return;
    }

    lastLoadedResumeLinkRef.current = null;
    setLoadError(null);
    setIsDocumentReady(false);
    setIsDocumentLoading(true);
  }, [isDocumentLoading, isSavingDocument]);

  useEffect(() => {
    if (!editorRef.current || !resumeLink || isLoading || !isEditorReady) {
      return;
    }

    if (isDocumentReady && resumeLink === lastLoadedResumeLinkRef.current) {
      return;
    }

    const loadDocument = async () => {
      const editor = editorRef.current?.documentEditor as
        | DocumentEditorLike
        | undefined;
      if (!editor) return;

      let lastErrorMessage = "Не удалось открыть документ";

      const isEditorLoaded = () => {
        try {
          return !!editor.isDocumentLoaded;
        } catch {
          return false;
        }
      };

      const ensureLoaded = async () => {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const loaded = isEditorLoaded();
          console.log(`[ensureLoaded] attempt ${attempt}:`, {
            loaded,
            isDocumentLoaded: editor.isDocumentLoaded,
          });
          if (loaded) return true;
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        return !!isEditorLoaded();
      };

      const hasDocumentText = () => {
        try {
          const serialized = editor.serialize();
          return /"(t|tlp|text)":"[^\"]+"/.test(serialized);
        } catch {
          return false;
        }
      };

      /**
       * Opens SFDT exactly as the Import service produced it.
       *
       * The payload must not be rewritten on the way in. Import returns the
       * optimized SFDT dialect - abbreviated keys (`sec`, `b`, `i`, `cf`, `pf`,
       * `tlp`) plus a top-level `optimizeSfdt: true` that switches the reader to
       * that key table. Renaming a key or dropping the flag makes the reader
       * look up long names, find nothing, and load a document stripped of its
       * formatting.
       */
      const openSfdtText = async (sfdtText: string) => {
        try {
          editor.open(sfdtText);
        } catch (openError) {
          try {
            await editor.openAsync?.(sfdtText);
          } catch {
            console.warn("[SFDT] open and openAsync both failed:", openError);
            return false;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const loaded = await ensureLoaded();

        if (loaded && !hasDocumentText()) {
          console.warn("[SFDT] document loaded without any text runs");
        }

        return loaded;
      };

      const openDocxBytes = async (bytes: Uint8Array) => {
        const buffer =
          bytes.buffer instanceof ArrayBuffer
            ? bytes.buffer
            : bytes.slice().buffer;
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        editor.open(blob);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const loaded = await ensureLoaded();
        console.log("[SFDT] loaded from DOCX:", loaded);
        return loaded;
      };

      const tryOpenFromApi = async () => {
        try {
          const proxyResponse = await fetch("/api/docx-to-sfdt", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: resumeLink }),
          });

          const responseText = await proxyResponse.text();

          if (!proxyResponse.ok) {
            try {
              const parsed = JSON.parse(responseText) as {
                error?: string;
                contentType?: string;
                details?: string;
              };
              const pieces = [parsed.error, parsed.contentType, parsed.details]
                .filter(Boolean)
                .join(" ");
              lastErrorMessage = pieces || lastErrorMessage;
            } catch {
              lastErrorMessage = responseText || lastErrorMessage;
            }
            throw new Error(lastErrorMessage);
          }

          let openPayload: string | null = responseText.trim();

          if (openPayload.startsWith('"') && openPayload.endsWith('"')) {
            try {
              openPayload = JSON.parse(openPayload);
            } catch {
              // Keep original text if JSON parsing fails.
            }
          }

          if (openPayload?.startsWith("{")) {
            try {
              const parsed = JSON.parse(openPayload) as Record<string, unknown>;
              if (typeof parsed.sfdt === "string") {
                openPayload = parsed.sfdt;
              } else if (isSfdtLike(parsed)) {
                openPayload = JSON.stringify(parsed);
              } else {
                const errorMessage =
                  typeof parsed.error === "string"
                    ? parsed.error
                    : "Ответ не является SFDT";
                const details =
                  typeof parsed.details === "string" ? parsed.details : "";
                lastErrorMessage = [errorMessage, details]
                  .filter(Boolean)
                  .join(" ");
                return false;
              }
            } catch {
              // Keep original payload if JSON parsing fails.
            }
          }

          if (!openPayload) {
            throw new Error("Пустой ответ от сервера");
          }

          const isLikelyBase64Zip =
            openPayload.startsWith("UEsDB") && openPayload.length > 128;

          if (isLikelyBase64Zip) {
            try {
              const zipResult = extractSfdtFromZipBase64(openPayload);
              if (zipResult.kind === "sfdt") {
                const sfdtText = zipResult.text;
                console.log("[SFDT] files extracted, length:", sfdtText.length);
                console.log("[SFDT] source file:", zipResult.sourceName);
                console.log("[SFDT] preview:", sfdtText.slice(0, 200));
                return await openSfdtText(sfdtText);
              }

              if (zipResult.kind === "docx") {
                console.log("[SFDT] zip looks like DOCX, opening via Import");
                return await openDocxBytes(zipResult.bytes);
              }

              lastErrorMessage = zipResult.reason;
              return false;
            } catch (decodeError) {
              console.warn("Failed to unzip base64 SFDT:", decodeError);
              lastErrorMessage = "Не удалось распаковать SFDT zip";
              return false;
            }
          }

          const looksLikeBase64 =
            /^[A-Za-z0-9+/=]+$/.test(openPayload) && openPayload.length > 128;

          if (looksLikeBase64) {
            const decodedText = decodeBase64ToText(openPayload).trim();

            if (decodedText.startsWith("{")) {
              return await openSfdtText(decodedText);
            }

            lastErrorMessage = "Ответ похож на base64, но SFDT не распознан";
            return false;
          }

          let loaded = await tryOpenVariants(
            editor,
            openPayload,
            editorRef.current,
          );

          if (!loaded) {
            try {
              loaded = await openSfdtText(openPayload);
            } catch (e) {
              console.warn("[SFDT] openSfdtText fallback error:", e);
            }
          }

          if (!loaded) {
            try {
              console.log(
                "[SFDT] SFDT open failed, trying DOCX proxy fallback",
              );
              const proxyRes = await fetch(
                `/api/docx-proxy?url=${encodeURIComponent(resumeLink)}`,
              );
              if (proxyRes.ok) {
                const ab = await proxyRes.arrayBuffer();
                const bytes = new Uint8Array(ab);
                loaded = await openDocxBytes(bytes);
              } else {
                console.warn("[SFDT] docx-proxy failed:", proxyRes.status);
              }
            } catch (e) {
              console.warn("[SFDT] docx-proxy fallback error:", e);
            }
          }

          const container = editorRef.current?.element;
          if (container) {
            const rect = container.getBoundingClientRect();
            console.log("[SFDT] container visible:", {
              display: window.getComputedStyle(container).display,
              visibility: window.getComputedStyle(container).visibility,
              opacity: window.getComputedStyle(container).opacity,
              width: rect.width,
              height: rect.height,
            });
          }

          return loaded;
        } catch (error) {
          console.warn("open via API failed:", error);
          lastErrorMessage = "Не удалось открыть документ через конвертацию";
          return false;
        }
      };

      try {
        setIsDocumentLoading(true);
        setLoadError(null);
        setIsFallbackContent(false);

        const opened = await tryOpenFromApi();

        if (!opened) {
          throw new Error(lastErrorMessage);
        }

        console.log(
          "[Document] Load successful, page count:",
          editor.pageCount,
        );
        console.log(
          "[Document] Document selection:",
          editor.selection?.toString?.(),
        );

        // Check zoom and rendering state
        console.log("[Document] Zoom factor:", editor.zoomFactor);
        console.log("[Document] View type:", editor.pageOutline);
        console.log("[Document] Has selection:", !!editor.selection);

        // If zoom is too small, normalize to 1 (100%)
        if (!editor.zoomFactor || editor.zoomFactor < 0.2) {
          console.log("[Document] Zoom is too low, setting to 1");
          try {
            editor.zoomFactor = 1;
          } catch (zoomError) {
            console.warn("[Document] Failed to set zoom:", zoomError);
          }
        }

        // Fit the page into narrow viewports; a no-op at desktop widths.
        applyResponsiveZoom(editor, editorRef.current);

        // Force a layout pass so the internal iframe gets sized
        try {
          if (editor.resize) {
            editor.resize();
          }
          if (editorRef.current?.resize) {
            editorRef.current.resize();
          }
        } catch (resizeError) {
          console.warn("[Document] Failed to resize:", resizeError);
        }

        // Try forcing rendering of visible pages
        try {
          editor.documentHelper?.renderVisiblePages?.(true);
          await new Promise((resolve) => setTimeout(resolve, 500));
          console.log(
            "[Document] after renderVisiblePages, cachedPages:",
            editor.documentHelper?.cachedPages,
          );
          console.log(
            "[Document] viewer.pages.length:",
            editor.documentHelper?.viewer?.pages?.length,
          );
          const domPages = document.querySelectorAll(".e-de-page");
          console.log("[Document] DOM .e-de-page count:", domPages.length);
        } catch (renderErr) {
          console.warn("[Document] renderVisiblePages failed:", renderErr);
        }

        const editorCanvas = document.querySelector(".e-de-page");
        console.log("[Document] Canvas element found:", !!editorCanvas);
        if (editorCanvas) {
          const rect = editorCanvas.getBoundingClientRect();
          console.log("[Document] Canvas dimensions:", {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          });
          console.log("[Document] Canvas computed style:", {
            display: window.getComputedStyle(editorCanvas).display,
            visibility: window.getComputedStyle(editorCanvas).visibility,
            opacity: window.getComputedStyle(editorCanvas).opacity,
            backgroundColor:
              window.getComputedStyle(editorCanvas).backgroundColor,
          });
        }

        const editorContainer = editorRef.current?.element;
        console.log("[Document] Container element found:", !!editorContainer);
        if (editorContainer) {
          const rect = editorContainer.getBoundingClientRect();
          console.log("[Document] Canvas dimensions:", {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          });
        }

        lastLoadedResumeLinkRef.current = resumeLink;
        setIsDocumentReady(true);
      } catch (error) {
        console.error("Ошибка при загрузке документа:", error);

        if (parsedResumeText && editor.editor) {
          const cleanText = parsedResumeText.replace(/<[^>]*>?/gm, "\n").trim();
          try {
            editor.openBlank?.();
          } catch (blankError) {
            console.warn("openBlank failed:", blankError);
          }
          editor.editor.insertText(cleanText);
          setIsFallbackContent(true);
          setLoadError(
            "Не удалось загрузить исходное форматирование - показан только извлечённый текст. Сохранение отключено, чтобы не перезаписать исходный файл.",
          );
          lastLoadedResumeLinkRef.current = resumeLink;
          setIsDocumentReady(true);
        } else {
          setLoadError(
            `${lastErrorMessage}. Проверьте, что SFDT успешно распакован.`,
          );
        }
      } finally {
        setIsDocumentLoading(false);
      }
    };

    loadDocument();
  }, [
    resumeLink,
    isLoading,
    parsedResumeText,
    isEditorReady,
    isDocumentReady,
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
        const editor = editorRef.current?.documentEditor as
          | DocumentEditorLike
          | undefined;

        if (!editor) {
          return;
        }

        applyResponsiveZoom(editor, editorRef.current);

        try {
          editor.resize?.();
          editorRef.current?.resize?.();
        } catch {
          // ignore resize errors
        }
      }, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isEditorReady]);


  const isGlobalLoading = isLoading || isDocumentLoading;

  return (
    <div className="flex h-full flex-col space-y-3">
      <link rel="stylesheet" href={SYNCFUSION_THEME_URL} />

      {loadError ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-semibold">Resume Editor</h3>
          <p className="text-xs text-muted-foreground">
            Edit the original resume and save the updated file back to
            UploadThing.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
          <Button
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
            onClick={handleCancelDocument}
            disabled={isGlobalLoading || isSavingDocument}
          >
            Cancel
          </Button>
          <Button
            className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
            onClick={handleSaveDocument}
            disabled={isGlobalLoading || isSavingDocument || !resumeLink}
          >
            {isSavingDocument ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-xl border border-border/60 shadow-sm document-editor-container-wrapper min-h-[calc(100dvh-10rem)]">
        <style>{`
          .document-editor-container-wrapper .e-documenteditorcontainer {
            border-radius: 0.75rem;
            overflow: hidden;
            height: 100% !important; 
            width: 100% !important;
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

        <div className="absolute inset-0">
          <DocumentEditorContainerComponent
            ref={editorRef}
            height="100%"
            style={{
              display: "block",
              height: "100%",
              width: "100%",
              visibility: isGlobalLoading ? "hidden" : "visible",
            }}
            autoResizeOnVisibilityChange={true}
            enableToolbar={false}
            showPropertiesPane={false}
            created={() => {
              setIsEditorReady(true);
            }}
          />
        </div>

        {isGlobalLoading ? (
          <div className="absolute inset-0 z-20 flex h-full min-h-full overflow-hidden rounded-2xl border border-border/70 bg-card p-5">
            <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-16 h-44 w-44 rounded-full bg-chart-2/10 blur-3xl" />

            <div className="relative flex h-full w-full flex-1 flex-col justify-between space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary shadow-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-44 rounded bg-muted/70" />
                    <div className="h-3 w-56 rounded bg-muted/60" />
                  </div>
                </div>
                <div className="h-7 w-24 rounded-full bg-muted/70" />
              </div>

              <div className="flex-1 rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
                <div className="h-4 w-1/3 rounded bg-muted/70" />
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`editor-loading-line-${index}`}
                    className="h-3 w-full rounded bg-muted/60"
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <div className="h-9 w-20 rounded-md bg-muted/70" />
                <div className="h-9 w-24 rounded-md bg-muted/70" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
