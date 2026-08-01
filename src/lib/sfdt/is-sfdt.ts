/**
 * Heuristic check for whether a parsed value looks like a Syncfusion SFDT
 * document (has a `sec` or `sections` array).
 */
export const isSfdtLike = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.sec) || Array.isArray(record.sections);
};
