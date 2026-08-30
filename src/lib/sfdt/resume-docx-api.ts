type EditorWithBlobExport = {
  saveAsBlob?: (format: string) => Promise<Blob>;
};

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Renders a preview image for the saved document, best effort.
 *
 * Imported lazily because docx-preview and html-to-image have no business in
 * the editor's own chunk. A failure here is not worth failing the save over -
 * the card keeps the previous image until the next successful save.
 *
 * @param file - The DOCX that is about to be uploaded.
 * @returns A JPEG thumbnail, or null when rendering was not possible.
 */
const renderPreview = async (file: File): Promise<File | null> => {
  try {
    const { generateDocxThumbnail } = await import("@/lib/thumbnails-docx");
    return await generateDocxThumbnail(file);
  } catch {
    return null;
  }
};

/**
 * Exports the current editor contents as DOCX and persists the new file through
 * the UploadThing-backed `/api/resume/save-docx` endpoint. The API re-reads the
 * uploaded bytes, so `resumeLink`, `fileName` and `parsedContent` all describe
 * the version the user just saved.
 *
 * The preview image is rendered here rather than server-side: it needs a DOM,
 * and the browser already holds the bytes.
 */
export const saveEditorDocx = async (
  documentEditor: EditorWithBlobExport | undefined,
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

  const fileName = `resume-${resumeId}.docx`;
  const docxFile = new File([blob], fileName, { type: DOCX_MIME_TYPE });
  const preview = await renderPreview(docxFile);

  const formData = new FormData();
  formData.append("resumeId", resumeId);
  formData.append("file", docxFile, fileName);
  if (preview) {
    formData.append("thumbnail", preview, preview.name);
  }

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
