import { NextResponse } from "next/server";

const DOCUMENT_EDITOR_SERVICE_URL = process.env.DOCUMENT_EDITOR_SERVICE_URL;

const normalizeServiceUrl = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

export async function POST(request: Request) {
  try {
    const requestContentType = request.headers.get("content-type") || "";
    let url = "";

    if (requestContentType.includes("application/json")) {
      try {
        const body = await request.json();
        url = typeof body?.url === "string" ? body.url : "";
      } catch {
        url = "";
      }
    } else if (
      requestContentType.includes("multipart/form-data") ||
      requestContentType.includes("application/x-www-form-urlencoded")
    ) {
      const form = await request.formData();
      const formUrl = form.get("url");
      url = typeof formUrl === "string" ? formUrl : "";
    } else {
      url = new URL(request.url).searchParams.get("url") ?? "";
    }

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

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

    const sfdtResponse = await fetch(
      `${normalizeServiceUrl(DOCUMENT_EDITOR_SERVICE_URL!)}Import`,
      {
        method: "POST",
        body: formData,
      },
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

    const sfdtText = await sfdtResponse.text();

    return new NextResponse(sfdtText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("docx-to-sfdt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
