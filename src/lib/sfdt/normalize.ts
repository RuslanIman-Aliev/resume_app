/**
 * Recursively normalizes an SFDT value: renames the optimized `tlp` key back to
 * `t` and drops the `optimizeSfdt: true` flag so the editor parses it as a
 * regular (non-optimized) document.
 */
export const normalizeSfdtValue = (value: unknown): unknown => {
  const normalizeValue = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((item) => normalizeValue(item));
    }

    if (!input || typeof input !== "object") {
      return input;
    }

    const normalized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      input as Record<string, unknown>,
    )) {
      const normalizedKey = key === "tlp" ? "t" : key;
      normalized[normalizedKey] = normalizeValue(nestedValue);
    }

    if (normalized.optimizeSfdt === true) {
      delete normalized.optimizeSfdt;
    }

    return normalized;
  };

  return normalizeValue(value);
};

/** Parses, normalizes, and re-serializes an SFDT string; returns input on failure. */
export const normalizeSfdtText = (sfdtText: string) => {
  try {
    const parsed = JSON.parse(sfdtText) as unknown;
    const normalized = normalizeSfdtValue(parsed);
    return JSON.stringify(normalized);
  } catch {
    return sfdtText;
  }
};
