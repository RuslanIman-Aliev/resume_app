import mammoth from "mammoth";
import { extractText } from "unpdf";
import { normalizeResumeParsedContent } from "./resume-content";

/**
 * Turning an uploaded resume file into the text the analyser reads.
 *
 * This lives outside the UploadThing route because two places write
 * `resume.parsedContent`: the initial upload and `/api/resume/save-docx`, which
 * replaces the file after the user edits it in the browser. While only the
 * upload path extracted text, an edited resume kept the text of the file it
 * replaced, and every later analysis scored the pre-edit version.
 */

/** File kinds the extractor understands, as stored in the upload result. */
export type ResumeFileKind = "docx" | "pdf" | "image";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"] as const;

/**
 * Reports whether a file name looks like one of the accepted image uploads,
 * which are stored as-is and carry no text to extract.
 *
 * @param fileName - Original file name from the upload.
 */
export const isResumeImageFile = (fileName: string) => {
  const normalized = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
};

/**
 * Extracts the resume text from an uploaded file's bytes.
 *
 * DOCX goes through `convertToHtml` because the analyser keeps the document's
 * structure; `.doc` and PDF have no usable markup, so they yield plain text.
 * Every branch runs the result through `normalizeResumeParsedContent`, so the
 * two callers cannot drift into storing differently shaped content.
 *
 * @param fileName - Original file name, used to pick the parser.
 * @param data - Raw bytes of the uploaded file.
 * @returns The normalized resume text (null when the file held none) and
 *   the kind of file it came from.
 * @throws Error when the extension is not a supported resume format.
 */
export const extractResumeContent = async (
  fileName: string,
  data: ArrayBuffer,
): Promise<{ extractedText: string | null; type: ResumeFileKind }> => {
  const normalizedFileName = fileName.toLowerCase();

  if (normalizedFileName.endsWith(".docx")) {
    const { value: extractedHtml } = await mammoth.convertToHtml({
      buffer: Buffer.from(data),
    });

    return {
      extractedText: normalizeResumeParsedContent(extractedHtml),
      type: "docx",
    };
  }

  if (normalizedFileName.endsWith(".doc")) {
    const { value: extractedText } = await mammoth.extractRawText({
      buffer: Buffer.from(data),
    });

    return {
      extractedText: normalizeResumeParsedContent(extractedText),
      type: "docx",
    };
  }

  if (normalizedFileName.endsWith(".pdf")) {
    const { text } = await extractText(new Uint8Array(data), {
      mergePages: true,
    });

    return {
      extractedText: normalizeResumeParsedContent(text),
      type: "pdf",
    };
  }

  throw new Error("Unsupported file format.");
};
