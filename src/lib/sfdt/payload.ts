import { isSfdtLike } from "./is-sfdt";

/**
 * Normalizes a `/api/docx-to-sfdt` response body into a raw SFDT string:
 * unwraps a JSON-quoted string and extracts a nested `sfdt` field when present.
 */
export const extractSfdtPayload = (responseText: string) => {
  let payload = responseText.trim();
  if (!payload) return "";

  if (payload.startsWith('"') && payload.endsWith('"')) {
    try {
      payload = JSON.parse(payload);
    } catch {
      // keep original payload
    }
  }

  if (payload.startsWith("{")) {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (typeof parsed.sfdt === "string") {
        return parsed.sfdt;
      }
      if (isSfdtLike(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch {
      // keep original payload
    }
  }

  return payload;
};

/**
 * Recursively replaces every occurrence of `beforeText` with `afterText` inside
 * an SFDT node tree, returning the new node and whether anything changed.
 */
export const replaceInSfdtNode = (
  node: unknown,
  beforeText: string,
  afterText: string,
): { next: unknown; changed: boolean } => {
  if (typeof node === "string") {
    if (!node.includes(beforeText)) {
      return { next: node, changed: false };
    }
    return {
      next: node.split(beforeText).join(afterText),
      changed: true,
    };
  }

  if (Array.isArray(node)) {
    let changed = false;
    const next = node.map((item) => {
      const result = replaceInSfdtNode(item, beforeText, afterText);
      changed = changed || result.changed;
      return result.next;
    });
    return { next, changed };
  }

  if (node && typeof node === "object") {
    let changed = false;
    const record = node as Record<string, unknown>;
    const nextRecord: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      const result = replaceInSfdtNode(value, beforeText, afterText);
      nextRecord[key] = result.next;
      changed = changed || result.changed;
    }

    return { next: nextRecord, changed };
  }

  return { next: node, changed: false };
};
