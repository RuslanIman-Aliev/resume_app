/**
 * PDF preview rendering, kept apart from the DOCX renderer in
 * `@/lib/thumbnails-docx` because this module loads pdf.js at import time.
 * The resume editor renders a preview of the DOCX it just saved and has no
 * use for pdf.js; importing both from one module pulled a second copy of it
 * into that route's chunks.
 */
import * as pdfjsLib from "pdfjs-dist";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Generates a JPEG thumbnail from the first page of a PDF file.
 * @param file - PDF file object to generate thumbnail from
 * @returns Promise resolving to a new File object containing the thumbnail image
 * @throws Error if canvas conversion or PDF parsing fails
 */
export const generatePdfThumbnail = async (file: File): Promise<File> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: ctx!,
    viewport: viewport,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(
            new File([blob], `${file.name}-thumbnail.jpg`, {
              type: "image/jpeg",
            }),
          );
        } else {
          reject(new Error("Canvas to Blob failed"));
        }
      },
      "image/jpeg",
      0.8,
    );
  });
};
