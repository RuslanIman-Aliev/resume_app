type EditorWithBlobExport = {
  saveAsBlob?: (format: string) => Promise<Blob>;
};

/**
 * Exports the current editor contents as DOCX and persists the new file through
 * the UploadThing-backed `/api/resume/save-docx` endpoint. The API updates both
 * the uploaded file and the stored `resumeLink`, so the next refresh reads the
 * newly saved version.
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
