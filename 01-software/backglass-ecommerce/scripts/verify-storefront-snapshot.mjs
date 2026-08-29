import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

async function fileSha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
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
const manifest = JSON.parse(
  await readFile(path.join(snapshotDirectory, "manifest.json"), "utf8"),
);
const failures = [];

for (const asset of manifest.assets) {
  if (asset.error) {
    failures.push(`${asset.url}: ${asset.error}`);
    continue;
  }
  const filePath = path.join(snapshotDirectory, asset.file);
  try {
    const details = await stat(filePath);
    if (details.size !== asset.bytes) {
      failures.push(`${asset.file}: expected ${asset.bytes} bytes`);
      continue;
    }
    const checksum = await fileSha256(filePath);
    if (checksum !== asset.sha256) {
      failures.push(`${asset.file}: checksum mismatch`);
    }
  } catch (error) {
    failures.push(
      `${asset.file}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

for (const page of manifest.pages) {
  if (!page.file) {
    failures.push(`${page.url}: page capture failed`);
    continue;
  }
  try {
    await stat(path.join(snapshotDirectory, page.file));
  } catch {
    failures.push(`${page.file}: page file missing`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        assetsVerified: manifest.assets.length,
        pagesVerified: manifest.pages.length,
        snapshotDirectory,
        status: "verified",
      },
      null,
      2,
    )}\n`,
  );
}
