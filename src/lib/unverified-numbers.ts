/**
 * Finds figures a suggestion introduces that its source text does not contain.
 *
 * The analysis prompt used to instruct the model, in writing, to "add realistic
 * placeholder metrics like 'by 25%' or 'saving $10k' if the candidate didn't
 * provide any". It obliged: six of seven suggestions in one measured run
 * carried numbers absent from the resume, and applying one writes it into the
 * user's real document and, from there, into the DOCX they send out.
 *
 * The prompt no longer asks for that. This is the belt to that braces: the
 * model can still volunteer a number, and the user should be able to see which
 * digits are new before the text lands in their resume rather than after.
 */

/**
 * Numbers as a reader of a resume bullet meets them: bare integers and
 * decimals, percentages, and figures written with thousands separators or a
 * scale suffix ("10k", "1.5m"). Currency symbols and the "%" sign are left out
 * of the captured value so that "25%" and "25" compare equal - what matters is
 * whether the quantity is new, not how it was punctuated.
 */
const NUMBER_PATTERN = /\d+(?:[.,]\d+)*\s*(?:k|m|bn|mio|mrd)?/gi;

/** Strips separators and case so "1,500" and "1500" count as the same figure. */
const canonical = (value: string) => value.toLowerCase().replace(/[.,\s]/g, "");

const figuresIn = (value: string | null | undefined): string[] =>
  (value ?? "").match(NUMBER_PATTERN)?.map(canonical) ?? [];

/**
 * Returns the figures present in `suggestedText` but not in `currentText`.
 *
 * Years are deliberately not exempted: a suggestion that introduces "2021" to
 * a bullet that never mentioned it is inventing a date, which is exactly the
 * class of claim this guards against.
 *
 * @param currentText - The quote the suggestion rewrites, from the resume.
 * @param suggestedText - The model's replacement text.
 * @returns Canonical figures the rewrite introduces, in order, without repeats.
 */
export const findUnverifiedNumbers = (
  currentText: string | null | undefined,
  suggestedText: string | null | undefined,
): string[] => {
  const source = new Set(figuresIn(currentText));
  const introduced = figuresIn(suggestedText).filter(
    (figure) => !source.has(figure),
  );

  return [...new Set(introduced)];
};

/**
 * Whether a suggestion introduces at least one figure its source text lacks.
 *
 * @param currentText - The quote the suggestion rewrites, from the resume.
 * @param suggestedText - The model's replacement text.
 */
export const hasUnverifiedNumbers = (
  currentText: string | null | undefined,
  suggestedText: string | null | undefined,
): boolean => findUnverifiedNumbers(currentText, suggestedText).length > 0;
