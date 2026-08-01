import { describe, expect, it } from "vitest";
import { extractSfdtPayload, replaceInSfdtNode } from "./payload";

describe("extractSfdtPayload", () => {
  it("returns an empty string for blank input", () => {
    expect(extractSfdtPayload("   ")).toBe("");
  });

  it("unwraps a JSON-quoted string", () => {
    expect(extractSfdtPayload('"hello"')).toBe("hello");
  });

  it("extracts a nested sfdt field", () => {
    expect(extractSfdtPayload('{"sfdt":"RAW_SFDT"}')).toBe("RAW_SFDT");
  });

  it("stringifies an sfdt-like object", () => {
    expect(extractSfdtPayload('{"sec":[1]}')).toBe('{"sec":[1]}');
  });

  it("returns non-JSON text as-is", () => {
    expect(extractSfdtPayload("plain text")).toBe("plain text");
  });
});

describe("replaceInSfdtNode", () => {
  it("replaces every occurrence in a string", () => {
    expect(replaceInSfdtNode("foo bar foo", "foo", "X")).toEqual({
      next: "X bar X",
      changed: true,
    });
  });

  it("reports no change when the text is absent", () => {
    expect(replaceInSfdtNode("bar", "foo", "X")).toEqual({
      next: "bar",
      changed: false,
    });
  });

  it("recurses through nested arrays and objects", () => {
    const result = replaceInSfdtNode(
      { a: "foo", b: [{ c: "keep foo" }], n: 5 },
      "foo",
      "X",
    );
    expect(result.changed).toBe(true);
    expect(result.next).toEqual({ a: "X", b: [{ c: "keep X" }], n: 5 });
  });

  it("leaves primitives untouched", () => {
    expect(replaceInSfdtNode(10, "foo", "X")).toEqual({
      next: 10,
      changed: false,
    });
    expect(replaceInSfdtNode(null, "foo", "X")).toEqual({
      next: null,
      changed: false,
    });
  });
});
