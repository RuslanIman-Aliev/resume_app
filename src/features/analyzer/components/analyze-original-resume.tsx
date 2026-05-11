"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { registerLicense } from "@syncfusion/ej2-base";
import {
  DocumentEditorContainerComponent,
  Toolbar,
} from "@syncfusion/ej2-react-documenteditor";
import { strFromU8, unzipSync } from "fflate";

registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JHaF1cXmhMYVJwWmFZfVhgdVdMYl9bQHFPIiBoS35RcEVmWXZfcnZWQmdUVUNxVEFe",
);

const SYNCFUSION_THEME_URL =
  "https://cdn.syncfusion.com/ej2/24.1.41/material.css";

DocumentEditorContainerComponent.Inject(Toolbar);

export const AnalyzeOriginalResume = ({ resumeId }: { resumeId: string }) => {
  const trpc = useTRPC();
  const editorRef = useRef<DocumentEditorContainerComponent | null>(null);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const { data, isLoading } = useQuery({
    ...trpc.resume.getParsedContent.queryOptions({ resumeId }),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const resumeLink = data?.resume?.resumeLink;
  const parsedResumeText = data?.resume?.parsedContent ?? "";

  const decodeBase64ToBytes = (value: string) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const decodeBase64ToText = useCallback((value: string) => {
    try {
      return strFromU8(decodeBase64ToBytes(value));
    } catch {
      return "";
    }
  }, []);

  const extractSfdtFromZipBase64 = useCallback((value: string) => {
    const bytes = decodeBase64ToBytes(value);
    const files = unzipSync(bytes);
    const fileNames = Object.keys(files);
    console.log("[extractSfdtFromZipBase64] files in zip:", fileNames);
    const sfdtName = fileNames.find((name) =>
      name.toLowerCase().includes("sfdt"),
    );
    const candidate = sfdtName ? files[sfdtName] : files[fileNames[0]];
    const result = candidate ? strFromU8(candidate) : "";
    console.log(
      "[extractSfdtFromZipBase64] extracted SFDT length:",
      result.length,
    );
    if (result.length > 0) {
      try {
        const parsed = JSON.parse(result);
        console.log(
          "[extractSfdtFromZipBase64] SFDT is valid JSON, keys:",
          Object.keys(parsed).slice(0, 5),
        );
      } catch {
        console.warn("[extractSfdtFromZipBase64] SFDT is not JSON");
      }
    }
    return result;
  }, []);

  useEffect(() => {
    if (!editorRef.current || !resumeLink || isLoading || !isEditorReady) {
      return;
    }

    const loadDocument = async () => {
      const editor = editorRef.current?.documentEditor;
      if (!editor) return;

      let lastErrorMessage = "Не удалось открыть документ";

      const isEditorLoaded = () => {
        try {
          return editor.isDocumentLoaded;
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
        return isEditorLoaded();
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
              const parsed = JSON.parse(openPayload) as {
                sfdt?: string;
              };
              if (typeof parsed.sfdt === "string") {
                openPayload = parsed.sfdt;
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
              const sfdtText = extractSfdtFromZipBase64(openPayload);
              console.log("[SFDT] files extracted, length:", sfdtText.length);
              console.log("[SFDT] preview:", sfdtText.slice(0, 200));
              const textRuns = sfdtText.match(/"t":"([^"]*)"/g) ?? [];
              console.log(
                "[SFDT] text runs:",
                textRuns.length,
                textRuns.slice(0, 3),
              );
              if (!sfdtText) {
                throw new Error("SFDT zip is empty");
              }
              if (textRuns.length === 0) {
                lastErrorMessage = "SFDT не содержит текстовых узлов";
                return false;
              }
              editor.open(sfdtText);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const loaded = await ensureLoaded();
              console.log("[SFDT] loaded:", loaded);

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
              editor.open(decodedText);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              const loaded = await ensureLoaded();
              console.log("[SFDT] loaded from base64:", loaded);
              return loaded;
            }

            lastErrorMessage = "Ответ похож на base64, но SFDT не распознан";
            return false;
          }

          editor.open(openPayload);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const loaded = await ensureLoaded();
          console.log("[SFDT] loaded:", loaded);

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
      } catch (error) {
        console.error("Ошибка при загрузке документа:", error);

        if (parsedResumeText && editor.editor) {
          const cleanText = parsedResumeText.replace(/<[^>]*>?/gm, "\n").trim();
          try {
            editor.openBlank();
          } catch (blankError) {
            console.warn("openBlank failed:", blankError);
          }
          editor.editor.insertText(cleanText);
          setLoadError(null);
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
    extractSfdtFromZipBase64,
    decodeBase64ToText,
  ]);

  const isGlobalLoading = isLoading || isDocumentLoading;

  return (
    <div className="flex flex-col h-full space-y-3">
      <link rel="stylesheet" href={SYNCFUSION_THEME_URL} />

      {loadError ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {isGlobalLoading ? (
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-secondary/30 p-5 min-h-125 flex items-center justify-center">
          <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex flex-col items-center gap-4 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium animate-pulse">
              {isLoading
                ? "Загрузка данных резюме..."
                : "Подготовка документа Word..."}
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[70vh] min-h-150 border border-border/60 rounded-xl overflow-hidden shadow-sm document-editor-container-wrapper">
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
                documentEditor.serverActionSettingsImport = "/api/Import";
                console.log(
                  "[DocumentEditor] import endpoint set to /api/Import",
                );
              }
              setIsEditorReady(true);
            }}
          />
        </div>
      )}
    </div>
  );
};
