import { convertDocxToPdf, PdfExportError } from "@/lib/pdf-export";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
  envMock: { CONVERT_API_SECRET: "test-secret" as string | undefined },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env.server", () => ({ serverEnv: envMock }));

const SECRET = "test-secret";
const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;

/** Builds an OK response shaped like ConvertAPI's JSON payload. */
const convertApiResponse = (fileData: unknown) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ Files: [{ FileData: fileData }] }),
  }) as unknown as Response;

const fetchMock = vi.fn();

beforeEach(() => {
  envMock.CONVERT_API_SECRET = SECRET;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("convertDocxToPdf", () => {
  it("returns the decoded PDF bytes", async () => {
    const pdfBytes = Buffer.from("%PDF-1.7 fake");
    fetchMock.mockResolvedValue(
      convertApiResponse(pdfBytes.toString("base64")),
    );

    const result = await convertDocxToPdf(docx, "resume.docx");

    expect(Buffer.from(new Uint8Array(result))).toEqual(pdfBytes);
  });

  it("uploads the document under the requested file name", async () => {
    fetchMock.mockResolvedValue(
      convertApiResponse(Buffer.from("pdf").toString("base64")),
    );

    await convertDocxToPdf(docx, "senior-dev-resume.docx");

    const [, init] = fetchMock.mock.calls[0];
    const body = init.body as FormData;
    const uploaded = body.get("File") as File;

    expect(uploaded.name).toBe("senior-dev-resume.docx");
    expect(uploaded.size).toBe(4);
  });

  it("refuses to call the service when no secret is configured", async () => {
    envMock.CONVERT_API_SECRET = undefined;

    // 501, not 502: nothing failed upstream, the deployment just has no
    // credentials, and the client must not offer a pointless retry.
    await expect(convertDocxToPdf(docx, "resume.docx")).rejects.toMatchObject({
      status: 501,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an upstream failure as a bad gateway", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 402 } as Response);

    await expect(convertDocxToPdf(docx, "resume.docx")).rejects.toMatchObject({
      status: 502,
    });
  });

  it("rejects a payload that carries no document", async () => {
    fetchMock.mockResolvedValue(convertApiResponse(undefined));

    await expect(convertDocxToPdf(docx, "resume.docx")).rejects.toBeInstanceOf(
      PdfExportError,
    );
  });

  it("keeps the secret out of the error it surfaces", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 } as Response);

    // The secret travels in the query string, so an error that echoed the
    // request URL would leak it into logs and into the client's toast.
    await expect(convertDocxToPdf(docx, "resume.docx")).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(SECRET),
      }) as Error,
    );
  });
});
