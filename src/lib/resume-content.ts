import sanitizeHtml from "sanitize-html";
import { JSDOM } from "jsdom";

/**
 * Escapes HTML-sensitive characters in plain text to prevent XSS attacks.
 * Converts &, <, >, ", and ' to their HTML entity equivalents.
 * @param value - Plain text string to escape
 * @returns HTML-escaped string safe for rendering in HTML context
 */
export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const blockTagPattern =
  /<\s*\/?\s*(p|div|br|li|ul|ol|blockquote|section|article|h1|h2|h3|h4|h5|h6)\b[^>]*>/gi;

const sanitizeResumeHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "sub",
      "sup",
      "blockquote",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "pre",
      "code",
      "span",
      "a",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "hr",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      span: ["class"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });

const hasHtmlTags = (value: string) => /<[^>]+>/.test(value);

const plainTextToPreservedHtml = (text: string) => {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  const unorderedListPattern = /^(?:[-*]|[\u2022\u00b7])\s+(.+)$/;
  const orderedListPattern = /^(\d{1,2})[.)]\s+(.+)$/;

  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushList = () => {
    if (!listBuffer) {
      return;
    }

    const tag = listBuffer.type;
    const itemsHtml = listBuffer.items
      .map((item) => `<li>${item}</li>`)
      .join("");
    blocks.push(`<${tag}>${itemsHtml}</${tag}>`);
    listBuffer = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const orderedMatch = trimmed.match(orderedListPattern);
    if (orderedMatch) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }

      listBuffer.items.push(escapeHtml(orderedMatch[2].trim()));
      continue;
    }

    const unorderedMatch = trimmed.match(unorderedListPattern);
    if (unorderedMatch) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }

      listBuffer.items.push(escapeHtml(unorderedMatch[1].trim()));
      continue;
    }

    flushList();
    blocks.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  flushList();
  return blocks.join("");
};

/**
 * Converts user-controlled resume HTML or text into safe paragraph markup.
 * Sanitizes HTML by removing dangerous tags and attributes, then normalizes to <p> blocks.
 * Handles both HTML input and plain text with list formatting.
 * @param value - Resume content as HTML string, plain text, or null/undefined
 * @returns Sanitized HTML string with safe paragraph markup, or null if empty
 */
export const normalizeResumeParsedContent = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return value ?? null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (hasHtmlTags(trimmed)) {
    const sanitized = sanitizeResumeHtml(trimmed).trim();
    return sanitized || null;
  }

  const withoutDangerousBlocks = trimmed.replace(
    /<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );

  const withParagraphBreaks = withoutDangerousBlocks
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(blockTagPattern, "\n");

  const textOnly = withParagraphBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/\r?\n{2,}/g, "\n")
    .trim();

  if (!textOnly) {
    return null;
  }

  return plainTextToPreservedHtml(textOnly);
};

/**
 * Updates resume content by replacing old text with new text or appending if no match found.
 * Uses DOM parsing to locate and replace exact text matches in the existing HTML structure.
 * @param currentContent - The current resume HTML content
 * @param previousText - The text to find and replace (optional)
 * @param nextText - The new text to replace with
 * @returns Updated resume HTML content, or null if empty
 */
export const updateResumeParsedContent = (
  currentContent: string | null | undefined,
  previousText: string | null | undefined,
  nextText: string,
): string | null => {
  const safeNextText = escapeHtml(nextText.trim());
  const normalizedCurrent = normalizeResumeParsedContent(currentContent);

  if (!normalizedCurrent) {
    return safeNextText ? `<p>${safeNextText}</p>` : null;
  }

  const document = new JSDOM(`<body>${normalizedCurrent}</body>`).window
    .document;
  const trimmedPrevious = previousText?.trim();

  if (trimmedPrevious) {
    const nodeFilter = document.defaultView?.NodeFilter;
    const showText = nodeFilter?.SHOW_TEXT ?? 4;
    const walker = document.createTreeWalker(document.body, showText);

    let currentNode = walker.nextNode();
    while (currentNode) {
      const textNode = currentNode as Text;
      const matchIndex = textNode.data.indexOf(trimmedPrevious);

      if (matchIndex !== -1) {
        textNode.data = textNode.data.replace(trimmedPrevious, nextText.trim());
        return document.body.innerHTML;
      }

      currentNode = walker.nextNode();
    }
  }

  // If previousText not found or not provided, append new text as paragraph
  if (!safeNextText) {
    return normalizedCurrent;
  }

  const nextParagraph = document.createElement("p");
  nextParagraph.innerHTML = safeNextText;
  document.body.appendChild(nextParagraph);

  return document.body.innerHTML;
};
