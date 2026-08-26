import "server-only";

import { serverEnv } from "@/lib/env.server";

/** ConvertAPI's DOCX to PDF endpoint. */
const CONVERT_ENDPOINT = "https://v2.convertapi.com/convert/docx/to/pdf";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Error carrying an HTTP status so a route handler can translate a failed
 * conversion into the right response code instead of a blanket 500.
 */
export class PdfExportError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "PdfExportError";
    this.status = status;
  }
}

/**
 * Shape of the slice of ConvertAPI's response we actually read.
 * `FileData` is the converted document, base64 encoded.
 */
type ConvertApiResponse = {
  Files?: { FileData?: unknown }[];
};

/**
 * Converts a DOCX payload to PDF through ConvertAPI.
 *
 * The conversion runs server-side on purpose. The usual browser-side trick -
 * rendering each page to a canvas and wrapping the images in a PDF - produces a
 * *picture* of a resume, and an ATS extracts no text from it. Since the product
 * exists to get resumes through ATS filters, the exported file has to keep a
 * real text layer, which is what this conversion preserves.
 *
 * @param docx - The DOCX bytes to convert.
 * @param fileName - Name sent along with the upload; ConvertAPI echoes it back
 *   in the converted file name, and it shows up in their dashboard.
 * @returns The PDF bytes as a plain `ArrayBuffer`, ready to be a response body.
 * @throws {PdfExportError} If export is unconfigured, or the upstream call or
 *   its payload fails.
 */
export const convertDocxToPdf = async (
  docx: ArrayBuffer,
  fileName: string,
): Promise<ArrayBuffer> => {
  const secret = serverEnv.CONVERT_API_SECRET;

  if (!secret) {
    // 501 rather than 500: nothing is broken, the deployment simply has no
    // conversion credentials, and the client should say so rather than offer a
    // retry that cannot succeed.
    throw new PdfExportError("PDF export is not configured", 501);
  }

  const form = new FormData();
  form.append("File", new Blob([docx], { type: DOCX_MIME }), fileName);

  let response: Response;
  try {
    // The secret rides in the query string because that is what ConvertAPI's v2
    // REST API accepts. Nothing here logs or returns the request URL for that
    // reason - only the status code ever leaves this function.
    response = await fetch(
      `${CONVERT_ENDPOINT}?Secret=${encodeURIComponent(secret)}`,
      { method: "POST", body: form },
    );
  } catch {
    throw new PdfExportError("Could not reach the PDF conversion service");
  }

  if (!response.ok) {
    throw new PdfExportError(
      `PDF conversion failed (upstream status ${response.status})`,
    );
  }

  let payload: ConvertApiResponse;
  try {
    payload = (await response.json()) as ConvertApiResponse;
  } catch {
    throw new PdfExportError("PDF conversion returned a malformed response");
  }

  const base64 = payload.Files?.[0]?.FileData;

  if (typeof base64 !== "string" || base64.length === 0) {
    throw new PdfExportError("PDF conversion returned no document");
  }

  // Copied into a freshly allocated Uint8Array so the result is backed by a
  // plain ArrayBuffer: a Buffer's own `.buffer` is a shared pool slice, and its
  // `ArrayBufferLike` type is not accepted as a response body.
  const decoded = Buffer.from(base64, "base64");
  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);

  return bytes.buffer;
};
