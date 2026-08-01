import type { DocumentEditorContainerComponent } from "@syncfusion/ej2-react-documenteditor";
import { delay } from "@/lib/sfdt/delay";
import { replaceInSfdtNode } from "@/lib/sfdt/payload";
import type {
  DocumentEditorLike,
  SfdtVariant,
} from "./document-editor-types";

/** Clears any active search-result highlights, ignoring editor errors. */
export const clearEditorSearchHighlights = (
  documentEditor?: DocumentEditorLike,
) => {
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

/** Highlights every occurrence of `beforeText` in the editor. */
export const highlightSuggestionInEditor = (
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
 * Replaces `beforeText` with `afterText` in the editor, trying replaceAll,
 * replace, then a find + insertText fallback. Returns whether the change stuck.
 */
export const applySuggestionToEditor = (
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

/**
 * Fallback that rewrites the suggestion directly in the serialized SFDT tree
 * and reopens the document. Returns whether a replacement was made.
 */
export const applySuggestionViaSfdtRewrite = async (
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

const getEditorContainerElement = (
  container: DocumentEditorContainerComponent | null,
) => {
  const maybe = container as unknown as { element?: HTMLElement };
  return maybe?.element ?? null;
};

/** Polls until the editor container element has non-zero dimensions. */
export const waitForContainerReady = async (
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

/** Nudges the editor to re-layout: normalizes zoom, resizes, re-renders pages. */
export const forceEditorRender = (
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

/**
 * Attempts to open an SFDT payload across the matrix of shapes (object/raw
 * string), optimize flags, and open methods until a page renders.
 */
export const tryOpenVariants = async (
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
