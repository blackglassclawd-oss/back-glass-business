import crypto from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("output/model-media-review-2026-08-14");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else if (entry.name !== "manifest.json") files.push(entryPath);
  }
  return files;
}

const files = await walk(root);
const manifest = {
  capturedAt: new Date().toISOString(),
  status: "review-only",
  rules: {
    aiGenerated: false,
    crossModelReuse: false,
    exactModelSourceRequired: true,
    magnetsRetained: true,
    chargingCoilIncluded: false,
    metallicHeatFilmVisibleInsideMagnetCircle: true,
    shopifyUploadApproved: false,
  },
  files: [],
};

for (const filePath of files.sort()) {
  const bytes = await readFile(filePath);
  manifest.files.push({
    bytes: (await stat(filePath)).size,
    path: path.relative(root, filePath),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  });
}

await writeFile(
  path.join(root, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Wrote ${manifest.files.length} review-file hashes.`);
