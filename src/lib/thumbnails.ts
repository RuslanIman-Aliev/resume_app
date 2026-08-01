import * as pdfjsLib from "pdfjs-dist";
import { toBlob } from "html-to-image";
import { renderAsync } from "docx-preview";
import { logError } from "./logger";

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

/**
 * Generates a JPEG thumbnail from a DOCX (Word) document.
 * Converts the document to HTML, renders it in a hidden container, and captures as image.
 * @param file - DOCX file object to generate thumbnail from
 * @returns Promise resolving to a new File object containing the thumbnail image
 * @throws Error if document conversion or image generation fails
 */
export const generateDocxThumbnail = async (file: File): Promise<File> => {
  const arrayBuffer = await file.arrayBuffer();

  const secretWrapper = document.createElement("div");
  secretWrapper.style.position = "fixed";
  secretWrapper.style.top = "0";
  secretWrapper.style.left = "0";
  secretWrapper.style.overflow = "hidden";
  secretWrapper.style.opacity = "0";
  secretWrapper.style.pointerEvents = "none";
  secretWrapper.style.zIndex = "-9999";

  const container = document.createElement("div");
  container.style.backgroundColor = "#ffffff";

  secretWrapper.appendChild(container);
  document.body.appendChild(secretWrapper);

  try {
    await renderAsync(arrayBuffer, container, undefined, {
      className: "docx",
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    const blob = await toBlob(container, {
      quality: 0.8,
      backgroundColor: "#ffffff",
      pixelRatio: 1,
    });

    if (!blob) {
      throw new Error("Failed to generate image blob");
    }

    return new File([blob], `${file.name}-thumbnail.jpg`, {
      type: "image/jpeg",
    });
  } catch (error) {
    logError("docx-to-image error", error);
    throw error;
  } finally {
    document.body.removeChild(secretWrapper);
  }
};
