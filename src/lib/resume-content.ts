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
 * Locates `needle` across the given text nodes, tolerating both the element
 * boundaries and the whitespace runs that separate a quote from the markup it
 * came from.
 *
 * The model quotes a resume line the way a person reads it - "Database
 * Architecture: Entwarf ein robustes TypeScript-Backend" - while the DOM holds
 * that line as two text nodes either side of a `<strong>`. Searching each node
 * on its own missed every such quote, so the suggestion was appended to the end
 * of the resume instead of replacing the sentence it was written for.
 *
 * Returns the span as node indexes plus offsets into those nodes, or null.
 */
const findTextSpan = (textNodes: Text[], needle: string) => {
  const trimmedNeedle = needle.trim();
  if (!trimmedNeedle) {
    return null;
  }

  // Flatten to one string while remembering where every kept character came
  // from, so a normalized match can be mapped back onto the real nodes.
  const origins: Array<{ node: number; offset: number }> = [];
  let haystack = "";
  let pendingSpace = false;

  textNodes.forEach((textNode, node) => {
    const { data } = textNode;
    for (let offset = 0; offset < data.length; offset += 1) {
      if (/\s/.test(data[offset])) {
        pendingSpace = haystack.length > 0;
        continue;
      }
      if (pendingSpace) {
        haystack += " ";
        origins.push({ node, offset });
        pendingSpace = false;
      }
      haystack += data[offset];
      origins.push({ node, offset });
    }
  });

  const flatNeedle = trimmedNeedle.replace(/\s+/g, " ");
  const start = haystack.indexOf(flatNeedle);
  if (start === -1) {
    return null;
  }

  const first = origins[start];
  const last = origins[start + flatNeedle.length - 1];

  return {
    startNode: first.node,
    startOffset: first.offset,
    endNode: last.node,
    endOffset: last.offset + 1,
  };
};

/**
 * Renders resume HTML as the plain text a reader would see.
 *
 * This is what the analysis prompts are given: asked to quote from markup, the
 * model answers with the text a person reads, so feeding it markup guarantees
 * quotes that no longer appear in the input they came from.
 */
export const resumeContentToPlainText = (
  value: string | null | undefined,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const normalized = normalizeResumeParsedContent(value);
  if (!normalized) {
    return "";
  }

  const document = new JSDOM(`<body>${normalized}</body>`).window.document;
  const blocks: string[] = [];

  document.body.childNodes.forEach((child) => {
    const text = (child.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text) {
      blocks.push(text);
    }
  });

  return blocks.join("\n");
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

    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode as Text);
      currentNode = walker.nextNode();
    }

    const match = findTextSpan(textNodes, trimmedPrevious);

    if (match) {
      const { startNode, startOffset, endNode, endOffset } = match;
      const startText = textNodes[startNode].data;

      // The replacement lands in the first node of the span and the rest of the
      // span is cleared. A quote that crosses an element boundary - the usual
      // shape of a resume bullet, `<strong>Label:</strong> body text` - therefore
      // keeps the styling of its opening run rather than losing the edit.
      textNodes[startNode].data =
        startText.slice(0, startOffset) +
        nextText.trim() +
        (startNode === endNode ? startText.slice(endOffset) : "");

      for (let index = startNode + 1; index <= endNode; index += 1) {
        textNodes[index].data =
          index === endNode ? textNodes[index].data.slice(endOffset) : "";
      }

      return document.body.innerHTML;
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
