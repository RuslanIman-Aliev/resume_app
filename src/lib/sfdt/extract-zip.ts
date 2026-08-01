import { strFromU8, unzipSync } from "fflate";
import { decodeBase64ToBytes } from "./base64";
import { isSfdtLike } from "./is-sfdt";

export type ZipExtractResult =
  | { kind: "sfdt"; text: string; sourceName: string }
  | { kind: "docx"; bytes: Uint8Array }
  | { kind: "unknown"; reason: string };

/**
 * Unzips a base64-encoded archive and locates the best SFDT payload inside it.
 * Falls back to reporting a raw DOCX (word/document.xml) when no SFDT is found.
 */
export const extractSfdtFromZipBase64 = (value: string): ZipExtractResult => {
  const bytes = decodeBase64ToBytes(value);
  const files = unzipSync(bytes);
  const fileNames = Object.keys(files);

  const sfdtCandidates: Array<{
    name: string;
    text: string;
    textRuns: number;
  }> = [];

  for (const name of fileNames) {
    const text = strFromU8(files[name]).trim();
    if (!text.startsWith("{")) continue;

    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.sfdt === "string") {
        return { kind: "sfdt", text: parsed.sfdt, sourceName: name };
      }
      if (isSfdtLike(parsed)) {
        const textRuns = text.match(/"(t|tlp|text)":"[^"]*"/g)?.length ?? 0;
        sfdtCandidates.push({ name, text, textRuns });
      }
    } catch {
      continue;
    }
  }

  if (sfdtCandidates.length > 0) {
    sfdtCandidates.sort((a, b) => {
      if (b.textRuns !== a.textRuns) return b.textRuns - a.textRuns;
      return b.text.length - a.text.length;
    });
    const best = sfdtCandidates[0];
    return { kind: "sfdt", text: best.text, sourceName: best.name };
  }

  const hasWordDocument = Boolean(files["word/document.xml"]);
  const hasContentTypes = Boolean(files["[Content_Types].xml"]);
  if (hasWordDocument && hasContentTypes) {
    return { kind: "docx", bytes };
  }

  const sfdtName = fileNames.find((name) =>
    name.toLowerCase().match(/\.(sfdt|json)$/),
  );
  if (sfdtName) {
    const fallbackText = strFromU8(files[sfdtName]).trim();
    if (fallbackText) {
      return { kind: "sfdt", text: fallbackText, sourceName: sfdtName };
    }
  }

  return {
    kind: "unknown",
    reason: "SFDT не найден в архиве",
  };
};
