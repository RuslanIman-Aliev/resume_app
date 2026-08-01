export type InsertionPreview = {
  prefix: string;
  match: string;
  suffix: string;
  isTruncated: boolean;
  isFound: boolean;
};

/** Strips HTML tags and collapses whitespace to a single-line string. */
export const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Locates `beforeText` inside the cleaned resume text and returns a windowed
 * preview (surrounding context) so the UI can show where a suggestion applies.
 */
export const getInsertionPreview = (
  resumeText: string,
  beforeText: string,
): InsertionPreview => {
  if (!beforeText) {
    return {
      prefix: "",
      match: "",
      suffix: "",
      isTruncated: false,
      isFound: false,
    };
  }

  const cleanText = stripHtml(resumeText);
  if (!cleanText) {
    return {
      prefix: "",
      match: beforeText,
      suffix: "",
      isTruncated: false,
      isFound: false,
    };
  }

  const index = cleanText.indexOf(beforeText);
  if (index === -1) {
    return {
      prefix: "",
      match: beforeText,
      suffix: "",
      isTruncated: false,
      isFound: false,
    };
  }

  const contextLength = 120;
  const start = Math.max(0, index - contextLength);
  const end = Math.min(
    cleanText.length,
    index + beforeText.length + contextLength,
  );

  return {
    prefix: cleanText.slice(start, index),
    match: beforeText,
    suffix: cleanText.slice(index + beforeText.length, end),
    isTruncated: start > 0 || end < cleanText.length,
    isFound: true,
  };
};
