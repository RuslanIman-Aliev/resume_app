import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * POST /api/resume/save-docx
 *
 * Accepts multipart/form-data with:
 * - resumeId: string (required)
 * - file: File (required, DOCX <= 4MB)
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
 * - 404: Resume not found or not owned by user
 * - 502: UploadThing upload failed
 * - 500: Internal server error
 *
 * Side effects:
 * - Uploads a new DOCX to UploadThing
 * - Updates Resume.resumeLink and fileName
 * - Best-effort deletes the previous UploadThing file (if applicable)
 */
const utapi = new UTApi();
const MAX_DOCX_SIZE_BYTES = 4 * 1024 * 1024;

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
 * Extracts an UploadThing file key from a public URL.
 * Returns null for non-UploadThing URLs or malformed values.
 * @param url - Public URL stored in resumeLink
 * @returns UploadThing file key or null
 */
const extractUploadThingKey = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("uploadthing") && !host.includes("utfs.io")) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  } catch {
    return null;
  }
};

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

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const resumeId = formData.get("resumeId");
    const file = formData.get("file");

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
        fileName: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const nextFileName = buildNextFileName(resumeId, resume.fileName ?? null);
    const arrayBuffer = await file.arrayBuffer();
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

    await prisma.resume.update({
      where: { id: resumeId },
      data: {
        resumeLink: uploadData.url,
        fileName: uploadData.name || nextFileName,
      },
    });

    const previousKey = extractUploadThingKey(resume.resumeLink);
    if (previousKey && previousKey !== uploadData.key) {
      try {
        await utapi.deleteFiles(previousKey);
      } catch (error) {
        console.warn("Failed to delete previous resume file", error);
      }
    }

    return NextResponse.json({ resumeLink: uploadData.url });
  } catch (error) {
    console.error("save-docx error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
