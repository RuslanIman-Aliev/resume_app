// @vitest-environment node
import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { decodeBase64ToBytes, decodeBase64ToText } from "./base64";

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

describe("decodeBase64ToBytes", () => {
  it("decodes base64 back into the original bytes", () => {
    const bytes = strToU8("Hello");
    const decoded = decodeBase64ToBytes(toBase64(bytes));
    expect(Array.from(decoded)).toEqual(Array.from(bytes));
  });
});

describe("decodeBase64ToText", () => {
  it("round-trips UTF-8 text", () => {
    const text = "Résumé — SFDT ✓";
    expect(decodeBase64ToText(toBase64(strToU8(text)))).toBe(text);
  });

  it("returns an empty string for malformed base64", () => {
    expect(decodeBase64ToText("!!!not base64!!!")).toBe("");
  });
});
