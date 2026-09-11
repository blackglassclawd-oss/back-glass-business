/**
 * Applies Michael's 2026-09-12 iPhone 17-series owner approval to Shopify, from
 * data/catalog/iphone-17-series-owner-approval-2026-09-12.json:
 *
 *   1. Publishes the back-glass products the record marks APPROVED to Online
 *      Store, Shop and Point of Sale, only when every live gate passes: still an
 *      unpublished DRAFT, every variant at the approved price with a SKU and an
 *      approved image, and no stale Full Assembly / New Arrivals membership.
 *   2. Creates iPhone 17e Back Glass Half Assembly (No Coil) - Premium as an
 *      unpublished DRAFT with the approved structure, the no-price marker and no
 *      media, because no iPhone 16e image exists to reuse yet.
 *
 * Dry run by default. Applying requires --confirm-iphone17-owner-approval plus
 * --expect-publish=N and --expect-create=N matching the plan. It never touches a
 * coil, never changes a price, SKU, inventory or image on an existing product,
 * never edits a collection and never deletes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";
import {
  iphone17SeriesApproval,
  iphone17eBackGlass,
  iphone17eTemporaryImageAvailable,
  publishableIphone17BackGlass,
  type Iphone17BackGlassDecision,
} from "../app/data/iphone17-series-approval";
import { getProductInformation, productInformationHtml } from "../app/data/product-information";

/** Smart-collection membership left over from the Full Assembly retitle; publishing into either misfiles the part. */
const STALE_COLLECTIONS = ["full-assembly-with-charging-coil", "new-arrivals"];
const IPHONE17E_TAGS = ["premium", "iphone-17e", "commercial-data-blocked", "media-blocked"];

interface ProductNode {
  collections: { nodes: Array<{ handle: string }> };
  descriptionHtml: string;
  handle: string;
  id: string;
  media: { nodes: Array<{ alt: string | null; id: string }> };
  mediaCount: { count: number };
  onlineStoreUrl: string | null;
  options: Array<{ name: string; values: string[] }>;
  productType: string;
  resourcePublicationsV2: { nodes: Array<{ isPublished: boolean; publication: { id: string; name: string } }> };
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  tags: string[];
  title: string;
  totalInventory: number | null;
  variants: {
    nodes: Array<{
      id: string;
      inventoryItem: { tracked: boolean };
      inventoryPolicy: string;
      inventoryQuantity: number | null;
      media: { nodes: Array<{ id: string }> };
      price: string;
      sku: string | null;
      title: string;
    }>;
  };
  vendor: string;
}
type UserErrors = Array<{ field: string[] | null; message: string }>;

const PRODUCT_FIELDS = `
  id handle title status productType vendor tags totalInventory onlineStoreUrl descriptionHtml
  options { name values }
  mediaCount { count }
  media(first: 30) { nodes { id alt } }
  variants(first: 30) { nodes { id title price sku inventoryQuantity inventoryPolicy inventoryItem { tracked } media(first: 1) { nodes { id } } } }
  resourcePublicationsV2(first: 10, onlyPublished: false) { nodes { isPublished publication { id name } } }
  collections(first: 20) { nodes { handle } }
`;

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm-iphone17-owner-approval");
const expected = (flag: string) => {
  const argument = process.argv.find((value) => value.startsWith(`${flag}=`));
  return argument ? Number(argument.split("=")[1]) : Number.NaN;
};

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));

function throwUserErrors(operation: string, errors: UserErrors) {
  if (errors.length === 0) return;
  throw new Error(`${operation}: ${errors.map((error) => `${error.field?.join(".") ?? "input"}: ${error.message}`).join("; ")}`);
}

async function loadProducts(ids: string[]) {
  const response = await client.query<{ nodes: Array<ProductNode | null> }>(
    `query Iphone17SeriesProducts($ids: [ID!]!) { nodes(ids: $ids) { ... on Product { ${PRODUCT_FIELDS} } } }`,
    { ids },
  );
  return new Map(response.nodes.filter((node): node is ProductNode => node !== null).map((node) => [node.id, node]));
}

/** Every iPhone 17-family record, coils included, so a run can prove it changed nothing it was not meant to. */
async function loadFamilySnapshot() {
  const nodes: Array<{ id: string; status: string; title: string; updatedAt: string }> = [];
  let cursor: string | null = null;
  for (;;) {
    const page: {
      products: { nodes: typeof nodes; pageInfo: { endCursor: string; hasNextPage: boolean } };
    } = await client.query(
      `query Iphone17Family($cursor: String) { products(first: 100, after: $cursor, query: "title:*iPhone 17* OR title:*iPhone Air*") {
        pageInfo { hasNextPage endCursor } nodes { id status title updatedAt } } }`,
      { cursor },
    );
    nodes.push(...page.products.nodes);
    if (!page.products.pageInfo.hasNextPage) break;
    cursor = page.products.pageInfo.endCursor;
  }
  return nodes;
}

const publishedNames = (product: ProductNode) =>
  product.resourcePublicationsV2.nodes.filter((node) => node.isPublished).map((node) => node.publication.name).sort();

/** Returns the reasons a product may not be published now; empty means every gate passes. */
function publishBlockers(product: ProductNode | undefined, decision: Iphone17BackGlassDecision) {
  if (!product) return ["Product not found in Shopify."];
  const blockers: string[] = [];
  if (product.title !== decision.title) blockers.push(`Title is "${product.title}", expected "${decision.title}".`);
  if (product.productType !== "Back Glass" || /wireless charging coil/i.test(product.title)) blockers.push("Not a back-glass product.");
  if (product.status !== "DRAFT") blockers.push(`Status is ${product.status}, expected DRAFT.`);
  if (publishedNames(product).length) blockers.push(`Already published to ${publishedNames(product).join(", ")}.`);
  const colors = product.options.find((option) => option.name === "Color")?.values ?? [];
  if (colors.join("|") !== decision.colors.join("|")) blockers.push(`Colors are ${colors.join(", ")}.`);
  if (product.variants.nodes.length !== decision.colors.length) blockers.push("Variant count differs from the approved colors.");
  const skus = product.variants.nodes.map((variant) => variant.sku?.trim() ?? "");
  if (skus.some((sku) => !sku) || new Set(skus).size !== skus.length) blockers.push("A variant SKU is missing or duplicated.");
  for (const variant of product.variants.nodes) {
    if (variant.price !== decision.approvedSellingPrice) {
      blockers.push(`${variant.title} is $${variant.price}, approved price is $${decision.approvedSellingPrice}.`);
    }
    if (variant.media.nodes.length === 0) blockers.push(`${variant.title} has no assigned image.`);
  }
  if (product.mediaCount.count !== decision.media?.count) blockers.push(`Has ${product.mediaCount.count} images, approved set has ${decision.media?.count}.`);
  const altPrefix = decision.media?.altPrefix;
  if (!altPrefix || product.media.nodes.some((node) => !node.alt?.startsWith(altPrefix))) {
    blockers.push("An image is not from the owner-approved media set.");
  }
  const collections = product.collections.nodes.map((node) => node.handle);
  for (const stale of STALE_COLLECTIONS.filter((handle) => collections.includes(handle))) {
    blockers.push(`Still a member of ${stale} (stale smart-collection membership).`);
  }
  if (!collections.includes("half-assembly-without-charging-coil")) blockers.push("Not in half-assembly-without-charging-coil.");
  return blockers;
}

// ------------------------------------------------------------------ Plan

const capturedAt = new Date().toISOString();
const publishable = publishableIphone17BackGlass();
const record = iphone17SeriesApproval.backGlass;
const products = await loadProducts(record.map((entry) => entry.productId));

const publications = await client.query<{ publications: { nodes: Array<{ id: string; name: string }> } }>(
  `{ publications(first: 20) { nodes { id name } } }`,
);
const channelIds = iphone17SeriesApproval.publicationChannels.map((name) => {
  const match = publications.publications.nodes.find((publication) => publication.name === name);
  if (!match) throw new Error(`Sales channel ${name} not found.`);
  return { id: match.id, name };
});

const publishPlan = publishable.map((decision) => {
  const product = products.get(decision.productId);
  const blockers = publishBlockers(product, decision);
  return {
    blockers,
    colors: decision.colors,
    currentChannels: product ? publishedNames(product) : [],
    currentCollections: product?.collections.nodes.map((node) => node.handle) ?? [],
    currentStatus: product?.status ?? null,
    inventory: product?.variants.nodes.map((variant) => ({
      policy: variant.inventoryPolicy,
      quantity: variant.inventoryQuantity,
      tracked: variant.inventoryItem.tracked,
    })),
    mediaCount: product?.mediaCount.count ?? null,
    mutations: [
      `publishablePublish → ${channelIds.map((channel) => channel.name).join(", ")}`,
      "productUpdate status DRAFT → ACTIVE",
    ],
    price: decision.approvedSellingPrice,
    productId: decision.productId,
    ready: blockers.length === 0,
    skus: product?.variants.nodes.map((variant) => variant.sku),
    title: decision.title,
  };
});

const notPublished = record
  .filter((entry) => !publishable.includes(entry))
  .map((entry) => ({
    blockers: entry.openFactualBlockers,
    currentStatus: products.get(entry.productId)?.status ?? null,
    decision: entry.catalogDecision === "NOT_OFFERED" ? "NOT_OFFERED" : entry.publication,
    title: entry.title,
  }));

// iPhone 17e: re-verify the approved identifiers immediately before any create.
const handleOwner = await client.query<{ productByIdentifier: { id: string; status: string; title: string } | null }>(
  `query($handle: String!) { productByIdentifier(identifier: { handle: $handle }) { id status title } }`,
  { handle: iphone17eBackGlass.handle },
);
const skuConflicts: string[] = [];
for (const sku of Object.values(iphone17eBackGlass.skus)) {
  const result = await client.query<{ productVariants: { nodes: Array<{ product: { title: string }; sku: string | null }> } }>(
    `query($query: String!) { productVariants(first: 10, query: $query) { nodes { sku product { title } } } }`,
    { query: `sku:${sku}` },
  );
  for (const node of result.productVariants.nodes.filter((variant) => variant.sku === sku)) {
    skuConflicts.push(`${sku} is already used by ${node.product.title}`);
  }
}
const existing17e = handleOwner.productByIdentifier;
const variants17e = iphone17eBackGlass.colors.map((color) => ({ color, sku: iphone17eBackGlass.skus[color] }));
const facts17e = getProductInformation({
  handle: iphone17eBackGlass.handle,
  options: [{ name: "Color", position: 1, values: iphone17eBackGlass.colors }],
  product_information: undefined,
  product_type: iphone17eBackGlass.productType,
  tags: IPHONE17E_TAGS,
  title: iphone17eBackGlass.title,
  variants: variants17e.map(({ color, sku }, index) => ({
    available: false, compare_at_price: null, featured_image: null, id: index,
    option1: color, option2: null, option3: null, price: iphone17eBackGlass.draftPriceMarker, sku, title: color,
  })),
});
const description17e = productInformationHtml(facts17e);
const create17eBlockers = [
  ...(existing17e && (existing17e.title !== iphone17eBackGlass.title || existing17e.status !== "DRAFT")
    ? [`Handle ${iphone17eBackGlass.handle} is taken by "${existing17e.title}" (${existing17e.status}).`]
    : []),
  ...(existing17e ? [] : skuConflicts),
  ...(description17e ? [] : [`Canonical description generator refused the 17e product: ${facts17e.issues.join(", ")}`]),
];

const create17ePlan = {
  action: existing17e ? "ALREADY_EXISTS_VERIFY_ONLY" : "CREATE_DRAFT",
  blockers: create17eBlockers,
  colors: iphone17eBackGlass.colors,
  handle: iphone17eBackGlass.handle,
  inventory: "untracked, DENY, no quantity (store baseline; not a stock claim)",
  media: iphone17eTemporaryImageAvailable()
    ? "Temporary iPhone 16e image set"
    : "NONE — no iPhone 16e image exists to reuse (sourceAssetStatus NO_16E_IMAGE_EXISTS)",
  price: `${iphone17eBackGlass.draftPriceMarker} no-approved-price marker`,
  productType: iphone17eBackGlass.productType,
  publication: "none (DRAFT)",
  skus: iphone17eBackGlass.skus,
  status: "DRAFT",
  tags: IPHONE17E_TAGS,
  title: iphone17eBackGlass.title,
};

const readyPublish = publishPlan.filter((entry) => entry.ready);
const createCount = create17ePlan.action === "CREATE_DRAFT" && create17eBlockers.length === 0 ? 1 : 0;
const plan = {
  capturedAt,
  create17e: create17ePlan,
  evidenceId: iphone17SeriesApproval.evidenceId,
  mode: apply ? "APPLY" : "DRY_RUN",
  notPublished,
  publish: publishPlan,
  summary: {
    coilMutations: 0,
    collectionMutations: 0,
    create: createCount,
    inventoryMutations: 0,
    priceMutations: 0,
    publish: readyPublish.length,
    publishBlocked: publishPlan.length - readyPublish.length,
  },
};

console.log(JSON.stringify(plan, null, 2));

if (!apply) {
  console.log("\nDRY RUN: no Shopify changes made.");
  process.exit(0);
}

if (!confirmed || expected("--expect-publish") !== readyPublish.length || expected("--expect-create") !== createCount) {
  throw new Error(
    `Apply requires --confirm-iphone17-owner-approval --expect-publish=${readyPublish.length} --expect-create=${createCount}.`,
  );
}

// ------------------------------------------------------------------ Apply

const familyBefore = await loadFamilySnapshot();
const backupDirectory = resolve("backups/iphone17-series-2026-09-12");
const stamp = capturedAt.replaceAll(":", "-");
await mkdir(backupDirectory, { recursive: true });
const backupPath = resolve(backupDirectory, `before-${stamp}.json`);
await writeFile(
  backupPath,
  `${JSON.stringify({ capturedAt, familyBefore, plan, productsBefore: [...products.values()] }, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" },
);

for (const entry of readyPublish) {
  // Publish while still DRAFT, then activate: a failure in between leaves the
  // product invisible rather than half-live.
  const published = await client.query<{ publishablePublish: { userErrors: UserErrors } }>(
    `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
    { id: entry.productId, input: channelIds.map((channel) => ({ publicationId: channel.id })) },
  );
  throwUserErrors(`Publish ${entry.title}`, published.publishablePublish.userErrors);
  const activated = await client.query<{ productUpdate: { userErrors: UserErrors } }>(
    `mutation($product: ProductUpdateInput!) { productUpdate(product: $product) { userErrors { field message } } }`,
    { product: { id: entry.productId, status: "ACTIVE" } },
  );
  throwUserErrors(`Activate ${entry.title}`, activated.productUpdate.userErrors);
  console.log(`PUBLISHED\t${entry.title}`);
}

let created17eId: string | null = existing17e?.id ?? null;
if (createCount === 1) {
  const result = await client.query<{ productSet: { product: { id: string } | null; userErrors: UserErrors } }>(
    `mutation($input: ProductSetInput!) { productSet(synchronous: true, input: $input) { product { id } userErrors { field message } } }`,
    {
      input: {
        descriptionHtml: description17e,
        handle: iphone17eBackGlass.handle,
        productOptions: [{ name: "Color", values: iphone17eBackGlass.colors.map((name) => ({ name })) }],
        productType: iphone17eBackGlass.productType,
        status: "DRAFT",
        tags: IPHONE17E_TAGS,
        title: iphone17eBackGlass.title,
        variants: variants17e.map(({ color, sku }) => ({
          inventoryItem: { sku, tracked: false },
          inventoryPolicy: "DENY",
          optionValues: [{ name: color, optionName: "Color" }],
          price: iphone17eBackGlass.draftPriceMarker,
        })),
        vendor: iphone17eBackGlass.vendor,
      },
    },
  );
  throwUserErrors(`Create ${iphone17eBackGlass.title}`, result.productSet.userErrors);
  created17eId = result.productSet.product!.id;
  console.log(`CREATED\t${iphone17eBackGlass.title}\t${created17eId}`);
}

// ------------------------------------------------------------------ Verify

const after = await loadProducts([...record.map((entry) => entry.productId), ...(created17eId ? [created17eId] : [])]);
const failures: string[] = [];
for (const entry of readyPublish) {
  const product = after.get(entry.productId)!;
  const decision = publishable.find((item) => item.productId === entry.productId)!;
  if (product.status !== "ACTIVE") failures.push(`${entry.title}: status ${product.status}`);
  if (publishedNames(product).join("|") !== [...channelIds.map((channel) => channel.name)].sort().join("|")) {
    failures.push(`${entry.title}: published to ${publishedNames(product).join(", ") || "nothing"}`);
  }
  if (product.variants.nodes.some((variant) => variant.price !== decision.approvedSellingPrice)) failures.push(`${entry.title}: price changed`);
  if (product.variants.nodes.map((variant) => variant.sku).join("|") !== entry.skus!.join("|")) failures.push(`${entry.title}: SKU changed`);
  if (product.mediaCount.count !== entry.mediaCount) failures.push(`${entry.title}: media changed`);
  if (product.collections.nodes.some((node) => STALE_COLLECTIONS.includes(node.handle))) failures.push(`${entry.title}: in a stale collection`);
}
if (created17eId) {
  const product = after.get(created17eId);
  if (!product) failures.push("17e: not found after create");
  else {
    if (product.status !== "DRAFT") failures.push(`17e: status ${product.status}`);
    if (publishedNames(product).length) failures.push("17e: published to a sales channel");
    if (product.mediaCount.count !== 0) failures.push("17e: has media");
    if (product.variants.nodes.map((variant) => `${variant.title}=${variant.sku}`).join("|") !== variants17e.map(({ color, sku }) => `${color}=${sku}`).join("|")) {
      failures.push("17e: variants or SKUs differ from the approved structure");
    }
    if (product.variants.nodes.some((variant) => variant.price !== iphone17eBackGlass.draftPriceMarker || variant.inventoryItem.tracked || variant.inventoryQuantity)) {
      failures.push("17e: a variant carries a price, tracking or quantity");
    }
  }
}
// Nothing else in the iPhone 17 family, coils included, may have changed.
const touched = new Set([...readyPublish.map((entry) => entry.productId), ...(created17eId ? [created17eId] : [])]);
const familyAfter = await loadFamilySnapshot();
for (const before of familyBefore.filter((product) => !touched.has(product.id))) {
  const now = familyAfter.find((product) => product.id === before.id);
  if (!now || now.status !== before.status || now.updatedAt !== before.updatedAt) failures.push(`Collateral change: ${before.title}`);
}

const verificationPath = resolve(backupDirectory, `after-${stamp}.json`);
await writeFile(
  verificationPath,
  `${JSON.stringify({ capturedAt: new Date().toISOString(), failures, familyAfter, productsAfter: [...after.values()] }, null, 2)}\n`,
  { encoding: "utf8", flag: "wx" },
);
if (failures.length) throw new Error(`Verification failed:\n${failures.join("\n")}\nbackup=${backupPath}`);
console.log(`\nAPPLIED AND VERIFIED\tpublished=${readyPublish.length}\tcreated=${createCount}\tbackup=${backupPath}\tverification=${verificationPath}`);
