"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { registerLicense } from "@syncfusion/ej2-base";
import {
  DocumentEditorContainerComponent,
  Toolbar,
} from "@syncfusion/ej2-react-documenteditor";
import { strFromU8, unzipSync } from "fflate";
import { toast } from "sonner";

registerLicense(process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE ?? "");

const SYNCFUSION_THEME_URL =
  "https://cdn.syncfusion.com/ej2/33.2.3/material.css";

DocumentEditorContainerComponent.Inject(Toolbar);

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

type SfdtPayload = string | Record<string, unknown>;

type SfdtVariantInput = {
  kind: "object" | "normalizedString" | "rawString";
  value: SfdtPayload;
};

/**
 * Exports the current editor contents as DOCX and persists the new file
 * through the same UploadThing-backed API used by the improvements editor.
 *
 * The API updates both the uploaded file and the stored `resumeLink`, so the
 * next refresh reads the newly saved version instead of the previous one.
 */
const saveEditorDocx = async (
  documentEditor: DocumentEditorLike | undefined,
  resumeId: string,
) => {
  if (!documentEditor?.saveAsBlob) {
    return { skipped: true };
  }

  let blob: Blob | null = null;
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

  const response = await fetch("/api/resume/save-docx", {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();

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

export const AnalyzeOriginalResume = ({ resumeId }: { resumeId: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const editorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const lastLoadedResumeLinkRef = useRef<string | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isDocumentReady, setIsDocumentReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  /**
   * The original resume editor follows the same Syncfusion loading model as
   * the improvements flow, but it omits suggestion UI and exposes Save/Cancel
   * controls for manual editing.
   */
  useEffect(() => {
    if (resumeLink) {
      console.log("[Resume] link:", resumeLink);
    }
  }, [resumeLink]);

  const decodeBase64ToBytes = useCallback((value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }, []);

  const decodeBase64ToText = useCallback(
    (value: string) => {
      try {
        return strFromU8(decodeBase64ToBytes(value));
      } catch {
        return "";
      }
    },
    [decodeBase64ToBytes],
  );

  const normalizeSfdtValue = useCallback((value: unknown): unknown => {
    const normalizeValue = (input: unknown): unknown => {
      if (Array.isArray(input)) {
        return input.map((item) => normalizeValue(item));
      }

      if (!input || typeof input !== "object") {
        return input;
      }

      const normalized: Record<string, unknown> = {};

      for (const [key, nestedValue] of Object.entries(
        input as Record<string, unknown>,
      )) {
        const normalizedKey = key === "tlp" ? "t" : key;
        normalized[normalizedKey] = normalizeValue(nestedValue);
      }

      if (normalized.optimizeSfdt === true) {
        delete normalized.optimizeSfdt;
      }

      return normalized;
    };

    return normalizeValue(value);
  }, []);

  const normalizeSfdtText = useCallback(
    (sfdtText: string) => {
      try {
        const parsed = JSON.parse(sfdtText) as unknown;
        const normalized = normalizeSfdtValue(parsed);
        return JSON.stringify(normalized);
      } catch {
        return sfdtText;
      }
    },
    [normalizeSfdtValue],
  );

  type ZipExtractResult =
    | { kind: "sfdt"; text: string; sourceName: string }
    | { kind: "docx"; bytes: Uint8Array }
    | { kind: "unknown"; reason: string };

  const isSfdtLike = (value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return Array.isArray(record.sec) || Array.isArray(record.sections);
  };

  const extractSfdtFromZipBase64 = useCallback(
    (value: string): ZipExtractResult => {
      const bytes = decodeBase64ToBytes(value);
      const files = unzipSync(bytes);
      const fileNames = Object.keys(files);
      console.log("[extractSfdtFromZipBase64] files in zip:", fileNames);

      const sfdtCandidates: Array<{
        name: string;
        text: string;
        textRuns: number;
      }> = [];

      for (const name of fileNames) {
        const text = strFromU8(files[name]).trim();
        if (!text.startsWith("{")) continue;

        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (typeof parsed.sfdt === "string") {
            return { kind: "sfdt", text: parsed.sfdt, sourceName: name };
          }
          if (isSfdtLike(parsed)) {
            const textRuns = text.match(/"(t|tlp|text)":"[^"]*"/g)?.length ?? 0;
            sfdtCandidates.push({ name, text, textRuns });
          }
        } catch {
          continue;
        }
      }

      if (sfdtCandidates.length > 0) {
        sfdtCandidates.sort((a, b) => {
          if (b.textRuns !== a.textRuns) return b.textRuns - a.textRuns;
          return b.text.length - a.text.length;
        });
        const best = sfdtCandidates[0];
        console.log(
          "[extractSfdtFromZipBase64] SFDT candidate selected:",
          best.name,
          "textRuns:",
          best.textRuns,
        );
        return { kind: "sfdt", text: best.text, sourceName: best.name };
      }

      const hasWordDocument = Boolean(files["word/document.xml"]);
      const hasContentTypes = Boolean(files["[Content_Types].xml"]);
      if (hasWordDocument && hasContentTypes) {
        return { kind: "docx", bytes };
      }

      const sfdtName = fileNames.find((name) =>
        name.toLowerCase().match(/\.(sfdt|json)$/),
      );
      if (sfdtName) {
        const fallbackText = strFromU8(files[sfdtName]).trim();
        if (fallbackText) {
          return { kind: "sfdt", text: fallbackText, sourceName: sfdtName };
        }
      }

      return {
        kind: "unknown",
        reason: "SFDT не найден в архиве",
      };
    },
    [decodeBase64ToBytes],
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
        console.log(
          "[DocumentEditor] documentEditorSettings.optimizeSfdt forced to false on create",
        );
      }
    } catch {
      console.warn("[DocumentEditor] failed to force optimizeSfdt");
    }

    documentEditor.documentLoadFailed = (args) => {
      console.warn("[DocumentEditor] load failed:", args?.status);
    };
    console.log("[DocumentEditor] import endpoint set to /api/Import");
  }, [isEditorReady]);

  /**
   * Save the current DOCX to UploadThing and invalidate parsed-content cache
   * so the UI reflects the newly uploaded resume immediately.
   */
  const handleSaveDocument = useCallback(async () => {
    if (isSavingDocument) {
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

      toast.success("Resume saved and uploaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save resume.",
      );
    } finally {
      setIsSavingDocument(false);
    }
  }, [isSavingDocument, queryClient, resumeId, trpc]);

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

      const openSfdtText = async (sfdtText: string) => {
        // If incoming SFDT declares optimization, tell the editor to parse optimized form
        try {
          const parsedIncoming = JSON.parse(sfdtText) as Record<
            string,
            unknown
          >;
          try {
            if (editor.documentEditorSettings) {
              editor.documentEditorSettings.optimizeSfdt = !!(
                parsedIncoming && parsedIncoming.optimizeSfdt === true
              );
              console.log(
                "[SFDT] documentEditorSettings.optimizeSfdt set to",
                editor.documentEditorSettings.optimizeSfdt,
              );
            }
          } catch (setErr) {
            console.warn(
              "[SFDT] failed to set optimizeSfdt on editor settings:",
              setErr,
            );
          }
        } catch {
          // non-JSON or already normalized
        }

        // If the incoming SFDT is optimized, don't normalize its keys — keep shape consistent
        let payloadForOpen = sfdtText;
        try {
          const parsedIncoming2 = JSON.parse(sfdtText) as Record<
            string,
            unknown
          >;
          if (!parsedIncoming2 || parsedIncoming2.optimizeSfdt !== true) {
            payloadForOpen = normalizeSfdtText(sfdtText);
          }
        } catch {
          // if not JSON, fall back to normalizing attempt
          payloadForOpen = normalizeSfdtText(sfdtText);
        }

        // Debug: log payload shape before opening
        try {
          console.log(
            "[SFDT] payloadForOpen length:",
            payloadForOpen?.length ?? null,
          );
          const maybeParsed = JSON.parse(payloadForOpen as string);
          console.log(
            "[SFDT] payloadForOpen parsed.optimizeSfdt:",
            maybeParsed?.optimizeSfdt,
          );
          console.log(
            "[SFDT] payloadForOpen preview:",
            JSON.stringify(maybeParsed).slice(0, 200),
          );
        } catch {
          console.log(
            "[SFDT] payloadForOpen is not JSON string; preview:",
            (payloadForOpen as string)?.slice?.(0, 200),
          );
        }
        // If payload is optimized JSON, pass object to openAsync to preserve structure
        try {
          const parsedPayload = JSON.parse(payloadForOpen) as unknown;
          const parsedRecord =
            parsedPayload && typeof parsedPayload === "object"
              ? (parsedPayload as Record<string, unknown>)
              : null;
          if (parsedRecord && parsedRecord.optimizeSfdt === true) {
            try {
              editor.open(parsedRecord);
            } catch (e) {
              console.warn("[SFDT] editor.open(parsed) failed:", e);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const loaded = await ensureLoaded();
            console.log("[SFDT] loaded:", loaded);
            if (!hasDocumentText()) {
              console.warn(
                "[SFDT] no text detected after load; continuing to render",
              );
            }
            return loaded;
          }
        } catch {
          // not JSON — continue with string
        }

        try {
          editor.open(payloadForOpen);
        } catch (e) {
          console.warn(
            "[SFDT] editor.open(payload) failed, falling back to openAsync:",
            e,
          );
          try {
            // try async fallback
            await editor.openAsync?.(payloadForOpen);
          } catch (ee) {
            console.warn("[SFDT] editor.openAsync fallback failed:", ee);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const loaded = await ensureLoaded();
        console.log("[SFDT] loaded:", loaded);
        if (!hasDocumentText()) {
          console.warn(
            "[SFDT] no text detected after load; continuing to render",
          );
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

      const tryOpenVariants = async (sfdtText: string) => {
        const results: Array<Record<string, unknown>> = [];
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(sfdtText);
        } catch {
          parsed = null;
        }

        const inputs: SfdtVariantInput[] = [];
        if (parsed && typeof parsed === "object") {
          inputs.push({
            kind: "object",
            value: parsed as Record<string, unknown>,
          });
        }
        try {
          inputs.push({
            kind: "normalizedString",
            value: normalizeSfdtText(sfdtText),
          });
        } catch {
          inputs.push({ kind: "rawString", value: sfdtText });
        }
        inputs.push({ kind: "rawString", value: sfdtText });

        const optimizeOptions = [true, false];
        const methods: Array<"open" | "openAsync"> = ["open", "openAsync"];

        for (const input of inputs) {
          for (const optimize of optimizeOptions) {
            for (const method of methods) {
              try {
                if (editor.documentEditorSettings) {
                  try {
                    editor.documentEditorSettings.optimizeSfdt = optimize;
                  } catch (e) {
                    console.warn("[SFDT] failed to set optimizeSfdt:", e);
                  }
                }

                console.log(
                  `[SFDT] trying variant method=${method} input=${input.kind} optimize=${optimize}`,
                );
                try {
                  if (method === "open") {
                    editor.open(input.value);
                  } else {
                    await editor.openAsync?.(input.value);
                  }
                } catch (openErr) {
                  console.warn("[SFDT] open method threw:", openErr);
                }

                await new Promise((r) => setTimeout(r, 800));

                const loadedNow = await ensureLoaded();
                let serialized = null;
                try {
                  serialized = editor.serialize();
                } catch (serErr) {
                  console.warn("[SFDT] serialize failed:", serErr);
                }

                const hasText =
                  typeof serialized === "string" &&
                  /"(t|tlp|text)":"[^"]+"/.test(serialized);
                const pagesCount =
                  editor.pageCount ??
                  editor.documentHelper?.viewer?.pages?.length ??
                  0;
                const domPages = document.querySelectorAll(".e-de-page").length;

                const outcome = {
                  method,
                  input: input.kind,
                  optimize,
                  loadedNow,
                  hasText,
                  pageCountReported: pagesCount,
                  domPages,
                } as Record<string, unknown>;
                results.push(outcome);
                console.log("[SFDT] variant result:", outcome);

                if (domPages > 0 || (hasText && pagesCount > 0)) {
                  console.log("[SFDT] successful variant found", outcome);
                  return true;
                }

                try {
                  editor.openBlank?.();
                } catch {
                  // ignore
                }
                await new Promise((r) => setTimeout(r, 200));
              } catch (e) {
                console.warn("[SFDT] variant attempt error:", e);
              }
            }
          }
        }

        console.log("[SFDT] all variants tried; results:", results);
        return false;
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

          let loaded = await tryOpenVariants(openPayload);

          if (!loaded) {
            try {
              console.log(
                "[SFDT] SFDT variants all failed, trying original openSfdtText as fallback",
              );
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
          setLoadError(null);
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
    extractSfdtFromZipBase64,
    decodeBase64ToText,
    normalizeSfdtText,
  ]);

  const isGlobalLoading = isLoading || isDocumentLoading;

  return (
    <div className="flex h-full flex-col space-y-3">
      <link rel="stylesheet" href={SYNCFUSION_THEME_URL} />

      {loadError ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">Resume Editor</h3>
          <p className="text-xs text-muted-foreground">
            Edit the original resume and save the updated file back to
            UploadThing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancelDocument}
            disabled={isGlobalLoading || isSavingDocument}
          >
            Cancel
          </Button>
          <Button
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

      <div
        className="relative flex-1 overflow-hidden rounded-xl border border-border/60 shadow-sm document-editor-container-wrapper"
        style={{ minHeight: "calc(100vh - 10rem)" }}
      >
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
