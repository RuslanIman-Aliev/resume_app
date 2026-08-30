import { toBlob } from "html-to-image";
import { renderAsync } from "docx-preview";
import { logError } from "./logger";

/**
 * DOCX preview rendering. Split from `@/lib/thumbnails` so a caller that only
 * needs this - the editor's save path, which imports it lazily - does not
 * also pull in pdf.js.
 */

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
