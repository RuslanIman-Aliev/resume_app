import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveEditorDocx } from "./resume-docx-api";

// The real module reaches for docx-preview and a DOM canvas, neither of which
// the test env provides - and the preview is best effort anyway.
const generateDocxThumbnail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/thumbnails-docx", () => ({ generateDocxThumbnail }));

type Editor = Parameters<typeof saveEditorDocx>[0];

const makeEditor = (saveAsBlob: unknown): Editor =>
  ({ saveAsBlob }) as unknown as Editor;

describe("saveEditorDocx", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    generateDocxThumbnail.mockReset();
    generateDocxThumbnail.mockResolvedValue(null);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("skips when the editor cannot export a blob", async () => {
    expect(await saveEditorDocx(undefined, "resume_1")).toEqual({
      skipped: true,
    });
    expect(await saveEditorDocx(makeEditor(undefined), "resume_1")).toEqual({
      skipped: true,
    });
  });

  it("uploads the exported blob and returns the parsed response", async () => {
    const saveAsBlob = vi.fn().mockResolvedValue(new Blob(["docx"]));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ resumeLink: "https://utfs.io/f/new" }), {
        status: 200,
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await saveEditorDocx(makeEditor(saveAsBlob), "resume_1");

    expect(saveAsBlob).toHaveBeenCalledWith("Docx");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resume/save-docx",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual({ resumeLink: "https://utfs.io/f/new" });
  });

  it("sends the rendered preview alongside the document", async () => {
    const preview = new File([new Blob(["jpeg"])], "preview.jpg", {
      type: "image/jpeg",
    });
    generateDocxThumbnail.mockResolvedValue(preview);

    const saveAsBlob = vi.fn().mockResolvedValue(new Blob(["docx"]));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await saveEditorDocx(makeEditor(saveAsBlob), "resume_1");

    // FormData re-wraps the file, so identity is not preserved - the name and
    // type are what the route reads.
    const body = fetchMock.mock.calls[0][1].body as FormData;
    const sent = body.get("thumbnail") as File;
    expect(body.get("resumeId")).toBe("resume_1");
    expect(sent.name).toBe("preview.jpg");
    expect(sent.type).toBe("image/jpeg");
  });

  it("still saves when the preview cannot be rendered", async () => {
    generateDocxThumbnail.mockRejectedValue(new Error("no canvas"));

    const saveAsBlob = vi.fn().mockResolvedValue(new Blob(["docx"]));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await saveEditorDocx(makeEditor(saveAsBlob), "resume_1");

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect(body.get("thumbnail")).toBeNull();
  });

  it("falls back to lowercase docx format when the first export throws", async () => {
    const saveAsBlob = vi
      .fn()
      .mockRejectedValueOnce(new Error("bad format"))
      .mockResolvedValueOnce(new Blob(["docx"]));
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 })) as unknown as typeof fetch;

    await saveEditorDocx(makeEditor(saveAsBlob), "resume_1");

    expect(saveAsBlob).toHaveBeenNthCalledWith(1, "Docx");
    expect(saveAsBlob).toHaveBeenNthCalledWith(2, "docx");
  });

  it("throws with the server error message when the upload fails", async () => {
    const saveAsBlob = vi.fn().mockResolvedValue(new Blob(["docx"]));
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Boom" }), { status: 500 }),
    ) as unknown as typeof fetch;

    await expect(
      saveEditorDocx(makeEditor(saveAsBlob), "resume_1"),
    ).rejects.toThrow("Boom");
  });
});
