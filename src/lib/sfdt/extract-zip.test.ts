// @vitest-environment node
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { extractSfdtFromZipBase64 } from "./extract-zip";

const toBase64Zip = (files: Record<string, string>) => {
  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, content]) => [name, strToU8(content)]),
    ),
  );
  return Buffer.from(zipped).toString("base64");
};

describe("extractSfdtFromZipBase64", () => {
  it("returns the sfdt string from a file that has an `sfdt` field", () => {
    const base64 = toBase64Zip({
      "data.json": JSON.stringify({ sfdt: "RAW_SFDT_STRING" }),
    });
    expect(extractSfdtFromZipBase64(base64)).toEqual({
      kind: "sfdt",
      text: "RAW_SFDT_STRING",
      sourceName: "data.json",
    });
  });

  it("selects the sfdt-like candidate with the most text runs", () => {
    const few = JSON.stringify({ sec: [{ t: "one" }] });
    const many = JSON.stringify({ sec: [{ t: "a" }, { t: "b" }, { t: "c" }] });
    const base64 = toBase64Zip({ "few.json": few, "many.json": many });

    const result = extractSfdtFromZipBase64(base64);
    expect(result.kind).toBe("sfdt");
    if (result.kind === "sfdt") {
      expect(result.sourceName).toBe("many.json");
      expect(result.text).toBe(many);
    }
  });

  it("reports a docx archive when it contains word/document.xml", () => {
    const base64 = toBase64Zip({
      "word/document.xml": "<w:document/>",
      "[Content_Types].xml": "<Types/>",
    });
    expect(extractSfdtFromZipBase64(base64).kind).toBe("docx");
  });

  it("returns unknown for an archive with no sfdt or docx markers", () => {
    const base64 = toBase64Zip({ "readme.txt": "hello" });
    expect(extractSfdtFromZipBase64(base64)).toMatchObject({ kind: "unknown" });
  });
});
