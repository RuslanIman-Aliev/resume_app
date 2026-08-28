import { describe, expect, it } from "vitest";
import {
  resumeContentToPlainText,
  updateResumeParsedContent,
} from "./resume-content";

const textOf = (html: string | null) =>
  (html ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

describe("updateResumeParsedContent", () => {
  it("replaces a quote that spans an element boundary", () => {
    const content =
      "<ul><li><strong>Database Architecture:</strong> Entwarf ein robustes Backend.</li></ul>";

    const result = updateResumeParsedContent(
      content,
      "Database Architecture: Entwarf ein robustes Backend.",
      "Database Architecture: Entwarf ein Backend mit 99.9% Uptime.",
    );

    expect(textOf(result)).toBe(
      "Database Architecture: Entwarf ein Backend mit 99.9% Uptime.",
    );
  });

  it("matches a quote whose whitespace differs from the markup", () => {
    const content = "<p>Built   a\ndocument pipeline</p>";

    const result = updateResumeParsedContent(
      content,
      "Built a document pipeline",
      "Built a document pipeline processing 10k files a day",
    );

    expect(textOf(result)).toBe(
      "Built a document pipeline processing 10k files a day",
    );
  });

  it("matches a quote written with a literal ampersand", () => {
    const content = "<p>Frameworks &amp; Tools: React, Next.js</p>";

    const result = updateResumeParsedContent(
      content,
      "Frameworks & Tools: React, Next.js",
      "Frameworks & Tools: React, Next.js, Playwright",
    );

    expect(textOf(result)).toBe(
      "Frameworks & Tools: React, Next.js, Playwright",
    );
  });

  it("appends when the quote is genuinely absent", () => {
    const content = "<p>Existing bullet</p>";

    const result = updateResumeParsedContent(
      content,
      "A sentence that is not in the resume",
      "Added bullet",
    );

    expect(result).toContain("Existing bullet");
    expect(result).toContain("Added bullet");
  });

  it("leaves the surrounding text of a partial match untouched", () => {
    const content = "<p>Alpha beta gamma</p>";

    const result = updateResumeParsedContent(content, "beta", "delta");

    expect(textOf(result)).toBe("Alpha delta gamma");
  });
});

describe("resumeContentToPlainText", () => {
  it("renders markup as the text a reader sees", () => {
    const content =
      "<p><strong>Frameworks &amp; Tools:</strong> React, Next.js</p><ul><li>Built a pipeline</li></ul>";

    expect(resumeContentToPlainText(content)).toBe(
      "Frameworks & Tools: React, Next.js\nBuilt a pipeline",
    );
  });

  it("returns an empty string for empty content", () => {
    expect(resumeContentToPlainText(null)).toBe("");
    expect(resumeContentToPlainText("   ")).toBe("");
  });
});
