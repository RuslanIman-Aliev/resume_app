import { describe, expect, it } from "vitest";
import { getInsertionPreview, stripHtml } from "./text";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello   <b>World</b></p>")).toBe("Hello World");
  });

  it("trims surrounding whitespace", () => {
    expect(stripHtml("  plain  ")).toBe("plain");
  });
});

describe("getInsertionPreview", () => {
  it("marks empty beforeText as not found", () => {
    expect(getInsertionPreview("some resume", "")).toEqual({
      prefix: "",
      match: "",
      suffix: "",
      isTruncated: false,
      isFound: false,
    });
  });

  it("returns surrounding context when the text is found", () => {
    expect(getInsertionPreview("The quick brown fox", "quick")).toMatchObject({
      prefix: "The ",
      match: "quick",
      suffix: " brown fox",
      isFound: true,
      isTruncated: false,
    });
  });

  it("strips HTML from the resume before searching", () => {
    const preview = getInsertionPreview("<p>The <b>quick</b> fox</p>", "quick");
    expect(preview.isFound).toBe(true);
    expect(preview.match).toBe("quick");
  });

  it("reports not found (with match preserved) when text is absent", () => {
    expect(getInsertionPreview("nothing here", "missing")).toMatchObject({
      match: "missing",
      isFound: false,
    });
  });

  it("truncates and flags long context windows", () => {
    const filler = "a".repeat(200);
    const preview = getInsertionPreview(`${filler} TARGET ${filler}`, "TARGET");
    expect(preview.isFound).toBe(true);
    expect(preview.isTruncated).toBe(true);
    expect(preview.prefix.length).toBe(120);
    expect(preview.suffix.length).toBe(120);
  });
});
