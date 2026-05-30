import { NextResponse } from "next/server";
import { strFromU8, unzipSync } from "fflate";

const DOCUMENT_EDITOR_SERVICE_URL = process.env.DOCUMENT_EDITOR_SERVICE_URL;

const normalizeServiceUrl = (value: string) =>
  value.endsWith("/") ? value : `${value}/`;

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
    console.error("docx-to-sfdt error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
// Note: normalization helper removed (unused) to satisfy lint rules.
