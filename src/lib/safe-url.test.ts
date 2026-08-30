import { describe, expect, it } from "vitest";
import { isSafeHttpUrl, sanitizeHttpUrl } from "./safe-url";

describe("isSafeHttpUrl", () => {
  it("accepts absolute http and https links", () => {
    expect(isSafeHttpUrl("https://jobs.example.com/postings/42")).toBe(true);
    expect(isSafeHttpUrl("http://jobs.example.com")).toBe(true);
    expect(isSafeHttpUrl("  https://example.com  ")).toBe(true);
  });

  it("rejects schemes that execute rather than navigate", () => {
    // The case the tracker form used to let through: `z.string().url()`
    // accepts these, and the value ends up in an href.
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects values that are not absolute links at all", () => {
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl("   ")).toBe(false);
    expect(isSafeHttpUrl("/jobs/42")).toBe(false);
    expect(isSafeHttpUrl("//evil.example.com")).toBe(false);
    expect(isSafeHttpUrl("example.com")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl(42)).toBe(false);
  });
});

describe("sanitizeHttpUrl", () => {
  it("returns the trimmed link when it is safe", () => {
    expect(sanitizeHttpUrl(" https://example.com/job ")).toBe(
      "https://example.com/job",
    );
  });

  it("returns null for anything else", () => {
    expect(sanitizeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpUrl(null)).toBeNull();
    expect(sanitizeHttpUrl("")).toBeNull();
  });
});
