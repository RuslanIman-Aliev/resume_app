import { NextResponse } from "next/server";

const DOCUMENT_EDITOR_SERVICE_URL = process.env.DOCUMENT_EDITOR_SERVICE_URL;

const normalizeServiceUrl = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export async function POST(request: Request) {
  try {
    const serviceUrl = DOCUMENT_EDITOR_SERVICE_URL;

    if (!serviceUrl) {
      return NextResponse.json(
        { error: "DOCUMENT_EDITOR_SERVICE_URL is not configured" },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    console.log(
      "[Import proxy] form entries:",
      Array.from(formData.entries()).map(([key, value]) => [
        key,
        value instanceof File
          ? {
              type: "file",
              name: value.name,
              size: value.size,
              mimeType: value.type,
            }
          : { type: typeof value, value },
      ]),
    );
    const uploadedFile = Array.from(formData.values()).find((value) => {
      return (
        value !== null &&
        typeof value === "object" &&
        "arrayBuffer" in value &&
        "size" in value
      );
    }) as (Blob & { name?: string }) | undefined;

    if (!uploadedFile) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
    console.error("Import proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
