/**
 * Releases the base iPhone 17 back glass approved in Michael's 2026-09-12 record
 * (data/catalog/iphone-17-series-owner-approval-2026-09-12.json), guarded by the
 * exact verified invariants in data/catalog/iphone-17-release-baseline-2026-09-15.json
 * and the all-or-nothing engine in scripts/lib/iphone17-release.ts.
 *
 * Dry run by default. Applying requires
 *   --apply --confirm-iphone17-owner-approval --expect-publish=2 --expect-create=0
 *
 * It publishes both baseline targets or neither, creates nothing (iPhone 17e
 * already exists and is only verified by its canonical product ID), never
 * changes a price, SKU, inventory, image, collection or coil, and rolls back
 * any partial release it cannot verify.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { iphone17SeriesApproval, publishableIphone17BackGlass } from "../app/data/iphone17-series-approval";
import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";
import baselineJson from "../data/catalog/iphone-17-release-baseline-2026-09-15.json";
import {
  assertReleaseScope,
  executeRelease,
  familyFingerprints,
  invariantReport,
  preflight,
  releaseSummary,
  type ReleaseBaseline,
} from "./lib/iphone17-release";

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm-iphone17-owner-approval");
const expected = (flag: string) => {
  const argument = process.argv.find((value) => value.startsWith(`${flag}=`));
  return argument ? Number(argument.split("=")[1]) : Number.NaN;
};

const baseline = baselineJson as unknown as ReleaseBaseline;
assertReleaseScope(baseline, publishableIphone17BackGlass());
const client = new ShopifyAdminClient(loadShopifyConfig(process.env));

// ------------------------------------------------------------------ Plan

const capturedAt = new Date().toISOString();
const checks = await preflight(client, baseline);
const family = await familyFingerprints(client);
const summary = releaseSummary(checks);
const releaseIds = new Set(baseline.targets.map((target) => target.productId));

const plan = {
  canonical17e: { action: "VERIFY_CANONICAL_ID_ONLY", blockers: checks.canonical17e, productId: baseline.canonical17e.productId },
  capturedAt,
  evidenceId: iphone17SeriesApproval.evidenceId,
  familyRecordsFingerprinted: family.size,
  globalBlockers: checks.blockers,
  mode: apply ? "APPLY" : "DRY_RUN",
  notPublished: iphone17SeriesApproval.backGlass
    .filter((entry) => !releaseIds.has(entry.productId))
    .map((entry) => ({
      blockers: entry.openFactualBlockers,
      decision: entry.catalogDecision === "NOT_OFFERED" ? "NOT_OFFERED" : entry.publication,
      title: entry.title,
    })),
  publish: checks.targets.map(({ baseline: target, blockers, state }) => ({
    blockers,
    currentChannels: state?.publishedChannels ?? [],
    currentCollections: state?.collections ?? [],
    currentStatus: state?.status ?? null,
    invariants: state ? invariantReport(state, target, baseline.releaseChannels) : null,
    mutations: [`publishablePublish while DRAFT → ${baseline.releaseChannels.join(", ")}`, "productUpdate status DRAFT → ACTIVE"],
    price: target.approvedSellingPrice,
    productId: target.productId,
    ready: blockers.length === 0,
    title: target.title,
  })),
  releaseChannels: baseline.releaseChannels,
  summary,
};

console.log(JSON.stringify(plan, null, 2));

if (!apply) {
  console.log("\nDRY RUN: no Shopify changes made.");
  process.exit(0);
}

if (!confirmed || summary.publish !== baseline.targets.length || expected("--expect-publish") !== summary.publish || expected("--expect-create") !== 0) {
  throw new Error(
    `Apply requires a fully ready plan (publish=${summary.publish}) and --confirm-iphone17-owner-approval --expect-publish=${baseline.targets.length} --expect-create=0.`,
  );
}

// ------------------------------------------------------------------ Apply

const backupDirectory = resolve("backups/iphone17-series-2026-09-12");
const stamp = capturedAt.replaceAll(":", "-");
await mkdir(backupDirectory, { recursive: true });

const result = await executeRelease({
  baseline,
  client,
  log: (line) => console.log(line),
  onBeforeWrites: async ({ familyBefore, preStates }) => {
    await writeFile(
      resolve(backupDirectory, `before-${stamp}.json`),
      `${JSON.stringify({ capturedAt, familyBefore: [...familyBefore.values()], plan, preStates }, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  },
});

await writeFile(
  resolve(backupDirectory, `result-${stamp}.json`),
  `${JSON.stringify({ finishedAt: new Date().toISOString(), result }, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" },
);
console.log(JSON.stringify(result, null, 2));

if (result.outcome !== "RELEASED") {
  throw new Error(`Release outcome ${result.outcome}; nothing is reported as released. See backups/iphone17-series-2026-09-12/result-${stamp}.json`);
}
console.log(`\nAPPLIED AND VERIFIED\tpublished=${baseline.targets.length}\tcreated=0`);
