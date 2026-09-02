import { NextResponse } from "next/server";
import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { assertAllowedFileUrl, SafeFetchError } from "@/lib/safe-fetch";
import { serverEnv } from "@/lib/env.server";
import { delay } from "@/lib/sfdt/delay";

const DOCUMENT_EDITOR_SERVICE_URL = serverEnv.DOCUMENT_EDITOR_SERVICE_URL;

// The Import service sleeps when idle and its cold start runs well past the
// platform default, which surfaced as a converted-to-plain-text resume rather
// than an error.
export const maxDuration = 60;

const urlSchema = z.object({ url: z.string().url() });

const normalizeServiceUrl = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

/**
 * Waits between Import attempts. A retry fired immediately hits the same cold
 * instance that just failed, so each attempt gives it more time to finish
 * starting; the total stays inside `maxDuration`.
 */
const IMPORT_RETRY_DELAYS_MS = [1_000, 4_000, 9_000];

/**
 * Posts to the Import service, retrying a failed wake-up. A sleeping instance
 * fails or 5xx-es the requests that wake it and answers a later one normally,
 * and a conversion that gives up here surfaces as a resume shown as plain text.
 */
const postToImportService = async (serviceUrl: string, body: FormData) => {
  const endpoint = `${normalizeServiceUrl(serviceUrl)}Import`;
  const attemptCount = IMPORT_RETRY_DELAYS_MS.length + 1;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const isLastAttempt = attempt === attemptCount - 1;

    try {
      const response = await fetch(endpoint, { method: "POST", body });
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`Import service responded ${response.status}`);
      if (isLastAttempt) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (isLastAttempt) {
        throw error;
      }
    }

    await delay(IMPORT_RETRY_DELAYS_MS[attempt]);
  }

  throw lastError ?? new Error("Import service unreachable");
};

const isSfdtLike = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.sec) || Array.isArray(record.sections);
};

type ExtractedSfdtResult =
  | { kind: "sfdt"; text: string; sourceName?: string }
  | { kind: "docx"; fileNames: string[] }
  | { kind: "unknown"; fileNames: string[] };

const extractSfdtFromBase64Zip = (value: string): ExtractedSfdtResult => {
  const bytes = new Uint8Array(Buffer.from(value, "base64"));
  const files = unzipSync(bytes);
  const fileNames = Object.keys(files);

  const candidates: Array<{ name: string; text: string; textRuns: number }> =
    [];

  for (const name of fileNames) {
    const text = strFromU8(files[name]).trim();
    if (!text.startsWith("{")) continue;

    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.sfdt === "string") {
        return { kind: "sfdt", text: parsed.sfdt, sourceName: name };
      }
      if (isSfdtLike(parsed)) {
        const textRuns = text.match(/"(t|tlp|text)":"[^"]*"/g)?.length ?? 0;
        candidates.push({ name, text, textRuns });
      }
    } catch {
      continue;
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => {
      if (b.textRuns !== a.textRuns) return b.textRuns - a.textRuns;
      return b.text.length - a.text.length;
    });
    const best = candidates[0];
    return { kind: "sfdt", text: best.text, sourceName: best.name };
  }

  const hasWordDocument = Boolean(files["word/document.xml"]);
  const hasContentTypes = Boolean(files["[Content_Types].xml"]);
  if (hasWordDocument && hasContentTypes) {
    return { kind: "docx", fileNames };
  }

  return { kind: "unknown", fileNames };
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!DOCUMENT_EDITOR_SERVICE_URL) {
      // 501 rather than 500, the same distinction `convertDocxToPdf` makes:
      // nothing failed, this deployment simply has no conversion service, and
      // the editor should say so instead of offering a retry that cannot
      // succeed. The variable name stays in the log, not in the response.
      logError(
        "docx-to-sfdt is unconfigured",
        new Error("DOCUMENT_EDITOR_SERVICE_URL is not set"),
      );
      return NextResponse.json(
        { error: "Document conversion is not configured" },
        { status: 501 },
      );
    }

    const requestContentType = request.headers.get("content-type") || "";
    let rawUrl = "";

    if (requestContentType.includes("application/json")) {
      try {
        const body = await request.json();
        rawUrl = typeof body?.url === "string" ? body.url : "";
      } catch {
        rawUrl = "";
      }
    } else if (
      requestContentType.includes("multipart/form-data") ||
      requestContentType.includes("application/x-www-form-urlencoded")
    ) {
      const form = await request.formData();
      const formUrl = form.get("url");
      rawUrl = typeof formUrl === "string" ? formUrl : "";
    } else {
      rawUrl = new URL(request.url).searchParams.get("url") ?? "";
    }

    const parsedInput = urlSchema.safeParse({ url: rawUrl });
    if (!parsedInput.success) {
      return NextResponse.json({ error: "No valid URL provided" }, {
        status: 400,
      });
    }

    const url = assertAllowedFileUrl(parsedInput.data.url);

    const fileResponse = await fetch(url);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch document from URL" },
        { status: 400 },
      );
    }

    const responseContentType = fileResponse.headers.get("content-type") || "";
    const isDocxLike =
      responseContentType.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ) ||
      responseContentType.includes("application/msword") ||
      responseContentType.includes("application/octet-stream");

    if (!isDocxLike) {
      return NextResponse.json(
        { error: "Unsupported file type", contentType: responseContentType },
        { status: 415 },
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const signatureBytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const signatureHex = Array.from(signatureBytes)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(" ");
    const isZipSignature =
      signatureBytes[0] === 0x50 && signatureBytes[1] === 0x4b;

    if (!isZipSignature) {
      return NextResponse.json(
        {
          error: "Invalid DOCX file signature",
          contentType: responseContentType,
          signature: signatureHex,
        },
        { status: 415 },
      );
    }

    const blob = new Blob([arrayBuffer], {
      type: responseContentType || "application/octet-stream",
    });
    const formData = new FormData();
    formData.append("files", blob, "resume.docx");

    const sfdtResponse = await postToImportService(
      DOCUMENT_EDITOR_SERVICE_URL,
      formData,
    );

    if (!sfdtResponse.ok) {
      const details = await sfdtResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to convert document",
          upstreamStatus: sfdtResponse.status,
          upstreamStatusText: sfdtResponse.statusText,
          details,
        },
        { status: 502 },
      );
    }

    let sfdtText = await sfdtResponse.text();
    let trimmed = sfdtText.trim();
    let sfdtSource = "raw";

    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        trimmed = JSON.parse(trimmed);
      } catch {
        // keep original
      }
    }

    if (trimmed.startsWith("{")) {
      sfdtSource = "json";
      try {
        const parsed = JSON.parse(trimmed) as { sfdt?: string } & Record<
          string,
          unknown
        >;
        if (typeof parsed.sfdt === "string") {
          const sfdtValue = parsed.sfdt.trim();
          if (sfdtValue.startsWith("UEsDB")) {
            const extracted = extractSfdtFromBase64Zip(sfdtValue);
            if (extracted.kind === "sfdt") {
              sfdtText = extracted.text;
              sfdtSource = "json:zip";
            } else {
              return NextResponse.json(
                {
                  error: "SFDT not found in Import response",
                  details: extracted,
                },
                { status: 502 },
              );
            }
          } else {
            sfdtText = parsed.sfdt;
            sfdtSource = "json:sfdt";
          }
        } else if (isSfdtLike(parsed)) {
          sfdtText = trimmed;
          sfdtSource = "json:sfdt-like";
        }
      } catch {
        sfdtText = trimmed;
      }
    } else if (trimmed.startsWith("UEsDB")) {
      const extracted = extractSfdtFromBase64Zip(trimmed);
      if (extracted.kind === "sfdt") {
        sfdtText = extracted.text;
        sfdtSource = "zip:sfdt";
      } else {
        return NextResponse.json(
          {
            error: "SFDT not found in Import response",
            details: extracted,
          },
          { status: 502 },
        );
      }
    } else {
      sfdtText = trimmed;
    }

    const response = new NextResponse(sfdtText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-sfdt-normalized": "0",
        "x-sfdt-source": sfdtSource,
      },
    });
    return response;
  } catch (error) {
    if (error instanceof SafeFetchError) {
      return NextResponse.json({ error: error.message }, {
        status: error.status,
      });
    }
    logError("docx-to-sfdt error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
// Note: normalization helper removed (unused) to satisfy lint rules.
