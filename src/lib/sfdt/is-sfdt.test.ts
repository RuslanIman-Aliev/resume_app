import { describe, expect, it } from "vitest";
import { isSfdtLike } from "./is-sfdt";

describe("isSfdtLike", () => {
  it("accepts objects with a `sec` array", () => {
    expect(isSfdtLike({ sec: [] })).toBe(true);
    expect(isSfdtLike({ sec: [{ t: "x" }] })).toBe(true);
  });

  it("accepts objects with a `sections` array", () => {
    expect(isSfdtLike({ sections: [] })).toBe(true);
  });

  it("rejects objects where sec/sections are not arrays", () => {
    expect(isSfdtLike({ sec: "x" })).toBe(false);
    expect(isSfdtLike({ sections: 1 })).toBe(false);
    expect(isSfdtLike({ other: [] })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isSfdtLike(null)).toBe(false);
    expect(isSfdtLike(undefined)).toBe(false);
    expect(isSfdtLike("sec")).toBe(false);
    expect(isSfdtLike(42)).toBe(false);
  });
});
