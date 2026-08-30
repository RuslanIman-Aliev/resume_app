/**
 * Link-safety helpers for URLs that arrive from outside the app: typed into the
 * tracker form by a user, or extracted from a job posting by the model.
 *
 * `z.string().url()` is not enough on its own. Zod accepts anything the WHATWG
 * URL parser accepts, and that includes `javascript:alert(1)` - a value that
 * validates, gets stored, and then executes the moment it is rendered as an
 * `href`. Everything here narrows to absolute `http`/`https` URLs instead, so a
 * scheme that only makes sense as code can never reach the DOM.
 *
 * Kept dependency-free so client components can import it without pulling zod
 * into their bundle, the same reason `@/lib/resume-status` exists.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Reports whether a value is an absolute `http(s)` URL that is safe to put in
 * an `href`.
 *
 * @param value - Candidate URL, from a form field or a model response.
 * @returns True only for absolute URLs on an allowed scheme.
 */
export const isSafeHttpUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    // Parsed without a base so protocol-relative and scheme-less values are
    // rejected rather than silently resolved against the current page.
    return ALLOWED_PROTOCOLS.has(new URL(trimmed).protocol);
  } catch {
    return false;
  }
};

/**
 * Normalises a candidate URL, dropping anything that is not an `http(s)` link.
 *
 * Used on the way into the database so a bad value is discarded once, at the
 * boundary, instead of being re-checked by every component that renders it.
 *
 * @param value - Candidate URL, typically from a model response.
 * @returns The trimmed URL, or null when it is missing or unsafe.
 */
export const sanitizeHttpUrl = (value: unknown): string | null =>
  isSafeHttpUrl(value) ? value.trim() : null;
