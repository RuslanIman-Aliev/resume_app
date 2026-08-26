import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { logError } from "@/lib/logger";
import { convertDocxToPdf, PdfExportError } from "@/lib/pdf-export";
import { rateLimit } from "@/lib/rate-limit";
import { assertAllowedFileUrl, SafeFetchError } from "@/lib/safe-fetch";

/**
 * POST /api/resume/export-pdf
 *
 * Accepts JSON: { resumeId: string }
 *
 * Auth: requires a valid session cookie; the resume must belong to the caller.
 *
 * Success: 200 with `application/pdf` bytes and an attachment disposition.
 *
 * Errors:
 * - 400: Missing/invalid resumeId, or the stored file URL is unusable
 * - 401: Unauthorized
 * - 404: Resume not found or not owned by the caller
 * - 413: Stored file exceeds the conversion size cap
 * - 415: Stored file is neither a PDF nor a DOCX
 * - 429: Too many exports
 * - 501: PDF export is not configured on this deployment
 * - 502: Conversion service failed
 */

/** Matches the 4MB cap the uploader enforces, so nothing larger can exist. */
const MAX_SOURCE_SIZE_BYTES = 4 * 1024 * 1024;

/**
 * Each conversion costs credits at the upstream provider, so exports are capped
 * per user the same way AI triggers are. The limit is loose enough that a person
 * re-downloading after a tweak never notices it.
 */
const EXPORT_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

const bodySchema = z.object({ resumeId: z.string().min(1) });

/** `%PDF` — the leading bytes of every PDF file. */
const isPdfSignature = (bytes: Uint8Array) =>
  bytes[0] === 0x25 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x44 &&
  bytes[3] === 0x46;

/** `PK` — DOCX is a zip archive, so it starts with the zip local file header. */
const isZipSignature = (bytes: Uint8Array) =>
  bytes[0] === 0x50 && bytes[1] === 0x4b;

/**
 * Builds the name the browser saves the download under.
 *
 * Falls back to the resume id when the display name has no ASCII content, which
 * is what happens for a resume named entirely in Cyrillic - a bare ".pdf" would
 * otherwise reach the save dialog.
 */
const buildPdfFileName = (resumeId: string, resumeName: string | null) => {
  const slug = slugify(resumeName ?? "").slice(0, 100);
  return `${slug || `resume-${resumeId}`}.pdf`;
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedBody = bodySchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    const limit = rateLimit(
      `export-pdf:${session.user.id}`,
      EXPORT_RATE_LIMIT,
    );
    if (!limit.success) {
      return NextResponse.json(
        {
          error: `Too many exports. Please wait ${Math.ceil(
            limit.retryAfterMs / 1000,
          )}s and try again.`,
        },
        { status: 429 },
      );
    }

    const resume = await prisma.resume.findFirst({
      where: { id: parsedBody.data.resumeId, userId: session.user.id },
      select: { id: true, resumeLink: true, resumeName: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const fileUrl = assertAllowedFileUrl(resume.resumeLink);
    const fileResponse = await fetch(fileUrl);

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch the stored resume" },
        { status: 400 },
      );
    }

    const sourceBuffer = await fileResponse.arrayBuffer();

    if (sourceBuffer.byteLength > MAX_SOURCE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Resume exceeds max size" },
        { status: 413 },
      );
    }

    const signature = new Uint8Array(sourceBuffer.slice(0, 4));
    const fileName = buildPdfFileName(resume.id, resume.resumeName);

    // Resumes uploaded as PDF need no conversion - returning the stored file
    // keeps the original text layer intact and spends no conversion credits.
    const docxName = `${fileName.slice(0, -".pdf".length)}.docx`;
    const pdf = isPdfSignature(signature)
      ? sourceBuffer
      : isZipSignature(signature)
        ? await convertDocxToPdf(sourceBuffer, docxName)
        : null;

    if (!pdf) {
      return NextResponse.json(
        { error: "Stored resume is neither a PDF nor a DOCX" },
        { status: 415 },
      );
    }

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof PdfExportError) {
      return NextResponse.json({ error: error.message }, {
        status: error.status,
      });
    }
    if (error instanceof SafeFetchError) {
      return NextResponse.json({ error: error.message }, {
        status: error.status,
      });
    }
    logError("export-pdf error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
