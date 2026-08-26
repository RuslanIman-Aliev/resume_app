import "server-only";

import { UTApi } from "uploadthing/server";
import { logError } from "@/lib/logger";

const utapi = new UTApi();

/**
 * Extracts an UploadThing file key from a public URL.
 *
 * Returns null for non-UploadThing URLs or malformed values, so callers can
 * skip cleanup instead of issuing a delete for a key that was never ours.
 *
 * @param url - Public URL stored in `resumeLink` / `resumePreviewLink`.
 * @returns UploadThing file key, or null when the URL is not an UploadThing one.
 */
export const extractUploadThingKey = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("uploadthing") && !host.includes("utfs.io")) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  } catch {
    return null;
  }
};

/**
 * Best-effort deletion of UploadThing files behind a set of public URLs.
 *
 * Storage cleanup must never fail the operation that triggered it: by the time
 * this runs the database row is already gone, so throwing here would report a
 * failed delete for a resume that no longer exists. Failures are logged and
 * swallowed instead.
 *
 * @param urls - Public URLs whose backing files should be removed.
 * @param context - Log context describing the caller, used when cleanup fails.
 */
export const deleteUploadThingFilesByUrl = async (
  urls: Array<string | null | undefined>,
  context: string,
) => {
  const keys = Array.from(
    new Set(
      urls
        .map((url) => extractUploadThingKey(url))
        .filter((key): key is string => Boolean(key)),
    ),
  );

  if (keys.length === 0) {
    return;
  }

  try {
    await utapi.deleteFiles(keys);
  } catch (error) {
    logError(context, error, { keyCount: keys.length });
  }
};
