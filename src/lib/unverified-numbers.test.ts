import { describe, expect, it } from "vitest";
import {
  findUnverifiedNumbers,
  hasUnverifiedNumbers,
} from "./unverified-numbers";

describe("findUnverifiedNumbers", () => {
  it("catches the percentage the model used to invent", () => {
    // Verbatim from a measured run against a resume containing no figures.
    expect(
      findUnverifiedNumbers(
        "Behebung von Fehlern im bestehenden Frontend-Code",
        "Reduzierte Frontend-Fehler um 30% und verbesserte die Stabilitaet bestehender Anwendungen",
      ),
    ).toEqual(["30"]);
  });

  it("catches several invented figures in one rewrite", () => {
    expect(
      findUnverifiedNumbers(
        "Mitarbeit an Kundenwebseiten mit React und TypeScript",
        "Unterstuetzte die Umsetzung von 3+ Kundenwebseiten, was die Entwicklungszeit um 20% reduzierte",
      ),
    ).toEqual(["3", "20"]);
  });

  it("stays silent when the rewrite reuses the resume's own numbers", () => {
    expect(
      findUnverifiedNumbers(
        "Betreuung von 12 Kundenprojekten",
        "Verantwortete 12 Kundenprojekte von der Konzeption bis zum Release",
      ),
    ).toEqual([]);
  });

  it("stays silent on a rewrite that adds no figure at all", () => {
    expect(
      hasUnverifiedNumbers(
        "Umsetzung von Komponenten nach Designvorgaben",
        "Entwickelte wiederverwendbare UI-Komponenten aus Designvorgaben",
      ),
    ).toBe(false);
  });

  it("ignores how a figure is punctuated", () => {
    expect(
      findUnverifiedNumbers("Umsatz von 1.500 Euro", "Umsatz von 1500 Euro"),
    ).toEqual([]);
  });

  it("treats a figure added to an empty source as unverified", () => {
    expect(hasUnverifiedNumbers(null, "Team of 8 engineers")).toBe(true);
  });

  it("flags an introduced year", () => {
    // A date the resume does not state is an invented fact like any other.
    expect(
      findUnverifiedNumbers("Werkstudent Webentwicklung", "Werkstudent seit 2021"),
    ).toEqual(["2021"]);
  });
});
