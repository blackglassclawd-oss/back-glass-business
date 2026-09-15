/**
 * Removes the two base iPhone 17 release targets from the manual inclusion
 * selections of the Full Assembly and New Arrivals collections, using the
 * guarded helper in scripts/lib/iphone17-collection-cleanup.ts.
 *
 * Dry run by default. Applying requires
 *   --apply --confirm-remove-base-iphone17-collection-selections --expect-collections=2 --expect-product-removals=4
 *
 * Only those four selection removals are sent. Conditions, match types,
 * exclusions, sources, titles, SEO, sort order and publications are never part
 * of the mutation, and the six other iPhone 17 / Air selections are preserved.
 * Collection totals are printed as diagnostics; the release gate is target
 * membership, not a count.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";
import baselineJson from "../data/catalog/iphone-17-release-baseline-2026-09-15.json";
import {
  BASE_IPHONE17_SELECTION_CLEANUP as SPEC,
  assertCleanupScope,
  assertNarrowCleanupInput,
  cleanupMutationInput,
  executeCleanup,
  planCleanup,
} from "./lib/iphone17-collection-cleanup";
import type { ReleaseBaseline } from "./lib/iphone17-release";

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm-remove-base-iphone17-collection-selections");
const expected = (flag: string) => {
  const argument = process.argv.find((value) => value.startsWith(`${flag}=`));
  return argument ? Number(argument.split("=")[1]) : Number.NaN;
};

assertCleanupScope(SPEC, baselineJson as unknown as ReleaseBaseline);
const client = new ShopifyAdminClient(loadShopifyConfig(process.env));

const capturedAt = new Date().toISOString();
const { blockers, plans, states, summary } = await planCleanup(client, SPEC);
const mutations = plans.map((plan) => {
  const input = cleanupMutationInput(plan);
  if (!plan.blockers.length) assertNarrowCleanupInput(input, SPEC);
  return input;
});

console.log(JSON.stringify({
  blockers,
  capturedAt,
  collections: plans.map((plan, index) => ({
    blockers: plan.blockers,
    collectionId: plan.collectionId,
    conditions: states[index].sources[0]?.conditions,
    diagnosticProductsCount: { before: plan.productsCountBefore, predictedAfter: plan.predictedProductsCount },
    expectedPostSelections: plan.expectedPostSelections.map((selection) => selection.productId),
    handle: plan.handle,
    plannedMutationInput: mutations[index],
    preSelections: plan.preSelections.map((selection) => `${selection.productId}${selection.variantIds ? ` variants=${selection.variantIds.join("|")}` : ""}`),
    publications: states[index].publications,
    selectionsToRemove: plan.selectionsToRemove,
    source: states[index].sources.map(({ appId, id, shareable, targetType, typename }) => ({ appId, id, shareable, targetType, typename })),
    targetEffectiveMembership: states[index].targetMembership,
  })),
  mode: apply ? "APPLY" : "DRY_RUN",
  summary,
}, null, 2));

if (!apply) {
  console.log("\nDRY RUN: no Shopify changes made.");
  process.exit(0);
}

if (!confirmed || summary.blocked || expected("--expect-collections") !== summary.collections || expected("--expect-product-removals") !== summary.productRemovals
  || summary.collections !== SPEC.collections.length || summary.productRemovals !== SPEC.collections.length * SPEC.productIds.length) {
  throw new Error(
    `Apply requires an unblocked plan and --confirm-remove-base-iphone17-collection-selections --expect-collections=${SPEC.collections.length} --expect-product-removals=${SPEC.collections.length * SPEC.productIds.length}.`,
  );
}

const backupDirectory = resolve("backups/iphone17-collection-cleanup-2026-09-15");
const stamp = capturedAt.replaceAll(":", "-");
await mkdir(backupDirectory, { recursive: true });
const result = await executeCleanup({
  client,
  log: (line) => console.log(line),
  onBeforeWrites: async (capture) => {
    await writeFile(resolve(backupDirectory, `before-${stamp}.json`), `${JSON.stringify({ capturedAt, ...capture }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  },
  spec: SPEC,
});
await writeFile(resolve(backupDirectory, `result-${stamp}.json`), `${JSON.stringify({ finishedAt: new Date().toISOString(), result }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify(result, null, 2));
if (result.outcome !== "APPLIED") throw new Error(`Cleanup outcome ${result.outcome}; see backups/iphone17-collection-cleanup-2026-09-15/result-${stamp}.json`);
console.log("\nAPPLIED AND VERIFIED\tcollections=2\tproductRemovals=4");
