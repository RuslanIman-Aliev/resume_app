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
    documentEditor?.search?.searchResults?.clear?.();
  } catch {
    // ignore search clear errors
  }
};

/**
 * Reads the document back as one plain string, in document order.
 *
 * Searching the serialized SFDT directly does not work: Word starts a new text
 * run at every formatting change, so a bullet like **"Robuste Generierung:"**
 * followed by its sentence is two runs, and the sentence never appears as one
 * substring of the JSON - the runs are separated by the structure between them.
 * Joining the run texts is what makes `includes` mean "the document says this".
 *
 * @returns The document text, or null when it cannot be serialized or parsed.
 */
const readDocumentText = (documentEditor: DocumentEditorLike) => {
  const serialized = documentEditor.serialize?.();
  if (typeof serialized !== "string" || !serialized.trim()) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return null;
  }

  const runs: string[] = [];
  const collect = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    if (!node || typeof node !== "object") return;

    for (const [key, value] of Object.entries(node)) {
      // `tlp` is the optimized SFDT dialect the Import service emits; `text` is
      // the long-name one the editor writes when optimization is off.
      if ((key === "tlp" || key === "text") && typeof value === "string") {
        runs.push(value);
      } else {
        collect(value);
      }
    }
  };
  collect(parsed);

  return runs.join("");
};

const documentHasSuggestion = (
  documentEditor: DocumentEditorLike,
  beforeText: string,
  afterText: string,
) => {
  try {
    const text = readDocumentText(documentEditor);
    if (text === null) {
      return false;
    }

    return text.includes(afterText) && (!beforeText || !text.includes(beforeText));
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
    // `index` is a setter that navigates to that result; there is no
    // `navigateTo`, and the call that used to be here silently did nothing.
    const searchResults = documentEditor.search?.searchResults;
    if (searchResults && (searchResults.length ?? 0) > 0) {
      searchResults.index = 0;
    }
    documentEditor.documentHelper?.clearSelectionHighlight?.();
    documentEditor.documentHelper?.renderVisiblePages?.(true);
  } catch {
    // ignore search errors
  }
};

/**
 * Replaces `beforeText` with `afterText` in the editor. Returns whether the
 * change stuck.
 *
 * Both steps start with `findAll`, because that is the only way to get a
 * results object and it matches across text runs - which the suggestion text
 * routinely spans, since Word breaks a run at every formatting change.
 */
export const applySuggestionToEditor = (
  documentEditor: DocumentEditorLike | undefined,
  beforeText: string,
  afterText: string,
) => {
  if (!documentEditor || !beforeText || !afterText) return false;

  try {
    documentEditor.search?.findAll?.(beforeText);
    const searchResults = documentEditor.search?.searchResults;

    if ((searchResults?.length ?? 0) > 0) {
      searchResults?.replaceAll?.(afterText);
      if (documentHasSuggestion(documentEditor, beforeText, afterText)) {
        return true;
      }
    }
  } catch {
    // ignore replaceAll errors
  }

  try {
    documentEditor.search?.findAll?.(beforeText);
    const searchResults = documentEditor.search?.searchResults;

    if ((searchResults?.length ?? 0) > 0 && searchResults) {
      // Selecting the result puts the caret over it, so inserting text
      // overwrites the match the way typing over a selection would.
      searchResults.index = 0;
      documentEditor.editor?.insertText?.(afterText);
      searchResults.clear?.();
      if (documentHasSuggestion(documentEditor, beforeText, afterText)) {
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

/** Width of a rendered document page (A4) in CSS pixels at 100% zoom. */
const EDITOR_PAGE_WIDTH = 794;
/** At or above this container width the desktop zoom (1) is kept untouched. */
const EDITOR_DESKTOP_WIDTH = 768;
/** Zoom floor: below this the 11pt body text stops being readable. */
const EDITOR_MIN_ZOOM = 0.75;

/**
 * Scales the document down on narrow containers so most of the page width fits
 * without shrinking the text past readability; whatever still does not fit stays
 * reachable through the wrapper's horizontal scroll. Desktop keeps zoom 1.
 */
export const applyResponsiveZoom = (
  documentEditor: DocumentEditorLike,
  container: DocumentEditorContainerComponent | null,
) => {
  try {
    const width = getEditorContainerElement(container)?.clientWidth ?? 0;

    if (!width || width >= EDITOR_DESKTOP_WIDTH) {
      // Only restore, never override a zoom the editor already settled on.
      if ((documentEditor.zoomFactor ?? 1) < 1) {
        documentEditor.zoomFactor = 1;
      }
      return;
    }

    documentEditor.zoomFactor = Math.max(
      EDITOR_MIN_ZOOM,
      Math.min(1, width / EDITOR_PAGE_WIDTH),
    );
  } catch {
    // ignore zoom errors
  }
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

  applyResponsiveZoom(documentEditor, container);

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
 * Attempts to open an SFDT payload as a parsed object, then as the raw string,
 * using `open` and then `openAsync`, until a page renders.
 *
 * The payload is passed through untouched. SFDT produced by the Import service
 * is the optimized dialect, where every key is abbreviated (`sec`, `b`, `i`,
 * `cf`, `pf`, `tlp`) and the top-level `optimizeSfdt: true` flag is what tells
 * the reader to use that key table - rewriting keys or dropping the flag makes
 * the reader fall back to the long-name table and silently discard the whole
 * document. `documentEditorSettings.optimizeSfdt` is deliberately left alone
 * too: it only selects the dialect the editor *writes*, never the one it reads.
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

  const methods: Array<"open" | "openAsync"> = ["open", "openAsync"];

  for (const variant of variants) {
    for (const method of methods) {
      try {
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

        if (documentEditor.isDocumentLoaded || domPages > 0 || pageCount > 0) {
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

  return false;
};
