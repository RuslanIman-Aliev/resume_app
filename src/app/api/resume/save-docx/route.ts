import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { extractResumeContent } from "@/lib/resume-extraction";
import { extractUploadThingKey } from "@/lib/uploadthing-files";

/**
 * POST /api/resume/save-docx
 *
 * Accepts multipart/form-data with:
 * - resumeId: string (required)
 * - file: File (required, DOCX <= 4MB)
 * - thumbnail: File (optional, JPEG/PNG preview rendered by the client)
 *
 * Auth: requires a valid session cookie.
 *
 * Success: 200 JSON { resumeLink: string }
 *
 * Errors:
 * - 400: Missing resumeId or file
 * - 401: Unauthorized
 * - 413: File exceeds max size
 * - 415: Unsupported file type
 * - 422: Saved document could not be parsed back into resume text
 * - 404: Resume not found or not owned by user
 * - 502: UploadThing upload failed
 * - 500: Internal server error
 *
 * Side effects:
 * - Uploads a new DOCX to UploadThing
 * - Updates Resume.resumeLink, fileName and parsedContent
 * - Clears Resume.structuredData, which described the replaced file
 * - Updates Resume.resumePreviewLink when a thumbnail is supplied
 * - Best-effort deletes the previous UploadThing file(s) (if applicable)
 */
const utapi = new UTApi();
const MAX_DOCX_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE_BYTES = 4 * 1024 * 1024;
const THUMBNAIL_MIME_TYPES = ["image/jpeg", "image/png"];

/**
 * Checks whether a MIME type corresponds to a DOCX payload.
 * @param value - MIME type string from the client file
 * @returns True if the type is a DOCX-like Office document
 */
const isDocxMimeType = (value: string) =>
  value.includes(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ) || value.includes("application/msword");

/**
 * Builds a safe DOCX filename based on prior name or resume id.
 * @param resumeId - Resume id used as a fallback name
 * @param currentName - Previous file name stored in the DB
 * @returns Sanitized filename ending in .docx
 */
const buildNextFileName = (resumeId: string, currentName: string | null) => {
  const baseName = (currentName || `resume-${resumeId}`)
    .replace(/\.[^/.]+$/, "")
    .trim();
  const safeBase = baseName.slice(0, 200) || `resume-${resumeId}`;
  return `${safeBase}.docx`;
};

/**
 * Uploads the client-rendered preview image, if one was sent.
 *
 * The thumbnail is produced in the browser (`@/lib/thumbnails` needs a DOM),
 * so it arrives as an extra form field rather than being rendered here. It is
 * best effort on purpose: a failed preview upload must not cost the user the
 * document they just saved, so the caller keeps the previous image instead.
 *
 * @param thumbnail - The `thumbnail` form field, of any type.
 * @returns The uploaded preview URL, or null when there is nothing usable.
 */
const uploadPreview = async (thumbnail: FormDataEntryValue | null) => {
  if (!(thumbnail instanceof File)) return null;
  if (!THUMBNAIL_MIME_TYPES.includes(thumbnail.type)) return null;
  if (thumbnail.size === 0 || thumbnail.size > MAX_THUMBNAIL_SIZE_BYTES) {
    return null;
  }

  try {
    const response = await utapi.uploadFiles([thumbnail]);
    const result = Array.isArray(response) ? response[0] : response;
    const data = (result as { data?: { url?: string } })?.data;
    return data?.url ?? null;
  } catch (error) {
    logError("Failed to upload resume preview", error);
    return null;
  }
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const resumeId = formData.get("resumeId");
    const file = formData.get("file");
    const thumbnail = formData.get("thumbnail");

    if (typeof resumeId !== "string" || !resumeId.trim()) {
      return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!isDocxMimeType(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 },
      );
    }

    if (file.size > MAX_DOCX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds max size" },
        { status: 413 },
      );
    }

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: session.user.id },
      select: {
        resumeLink: true,
        resumePreviewLink: true,
        fileName: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const nextFileName = buildNextFileName(resumeId, resume.fileName ?? null);
    const arrayBuffer = await file.arrayBuffer();

    // The saved file is what every later analysis is supposed to score, so the
    // stored text is re-derived from these bytes. Writing only `resumeLink`
    // left `parsedContent` describing the file this one replaced, and the next
    // analysis silently graded the pre-edit resume.
    //
    // Done before the upload: a document this parser cannot read is rejected
    // without leaving a file in storage that nothing points at.
    let extractedText: string | null;
    try {
      ({ extractedText } = await extractResumeContent(
        nextFileName,
        arrayBuffer,
      ));
    } catch (error) {
      logError("save-docx text extraction failed", error);
      return NextResponse.json(
        { error: "Could not read the saved document" },
        { status: 422 },
      );
    }

    const uploadFile = new File([arrayBuffer], nextFileName, {
      type: file.type,
    });

    const uploadResponse = await utapi.uploadFiles([uploadFile]);
    const uploadResult = Array.isArray(uploadResponse)
      ? uploadResponse[0]
      : uploadResponse;

    const uploadData = (uploadResult as { data?: unknown })?.data as
      | {
          key?: string;
          url?: string;
          name?: string;
        }
      | undefined;

    if (!uploadData?.url || !uploadData.key) {
      return NextResponse.json(
        { error: "Failed to upload resume" },
        { status: 502 },
      );
    }

    const previewUrl = await uploadPreview(thumbnail);

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        resumeLink: uploadData.url,
        fileName: uploadData.name || nextFileName,
        parsedContent: extractedText,
        // The section ids in `structuredData` point at sentences that may no
        // longer exist in the edited document, so it is dropped rather than
        // kept and mismatched. The next analysis rebuilds it; until then
        // `applyImprovement` and the job-match prompt fall back to the text.
        structuredData: Prisma.DbNull,
        ...(previewUrl ? { resumePreviewLink: previewUrl } : {}),
      },
    });

    const staleKeys = [
      extractUploadThingKey(resume.resumeLink),
      previewUrl ? extractUploadThingKey(resume.resumePreviewLink) : null,
    ].filter(
      (key): key is string => Boolean(key) && key !== uploadData.key,
    );

    for (const staleKey of staleKeys) {
      try {
        await utapi.deleteFiles(staleKey);
      } catch (error) {
        logError("Failed to delete previous resume file", error);
      }
    }

    return NextResponse.json({
      resumeLink: uploadData.url,
      ...(previewUrl ? { resumePreviewLink: previewUrl } : {}),
    });
  } catch (error) {
    logError("save-docx error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
