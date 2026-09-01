/**
 * Assembles the cover letter the user actually reads and copies.
 *
 * The model returns a letter body that starts at the salutation. A German
 * Anschreiben opens with a Betreff line above it, and its absence was the
 * clearest convention failure in the generated letters: the prose was idiomatic
 * and factually clean, but what came out was a letter body rather than a
 * letter. The subject now comes back as its own field, and this puts it where
 * a reader expects it.
 *
 * Sender and recipient blocks, place and date are still missing and are not
 * this function's job - they need a laid-out document export, not string
 * concatenation.
 */

/** Collapses whitespace and case so a near-repeat of the subject is spotted. */
const fingerprint = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();

/**
 * Prefixes the letter body with its subject line.
 *
 * The model is told not to repeat the subject inside the body, but it is not
 * reliable about that, so a body already opening with the subject is left
 * alone rather than given it twice.
 *
 * @param subject - `coverLetterSubject` from the analysis, if the model gave one.
 * @param body - `coverLetterText`, the letter from the salutation onwards.
 * @returns The letter to store and display.
 */
export const composeCoverLetter = (
  subject: string | null | undefined,
  body: string,
): string => {
  const trimmedSubject = subject?.trim();
  const trimmedBody = body.trim();

  if (!trimmedSubject) {
    return trimmedBody;
  }

  const opening = trimmedBody.split(/\r?\n/, 1)[0] ?? "";
  if (fingerprint(opening).includes(fingerprint(trimmedSubject))) {
    return trimmedBody;
  }

  return `${trimmedSubject}\n\n${trimmedBody}`;
};
