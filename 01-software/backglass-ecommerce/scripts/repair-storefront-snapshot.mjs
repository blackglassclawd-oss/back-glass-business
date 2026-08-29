import { createHash } from "node:crypto";
import { readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const STORE_DOMAIN = "kfczyu-kc.myshopify.com";
const MAX_RETRIES = 10;
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeAssetUrl(url) {
  const parsed = new URL(url);
  for (const parameter of ["crop", "height", "width"]) {
    parsed.searchParams.delete(parameter);
  }
  return parsed.href;
}

function routeFileName(url) {
  const parsed = new URL(url);
  const routeName =
    parsed.pathname === "/"
      ? "index"
      : parsed.pathname.replace(/^\/|\/$/g, "").replaceAll("/", "__");
  return `${routeName || "index"}-${sha256(url).slice(0, 10)}.html`;
}

function contentExtension(contentType) {
  const extensions = new Map([
    ["image/avif", ".avif"],
    ["image/gif", ".gif"],
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/svg+xml", ".svg"],
    ["image/webp", ".webp"],
    ["text/css", ".css"],
    ["text/javascript", ".js"],
  ]);
  return extensions.get(contentType?.split(";")[0]) ?? ".bin";
}

function assetFileName(url, fallbackExtension) {
  const extension = path.extname(new URL(url).pathname).slice(0, 10);
  return `${sha256(url)}${extension || fallbackExtension}`;
}

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Accept: "*/*",
        "User-Agent": "BackGlassProsMigration/1.0",
      },
    });
    if (response.ok) {
      return response;
    }
    if (response.status !== 429 || attempt === MAX_RETRIES) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter)
      ? retryAfter * 1_000
      : Math.min(5_000 * 2 ** attempt, 60_000);
    await sleep(delay);
  }
  throw new Error(`Retry limit reached for ${url}`);
}

function collectHtmlAssets(html, pageUrl) {
  const $ = load(html);
  const urls = new Set();
  for (const [selector, attribute] of [
    ["img[src]", "src"],
    ["link[rel='stylesheet'][href]", "href"],
    ["script[src]", "src"],
    ["source[src]", "src"],
  ]) {
    $(selector).each((_, element) => {
      const rawUrl = $(element).attr(attribute);
      if (rawUrl) {
        urls.add(normalizeAssetUrl(new URL(rawUrl, pageUrl).href));
      }
    });
  }
  $("[srcset]").each((_, element) => {
    const srcset = $(element).attr("srcset") ?? "";
    for (const candidate of srcset.split(",")) {
      const rawUrl = candidate.trim().split(/\s+/)[0];
      if (rawUrl) {
        urls.add(normalizeAssetUrl(new URL(rawUrl, pageUrl).href));
      }
    }
  });
  return [...urls].filter((url) => {
    const parsed = new URL(url);
    const owned =
      parsed.hostname === "cdn.shopify.com" ||
      (parsed.hostname === STORE_DOMAIN && parsed.pathname.startsWith("/cdn/"));
    const thirdParty =
      parsed.pathname.includes("/extensions/") ||
      parsed.pathname.includes("/shopifycloud/") ||
      parsed.pathname.includes("/wpm/");
    return owned && !thirdParty;
  });
}

async function latestCompleteSnapshot() {
  const root = path.resolve("backups", "storefront");
  const entries = await readdir(root, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .sort()
    .reverse();
  for (const candidate of candidates) {
    try {
      await stat(path.join(candidate, "manifest.json"));
      return candidate;
    } catch {
      // Ignore incomplete snapshots.
    }
  }
  throw new Error("No complete storefront snapshot was found.");
}

const snapshotDirectory = process.argv[2]
  ? path.resolve(process.argv[2])
  : await latestCompleteSnapshot();
const manifestPath = path.join(snapshotDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const knownAssets = new Set(manifest.assets.map((asset) => asset.url));

for (const page of manifest.pages.filter((entry) => entry.error)) {
  const response = await fetchWithRetry(page.url);
  const html = await response.text();
  const fileName = routeFileName(page.url);
  await writeFile(path.join(snapshotDirectory, "pages", fileName), html);
  const pageAssets = collectHtmlAssets(html, page.url);

  for (const url of pageAssets) {
    if (knownAssets.has(url)) {
      continue;
    }
    const assetResponse = await fetchWithRetry(url);
    const bytes = Buffer.from(await assetResponse.arrayBuffer());
    const fileName = assetFileName(
      url,
      contentExtension(assetResponse.headers.get("content-type")),
    );
    await writeFile(path.join(snapshotDirectory, "assets", fileName), bytes);
    manifest.assets.push({
      bytes: bytes.length,
      contentType: assetResponse.headers.get("content-type"),
      file: `assets/${fileName}`,
      sha256: sha256(bytes),
      url,
    });
    knownAssets.add(url);
  }

  delete page.error;
  page.assetCount = pageAssets.length;
  page.file = `pages/${fileName}`;
  page.status = response.status;
  process.stdout.write(`Repaired ${page.url}\n`);
  await sleep(2_000);
}

manifest.assets.sort((left, right) => left.url.localeCompare(right.url));
manifest.counts.assetsDiscovered = manifest.assets.length;
manifest.counts.assetsDownloaded = manifest.assets.filter(
  (asset) => !asset.error,
).length;
manifest.counts.assetFailures = manifest.assets.filter(
  (asset) => asset.error,
).length;
manifest.counts.routeFailures = manifest.pages.filter(
  (page) => page.error,
).length;
const temporaryManifestPath = `${manifestPath}.tmp`;
await writeFile(
  temporaryManifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await rename(temporaryManifestPath, manifestPath);
process.stdout.write(`Updated ${manifestPath}\n`);
