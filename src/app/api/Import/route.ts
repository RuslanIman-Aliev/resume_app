import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { serverEnv } from "@/lib/env.server";

const DOCUMENT_EDITOR_SERVICE_URL = serverEnv.DOCUMENT_EDITOR_SERVICE_URL;

// Uploads are capped at 4MB, but the editor can also relay larger SFDT JSON.
const MAX_IMPORT_SIZE_BYTES = 15 * 1024 * 1024;

// Matches the budget in /api/docx-to-sfdt: the Import service cold start is
// slower than the platform default timeout.
export const maxDuration = 60;

const normalizeServiceUrl = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceUrl = DOCUMENT_EDITOR_SERVICE_URL;

    if (!serviceUrl) {
      // 501 for the same reason as /api/docx-to-sfdt: an unconfigured
      // deployment is not a failed request, and the caller should not retry.
      logError(
        "Import proxy is unconfigured",
        new Error("DOCUMENT_EDITOR_SERVICE_URL is not set"),
      );
      return NextResponse.json(
        { error: "Document conversion is not configured" },
        { status: 501 },
      );
    }

    const formData = await request.formData();
    const uploadedFile = Array.from(formData.values()).find(
      (value): value is File => value instanceof File,
    );

    if (!uploadedFile) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (uploadedFile.size > MAX_IMPORT_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds max size" },
        { status: 413 },
      );
    }

    const uploadedText = await uploadedFile.text().catch(() => "");
    const trimmedText = uploadedText.trim();

    if (
      trimmedText.startsWith("{") &&
      (trimmedText.includes('"optimizeSfdt"') || trimmedText.includes('"sec"'))
    ) {
      return new NextResponse(trimmedText, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const proxyFormData = new FormData();
    proxyFormData.append(
      "files",
      uploadedFile,
      uploadedFile.name || "document.docx",
    );

    const response = await fetch(`${normalizeServiceUrl(serviceUrl)}Import`, {
      method: "POST",
      body: proxyFormData,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to convert document",
          upstreamStatus: response.status,
          upstreamStatusText: response.statusText,
          details,
        },
        { status: 502 },
      );
    }

    const sfdtText = await response.text();

    return new NextResponse(sfdtText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("Import proxy error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
