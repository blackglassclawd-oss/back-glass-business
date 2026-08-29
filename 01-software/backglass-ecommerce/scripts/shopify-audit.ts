import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { captureShopifyStoreAudit } from "../app/services/shopify/audit.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

const config = loadShopifyConfig(process.env);
const audit = await captureShopifyStoreAudit(new ShopifyAdminClient(config));
const outputDirectory = resolve("backups/audits");
const timestamp = audit.capturedAt.replaceAll(":", "-");
const outputPath = resolve(outputDirectory, `${timestamp}.json`);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});

console.log(`Shopify audit written to ${outputPath}`);
