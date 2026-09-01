/**
 * Spots a resume whose text came out of the parser stripped of its umlauts.
 *
 * Everything downstream is generated from the extracted text, and the model
 * mirrors the orthography it is given: fed a resume that says "Duesseldorf"
 * and "Qualitaet", it writes a German cover letter that says "grossem" and
 * "Gruessen". That letter is wrong, the user did not do anything to cause it,
 * and nothing in the product would tell them why - the CV they uploaded looked
 * fine, because the damage happened during extraction.
 *
 * So the check is on the extracted text, not on the file: if the text reads as
 * German and yet contains no umlaut or eszett at all, the extraction is the
 * likely culprit and the user should hear about it before they send anything.
 */

/** Any German-specific character. Their total absence is the signal. */
const GERMAN_CHARACTERS = /[äöüÄÖÜß]/;

/**
 * Function words common in German resumes and rare in English ones. Matched
 * whole-word and case-insensitively; several must hit before the text is
 * called German, so an English CV listing "Deutsch" as a language does not
 * trip the check.
 */
const GERMAN_MARKERS =
  /\b(und|oder|mit|bei|von|für|fuer|der|die|das|den|dem|ein|eine|einer|nicht|sowie|seit|bis|als|auch|über|ueber|durch|Kenntnisse|Erfahrung|Berufserfahrung|Ausbildung|Studium|Sprachen|Projekte|Fähigkeiten|Faehigkeiten)\b/gi;

/**
 * Text shorter than this is too small to conclude anything from: a two-line
 * résumé stub can legitimately contain no umlaut.
 */
const MINIMUM_LENGTH = 400;

/** Distinct German function words required before the text is treated as German. */
const MINIMUM_MARKERS = 6;

/**
 * Reports whether extracted text looks German but lost its umlauts.
 *
 * @param text - The text the parser produced, as stored in `parsedContent`.
 * @returns True when the text is long enough, reads as German, and contains no
 *   German-specific character at all.
 */
export const hasStrippedGermanDiacritics = (
  text: string | null | undefined,
): boolean => {
  if (typeof text !== "string") {
    return false;
  }

  const trimmed = text.trim();
  if (trimmed.length < MINIMUM_LENGTH) {
    return false;
  }

  if (GERMAN_CHARACTERS.test(trimmed)) {
    return false;
  }

  const markers = trimmed.match(GERMAN_MARKERS) ?? [];
  const distinct = new Set(markers.map((marker) => marker.toLowerCase()));

  return distinct.size >= MINIMUM_MARKERS;
};
