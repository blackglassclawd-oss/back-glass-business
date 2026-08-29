import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import {
  getBulkExportStatus,
  SHOPIFY_BULK_EXPORTS,
  startBulkExport,
} from "../app/services/shopify/bulk.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

const POLL_INTERVAL_MS = 10_000;
const OPERATION_TIMEOUT_MS = 30 * 60 * 1_000;
const terminalStatuses = new Set([
  "CANCELED",
  "COMPLETED",
  "EXPIRED",
  "FAILED",
]);

const sleep = (milliseconds: number) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function waitForOperation(
  client: ShopifyAdminClient,
  operationId: string,
) {
  const deadline = Date.now() + OPERATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const operation = await getBulkExportStatus(client, operationId);
    process.stdout.write(
      `${operation.id}: ${operation.status} (${operation.objectCount} objects)\n`,
    );
    if (terminalStatuses.has(operation.status)) {
      return operation;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Bulk operation timed out: ${operationId}`);
}

async function downloadJsonLines(url: string, outputPath: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Bulk download returned HTTP ${response.status}.`);
  }

  const hash = createHash("sha256");
  const hashingStream = new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await pipeline(
    Readable.fromWeb(
      response.body as unknown as NodeReadableStream<Uint8Array>,
    ),
    hashingStream,
    createWriteStream(outputPath, { flags: "wx" }),
  );
  return hash.digest("hex");
}

const config = loadShopifyConfig(process.env);
const client = new ShopifyAdminClient(config);
const timestamp = new Date().toISOString().replaceAll(":", "-");
const outputDirectory = resolve("backups", "admin", timestamp);
await mkdir(outputDirectory, { recursive: true });

const manifest = {
  apiVersion: config.apiVersion,
  completedAt: "",
  exports: [] as Array<Record<string, unknown>>,
  startedAt: new Date().toISOString(),
  storeDomain: config.storeDomain,
};

for (const [name, query] of Object.entries(SHOPIFY_BULK_EXPORTS)) {
  try {
    process.stdout.write(`Starting ${name} export.\n`);
    const started = await startBulkExport(client, query);
    const operation = await waitForOperation(client, started.id);
    const resultUrl = operation.url ?? operation.partialDataUrl;
    let file: string | null = null;
    let sha256: string | null = null;

    if (resultUrl) {
      file = `${name}.jsonl`;
      sha256 = await downloadJsonLines(
        resultUrl,
        resolve(outputDirectory, file),
      );
    }

    const {
      url: _temporaryDownloadUrl,
      partialDataUrl: _temporaryPartialDownloadUrl,
      ...operationMetadata
    } = operation;

    manifest.exports.push({
      file,
      name,
      operation: operationMetadata,
      partial: !operation.url && Boolean(operation.partialDataUrl),
      sha256,
    });
  } catch (error) {
    manifest.exports.push({
      error: error instanceof Error ? error.message : String(error),
      name,
    });
  }
}

manifest.completedAt = new Date().toISOString();
await writeFile(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" },
);

const failures = manifest.exports.filter((entry) => entry.error).length;
process.stdout.write(
  `Admin export manifest written to ${outputDirectory}/manifest.json\n`,
);
if (failures > 0) {
  process.exitCode = 1;
}
