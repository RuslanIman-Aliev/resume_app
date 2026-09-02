import { describe, expect, it, vi } from "vitest";

import {
  applySuggestionToEditor,
  clearEditorSearchHighlights,
} from "./document-editor";
import type { DocumentEditorLike } from "./document-editor-types";

const BEFORE =
  "Robuste Generierung: Erstellung der Route als Hintergrundjob; stabile Event-IDs.";
const AFTER =
  "Implemented event-driven backend processing with stable event IDs.";

/**
 * A document whose sentence is split the way Word splits it: a bold label in
 * one run and the rest of the sentence in the next. That split is the whole
 * point of these tests - the suggestion text never appears as one substring of
 * the serialized SFDT, so anything checking the raw JSON reports failure on a
 * replacement that actually worked.
 */
const createEditor = ({
  matches = 1,
  replaceAll,
}: {
  matches?: number;
  replaceAll?: (text: string) => void;
} = {}) => {
  let runs = [
    "Robuste Generierung: ",
    "Erstellung der Route als Hintergrundjob; stabile Event-IDs.",
    "Umgang mit KI-Ausgaben: ",
  ];
  let foundCount = 0;

  const searchResults = {
    length: 0,
    index: -1,
    replaceAll: vi.fn((text: string) => {
      if (replaceAll) {
        replaceAll(text);
        return;
      }
      runs = [text, "Umgang mit KI-Ausgaben: "];
    }),
    replace: vi.fn(),
    clear: vi.fn(() => {
      searchResults.length = 0;
    }),
  };

  const editor: DocumentEditorLike = {
    search: {
      findAll: vi.fn((text: string) => {
        foundCount += 1;
        searchResults.length = runs.join("").includes(text) ? matches : 0;
      }),
      searchResults,
    },
    editor: { insertText: vi.fn() },
    serialize: () =>
      JSON.stringify({
        optimizeSfdt: true,
        sec: [{ b: [{ i: runs.map((text) => ({ tlp: text })) }] }],
      }),
    open: vi.fn(),
  };

  return {
    editor,
    searchResults,
    getRuns: () => runs,
    getFoundCount: () => foundCount,
  };
};

describe("applySuggestionToEditor", () => {
  it("replaces text that spans two runs and reports success", () => {
    const { editor, searchResults, getRuns } = createEditor();

    expect(applySuggestionToEditor(editor, BEFORE, AFTER)).toBe(true);
    expect(searchResults.replaceAll).toHaveBeenCalledWith(AFTER);
    expect(getRuns().join("")).toContain(AFTER);
    expect(getRuns().join("")).not.toContain(BEFORE);
  });

  it("goes through findAll and the results object, never search.replaceAll", () => {
    const { editor } = createEditor();

    applySuggestionToEditor(editor, BEFORE, AFTER);

    // `Search.replaceAll` is private and takes the results object rather than a
    // search string; calling it with two strings throws inside Syncfusion, and
    // every suggestion failed to apply while the code did exactly that.
    expect(editor.search?.findAll).toHaveBeenCalledWith(BEFORE);
    expect("replaceAll" in (editor.search ?? {})).toBe(false);
  });

  it("falls back to selecting the result and typing over it", () => {
    let runs = "";
    const { editor, searchResults } = createEditor({
      replaceAll: () => {
        // A replaceAll that silently does nothing, as on a protected document.
      },
    });
    (editor.editor as { insertText: (text: string) => void }).insertText = vi.fn(
      () => {
        runs = AFTER;
      },
    );
    editor.serialize = () =>
      JSON.stringify({ sec: [{ b: [{ i: [{ tlp: runs }] }] }] });

    expect(applySuggestionToEditor(editor, BEFORE, AFTER)).toBe(true);
    expect(searchResults.index).toBe(0);
    expect(editor.editor?.insertText).toHaveBeenCalledWith(AFTER);
  });

  it("reports failure when the text is not in the document", () => {
    const { editor, searchResults } = createEditor();

    expect(applySuggestionToEditor(editor, "text that is absent", AFTER)).toBe(
      false,
    );
    expect(searchResults.replaceAll).not.toHaveBeenCalled();
  });

  it("reports failure without an editor or with empty text", () => {
    const { editor } = createEditor();

    expect(applySuggestionToEditor(undefined, BEFORE, AFTER)).toBe(false);
    expect(applySuggestionToEditor(editor, "", AFTER)).toBe(false);
    expect(applySuggestionToEditor(editor, BEFORE, "")).toBe(false);
  });
});

describe("clearEditorSearchHighlights", () => {
  it("clears through search.searchResults", () => {
    const { editor, searchResults } = createEditor();

    clearEditorSearchHighlights(editor);

    expect(searchResults.clear).toHaveBeenCalled();
  });

  it("ignores a missing editor and a missing search module", () => {
    expect(() => clearEditorSearchHighlights(undefined)).not.toThrow();
    expect(() =>
      clearEditorSearchHighlights({ open: vi.fn() } as DocumentEditorLike),
    ).not.toThrow();
  });
});
