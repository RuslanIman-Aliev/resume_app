import { describe, expect, it } from "vitest";
import { normalizeSfdtText, normalizeSfdtValue } from "./normalize";

describe("normalizeSfdtValue", () => {
  it("renames optimized `tlp` keys to `t` recursively", () => {
    const input = { tlp: "x", nested: { tlp: "y" }, arr: [{ tlp: "z" }] };
    expect(normalizeSfdtValue(input)).toEqual({
      t: "x",
      nested: { t: "y" },
      arr: [{ t: "z" }],
    });
  });

  it("drops optimizeSfdt when true but keeps it when false", () => {
    expect(normalizeSfdtValue({ optimizeSfdt: true, a: 1 })).toEqual({ a: 1 });
    expect(normalizeSfdtValue({ optimizeSfdt: false, a: 1 })).toEqual({
      optimizeSfdt: false,
      a: 1,
    });
  });

  it("passes primitives and arrays through unchanged", () => {
    expect(normalizeSfdtValue(42)).toBe(42);
    expect(normalizeSfdtValue("plain")).toBe("plain");
    expect(normalizeSfdtValue([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe("normalizeSfdtText", () => {
  it("normalizes a JSON SFDT string", () => {
    expect(normalizeSfdtText('{"tlp":"x","optimizeSfdt":true}')).toBe(
      '{"t":"x"}',
    );
  });

  it("returns the original text for non-JSON input", () => {
    expect(normalizeSfdtText("not json")).toBe("not json");
  });
});
