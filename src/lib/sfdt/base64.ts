import { strFromU8 } from "fflate";

/** Decodes a base64 string into raw bytes. */
export const decodeBase64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

/** Decodes a base64 string into UTF-8 text, returning "" on failure. */
export const decodeBase64ToText = (value: string) => {
  try {
    return strFromU8(decodeBase64ToBytes(value));
  } catch {
    return "";
  }
};
