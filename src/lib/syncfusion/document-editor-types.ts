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

export type SfdtVariant = {
  kind: "object" | "rawString";
  value: string | Record<string, unknown>;
};
