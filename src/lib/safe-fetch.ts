import "server-only";

/**
 * Hosts we are willing to fetch user-supplied file URLs from.
 *
 * All resume files live on UploadThing storage, which serves them either from
 * the legacy `utfs.io` host or the newer per-app `<appId>.ufs.sh` host. Any URL
 * outside this allow-list is rejected to prevent SSRF (e.g. cloud metadata
 * endpoints, localhost, or internal services).
 */
const ALLOWED_HOSTS = ["utfs.io"];
const ALLOWED_HOST_SUFFIXES = [".ufs.sh"];

const isAllowedHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.includes(host)) {
    return true;
  }
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
};

/**
 * Validates that a user-supplied URL is an https URL on an allow-listed file
 * host before it is passed to `fetch` server-side.
 *
 * @param rawUrl - The untrusted URL value from the request.
 * @returns The parsed, validated URL string.
 * @throws {SafeFetchError} If the URL is malformed, not https, or off-list.
 */
export const assertAllowedFileUrl = (rawUrl: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("Invalid URL", 400);
  }

  if (parsed.protocol !== "https:") {
    throw new SafeFetchError("Only https URLs are allowed", 400);
  }

  if (!isAllowedHost(parsed.hostname)) {
    throw new SafeFetchError("URL host is not allowed", 400);
  }

  return parsed.toString();
};

/**
 * Error carrying an HTTP status so route handlers can translate a rejected URL
 * into the correct response code.
 */
export class SafeFetchError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SafeFetchError";
    this.status = status;
  }
}
