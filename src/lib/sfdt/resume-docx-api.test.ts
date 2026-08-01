import { afterEach, describe, expect, it, vi } from "vitest";
import { saveEditorDocx } from "./resume-docx-api";

type Editor = Parameters<typeof saveEditorDocx>[0];

const makeEditor = (saveAsBlob: unknown): Editor =>
  ({ saveAsBlob }) as unknown as Editor;

describe("saveEditorDocx", () => {
  const originalFetch = global.fetch;

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
