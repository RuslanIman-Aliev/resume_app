import { describe, expect, it } from "vitest";
import { hasStrippedGermanDiacritics } from "./extraction-quality";

const GERMAN_RESUME = `Profil
Junior Frontend-Entwickler mit Fokus auf React und Next.js. Ich baue
Webanwendungen mit TypeScript und lege Wert auf Tests und lesbaren Code.

Kenntnisse
React, Next.js, TypeScript, JavaScript, HTML, CSS, Git, Vitest, Playwright

Berufserfahrung
Werkstudent Webentwicklung, Digitalagentur Rheinwerk GmbH
Seit 09/2024 arbeite ich dort an Kundenwebseiten mit React und TypeScript.
Ich setze Komponenten nach Designvorgaben um und behebe Fehler im
bestehenden Frontend-Code, sowie bei der Umsetzung neuer Funktionen.

Ausbildung
B.Sc. Informatik an der Universitaet, von 10/2022 bis voraussichtlich 2026.

Sprachen
Russisch, Deutsch, Englisch. Weitere Projekte und Faehigkeiten auf Anfrage.`;

const ENGLISH_RESUME = `Profile
Junior frontend developer focused on React and Next.js. I build web
applications with TypeScript and care about tests and readable code.

Skills
React, Next.js, TypeScript, JavaScript, HTML, CSS, Git, Vitest, Playwright

Experience
Working student, web development, a digital agency in Duesseldorf.
Since September 2024 I have worked on client websites with React and
TypeScript, building components from designs and fixing bugs in the
existing frontend code, as well as shipping new features.

Education
B.Sc. Computer Science, 2022 to 2026 expected.

Languages
Russian, German, English. Further projects available on request.`;

describe("hasStrippedGermanDiacritics", () => {
  it("flags a German resume that lost every umlaut in extraction", () => {
    expect(hasStrippedGermanDiacritics(GERMAN_RESUME)).toBe(true);
  });

  it("passes the same resume once its umlauts survive", () => {
    const intact = GERMAN_RESUME.replace("Universitaet", "Universität")
      .replace("Faehigkeiten", "Fähigkeiten")
      .replace("Duesseldorf", "Düsseldorf");

    expect(hasStrippedGermanDiacritics(intact)).toBe(false);
  });

  it("does not flag an English resume", () => {
    // The trap this guards: an English CV naming German as a language, or
    // sitting in a German city, must not be reported as a broken extraction.
    expect(hasStrippedGermanDiacritics(ENGLISH_RESUME)).toBe(false);
  });

  it("stays quiet on text too short to judge", () => {
    expect(hasStrippedGermanDiacritics("Lebenslauf und Kenntnisse")).toBe(
      false,
    );
  });

  it("handles missing content", () => {
    expect(hasStrippedGermanDiacritics(null)).toBe(false);
    expect(hasStrippedGermanDiacritics(undefined)).toBe(false);
    expect(hasStrippedGermanDiacritics("")).toBe(false);
  });
});
