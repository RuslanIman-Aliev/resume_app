/**
 * Structural subset of the Syncfusion Document Editor instance used by the
 * improvements flow. Declared locally (rather than importing the full editor
 * type) so helper modules can stay decoupled from the component.
 */
export type DocumentEditorLike = {
  isDocumentLoaded?: boolean;
  documentEditorSettings?: {
    optimizeSfdt?: boolean;
    searchHighlightColor?: string;
  };
  serviceUrl?: string;
  serverActionSettings?: {
    import?: string;
    systemClipboard?: string;
    spellCheck?: string;
    restrictEditing?: string;
  };
  documentLoadFailed?: (args?: { status?: unknown }) => void;
  documentHelper?: {
    renderVisiblePages?: (force?: boolean) => void;
    clearSelectionHighlight?: () => void;
  };
  /**
   * Only `find` and `findAll` are search entry points. Replacing goes through
   * `search.searchResults`: `Search.replaceAll` is private, takes the results
   * object rather than a search string, and throws when handed two strings.
   */
  search?: {
    find?: (text: string) => void;
    findAll?: (text: string) => void;
    searchResults?: {
      length?: number;
      /** Selects a result by position; the setter navigates the editor to it. */
      index?: number;
      replace?: (textToReplace: string) => void;
      replaceAll?: (textToReplace: string) => void;
      clear?: () => void;
    };
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

export type SfdtVariant = {
  kind: "object" | "rawString";
  value: string | Record<string, unknown>;
};
