import { formatRoleLabel, slugify } from "@/lib/format";
import { describe, expect, it } from "vitest";

describe("slugify", () => {
  it("reduces a phrase to a hyphenated ascii slug", () => {
    expect(slugify("Senior QA Engineer")).toBe("senior-qa-engineer");
    expect(slugify("Café Manager")).toBe("cafe-manager");
    expect(slugify("  Acme  Corp.  ")).toBe("acme-corp");
  });

  it("returns an empty string when nothing ascii is left", () => {
    // Callers fall back to a generic file name in this case rather than
    // producing a download called just ".pdf".
    expect(slugify("Разработчик")).toBe("");
    expect(slugify("")).toBe("");
  });
});

describe("formatRoleLabel", () => {
  it("expands the slugs stored before the field became free text", () => {
    expect(formatRoleLabel("software-engineer")).toBe("Software Engineer");
    expect(formatRoleLabel("full-stack")).toBe("Full Stack");
  });

  it("keeps the casing of a typed role", () => {
    // The previous display code lowercased everything after the first letter,
    // which turned real job titles into "Senior qa engineer".
    expect(formatRoleLabel("Senior QA Engineer")).toBe("Senior QA Engineer");
    expect(formatRoleLabel("Продуктовый маркетолог")).toBe(
      "Продуктовый маркетолог",
    );
  });

  it("trims and tolerates a missing role", () => {
    expect(formatRoleLabel("  Accountant  ")).toBe("Accountant");
    expect(formatRoleLabel(null)).toBe("");
    expect(formatRoleLabel(undefined)).toBe("");
    expect(formatRoleLabel("   ")).toBe("");
  });
});
