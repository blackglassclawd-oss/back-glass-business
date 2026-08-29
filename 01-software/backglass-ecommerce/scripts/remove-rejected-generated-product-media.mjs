import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";

const apply = process.argv.includes("--apply");
const workspaceRoot = path.resolve(import.meta.dirname, "..");
const businessRoot = path.resolve(workspaceRoot, "../..");
const assetRoot = path.join(businessRoot, "02-assets");
const reviewRoot = path.join(workspaceRoot, "output/model-media-review-2026-08-14");
const runId = "backglass-rejected-generated-media-2026-08-14";
const trashRoot = path.join(os.homedir(), ".Trash", runId);

const targets = [
  {
    label: "iphone-16-generated-preview-images",
    source: path.join(
      assetRoot,
      "product-previews/iphone-16-series-half-assembly-no-coil/2026-08-13/images",
    ),
  },
  {
    label: "iphone-16-generated-preview-review",
    source: path.join(
      assetRoot,
      "product-previews/iphone-16-series-half-assembly-no-coil/2026-08-13/review",
    ),
  },
  {
    label: "iphone-17-generated-preview-images",
    source: path.join(
      assetRoot,
      "product-previews/iphone-17-series-half-assembly-no-coil/2026-08-14/images",
    ),
  },
  {
    label: "iphone-17-generated-preview-masters",
    source: path.join(
      assetRoot,
      "product-previews/iphone-17-series-half-assembly-no-coil/2026-08-14/masters",
    ),
  },
  {
    label: "iphone-17-generated-preview-review",
    source: path.join(
      assetRoot,
      "product-previews/iphone-17-series-half-assembly-no-coil/2026-08-14/review",
    ),
  },
  {
    label: "iphone-16-generated-public-corrections",
    source: path.join(
      workspaceRoot,
      "public/product-media/shopify-corrections-2026-08-13/iphone-16-series-half-assembly",
    ),
  },
  ...["black", "natural", "white"].map((color) => ({
    label: `iphone-16-pro-generated-overlap-${color}`,
    source: path.join(
      workspaceRoot,
      `public/product-media/shopify-corrections-2026-08-13/iphone-16-pro-half-assembly-${color}-overlap-2026-08-13.png`,
    ),
  })),
  {
    label: "iphone-17-pro-max-silver-disqualified-composite",
    source: path.join(
      assetRoot,
      "shopify-website/backglasspro/iPhone 17 Series/source/iphone-17-pro-max-silver-composite.png",
    ),
  },
  {
    label: "iphone-17-pro-max-silver-disqualified-export",
    source: path.join(
      assetRoot,
      "shopify-website/backglasspro/iPhone 17 Series/shopify-ready/iphone-17-pro-max-silver-fa.jpg",
    ),
  },
];

function assertSafeTarget(source) {
  const allowedRoots = [workspaceRoot, assetRoot];
  if (!allowedRoots.some((root) => source.startsWith(`${root}${path.sep}`))) {
    throw new Error(`Refusing target outside allowed roots: ${source}`);
  }
}

async function walk(source, relative = "") {
  const sourceStat = await stat(source);
  if (!sourceStat.isDirectory()) {
    return [{ absolute: source, relative: relative || path.basename(source) }];
  }

  const files = [];
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const entryRelative = path.join(relative, entry.name);
    const entryPath = path.join(source, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath, entryRelative)));
    else files.push({ absolute: entryPath, relative: entryRelative });
  }
  return files;
}

const manifest = {
  createdAt: new Date().toISOString(),
  mode: apply ? "applied" : "dry-run",
  reason:
    "Removed rejected generated or cross-color-composited product media. Exact-model source references were preserved.",
  recoveryRoot: apply ? trashRoot : null,
  shopifyMutated: false,
  targets: [],
};

for (const target of targets) {
  assertSafeTarget(target.source);
  const files = await walk(target.source);
  const recordedFiles = [];
  let bytes = 0;
  for (const file of files.sort((a, b) => a.relative.localeCompare(b.relative))) {
    const contents = await readFile(file.absolute);
    bytes += contents.byteLength;
    recordedFiles.push({
      relativePath: file.relative,
      bytes: contents.byteLength,
      sha256: crypto.createHash("sha256").update(contents).digest("hex"),
    });
  }

  const destination = path.join(trashRoot, target.label);
  manifest.targets.push({
    label: target.label,
    source: target.source,
    destination: apply ? destination : null,
    fileCount: recordedFiles.length,
    bytes,
    files: recordedFiles,
  });

  if (apply) {
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(target.source, destination);
  }
}

manifest.totals = {
  targetCount: manifest.targets.length,
  fileCount: manifest.targets.reduce((sum, target) => sum + target.fileCount, 0),
  bytes: manifest.targets.reduce((sum, target) => sum + target.bytes, 0),
};

if (apply) {
  await mkdir(reviewRoot, { recursive: true });
  await writeFile(
    path.join(reviewRoot, "rejected-media-removal-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

console.log(JSON.stringify(manifest, null, 2));
