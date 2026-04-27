import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, ".next", "static", "chunks");
const maxBytes = Number(process.env.BUNDLE_SIZE_LIMIT_BYTES ?? 10_000_000);
const routeMaxBytes = Number(
  process.env.ROUTE_BUNDLE_SIZE_LIMIT_BYTES ?? 4_500_000,
);

const parseRouteBudgetOverrides = () => {
  const raw = process.env.ROUTE_BUNDLE_SIZE_BUDGETS_JSON;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected a plain object");
    }

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry) => typeof entry[0] === "string")
        .map(([route, limit]) => [route, Number(limit)]),
    );
  } catch (error) {
    console.error(
      "Invalid ROUTE_BUNDLE_SIZE_BUDGETS_JSON. Expected JSON object like {'/dashboard':2500000}.",
      error,
    );
    process.exit(1);
  }
};

const routeBudgetOverrides = parseRouteBudgetOverrides();

const readAllFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await readAllFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

const parseClientReferenceManifest = (content) => {
  const match = content.match(/\]\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) {
    return null;
  }

  return JSON.parse(match[1]);
};

const toRelativeNextPath = (chunkPath) =>
  chunkPath
    .replace(/^\/_next\//, "")
    .replace(/^_next\//, "")
    .replaceAll("\\", "/");

const getRouteSizeDetails = async (chunkSizeByRelativePath) => {
  const appPathRoutesManifestPath = path.join(
    rootDir,
    ".next",
    "app-path-routes-manifest.json",
  );

  try {
    await access(appPathRoutesManifestPath);
  } catch {
    return [];
  }

  const appRouteMap = JSON.parse(
    await readFile(appPathRoutesManifestPath, "utf8"),
  );
  const routeEntries = Object.entries(appRouteMap).filter(
    ([routeKey, routePath]) =>
      routeKey.endsWith("/page") &&
      !routePath.startsWith("/api/") &&
      !routePath.startsWith("/_"),
  );

  const routeSizes = [];

  for (const [routeKey, routePath] of routeEntries) {
    const manifestPath = path.join(
      rootDir,
      ".next",
      "server",
      "app",
      `${routeKey.slice(1)}_client-reference-manifest.js`,
    );

    try {
      await access(manifestPath);
    } catch {
      continue;
    }

    const manifestContent = await readFile(manifestPath, "utf8");
    const manifest = parseClientReferenceManifest(manifestContent);
    if (!manifest?.entryJSFiles) {
      continue;
    }

    const routeEntryKey = Object.keys(manifest.entryJSFiles).find((entryKey) =>
      entryKey.endsWith(`src/app${routeKey}`),
    );

    if (!routeEntryKey) {
      continue;
    }

    const routeChunks = Array.from(
      new Set(manifest.entryJSFiles[routeEntryKey]),
    );
    const totalBytes = routeChunks.reduce((sum, chunkPath) => {
      const normalized = toRelativeNextPath(chunkPath);
      return sum + (chunkSizeByRelativePath.get(normalized) ?? 0);
    }, 0);

    routeSizes.push({
      route: routePath,
      budget: routeBudgetOverrides[routePath] ?? routeMaxBytes,
      totalBytes,
      chunkCount: routeChunks.length,
    });
  }

  return routeSizes.sort((a, b) => b.totalBytes - a.totalBytes);
};

try {
  const files = await readAllFiles(outputDir);
  const details = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      size: (await stat(filePath)).size,
    })),
  );

  const totalBytes = details.reduce((sum, file) => sum + file.size, 0);
  const largestFiles = [...details].sort((a, b) => b.size - a.size).slice(0, 5);
  const chunkSizeByRelativePath = new Map(
    details.map((file) => [
      path
        .relative(path.join(rootDir, ".next"), file.filePath)
        .replaceAll("\\", "/"),
      file.size,
    ]),
  );
  const routeSizes = await getRouteSizeDetails(chunkSizeByRelativePath);

  console.log(`Bundle size: ${totalBytes} bytes (limit ${maxBytes} bytes)`);
  console.log(
    largestFiles
      .map((file) => `${path.relative(rootDir, file.filePath)}: ${file.size}`)
      .join("\n"),
  );

  if (routeSizes.length > 0) {
    console.log("Route JS sizes:");
    console.log(
      routeSizes
        .slice(0, 8)
        .map(
          (route) =>
            `${route.route}: ${route.totalBytes} bytes (limit ${route.budget} bytes, ${route.chunkCount} chunks)`,
        )
        .join("\n"),
    );
  }

  if (totalBytes > maxBytes) {
    console.error(
      `Bundle size budget exceeded by ${totalBytes - maxBytes} bytes.`,
    );
    process.exit(1);
  }

  const exceededRoutes = routeSizes.filter(
    (route) => route.totalBytes > route.budget,
  );
  if (exceededRoutes.length > 0) {
    console.error("Route-level bundle budget exceeded:");
    console.error(
      exceededRoutes
        .map(
          (route) =>
            `${route.route}: ${route.totalBytes - route.budget} bytes over limit`,
        )
        .join("\n"),
    );
    process.exit(1);
  }
} catch (error) {
  console.error("Bundle size check failed:", error);
  process.exit(1);
}
