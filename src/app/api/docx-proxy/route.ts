import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { assertAllowedFileUrl, SafeFetchError } from "@/lib/safe-fetch";

const urlSchema = z.object({ url: z.string().url() });

const isDocxContentType = (contentType: string) =>
  contentType.includes(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ) ||
  contentType.includes("application/msword") ||
  contentType.includes("application/octet-stream");

const getUrlFromRequest = async (request: Request) => {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      if (typeof body?.url === "string") return body.url;
    } catch {
      return "";
    }
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await request.formData();
    const formUrl = form.get("url");
    if (typeof formUrl === "string") return formUrl;
  }

  const urlParam = new URL(request.url).searchParams.get("url");
  return urlParam ?? "";
};

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawUrl = await getUrlFromRequest(request);
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

    const contentType = fileResponse.headers.get("content-type") || "";
    if (!isDocxContentType(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type", contentType },
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
          contentType,
          signature: signatureHex,
        },
        { status: 415 },
      );
    }

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SafeFetchError) {
      return NextResponse.json({ error: error.message }, {
        status: error.status,
      });
    }
    logError("docx-proxy error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
