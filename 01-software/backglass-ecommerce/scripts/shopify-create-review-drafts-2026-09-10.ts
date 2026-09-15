/**
 * Creates and updates DRAFT products for Michael's review in two authorized sets:
 *
 *   1. Premium Plus back-glass half assemblies (eligible Pro Max models only).
 *   2. Standalone Wireless Charging Coil drafts from the canonical coil catalog.
 *
 * Dry run by default. Applying requires the explicit confirmation flag and the
 * expected counts, mirroring the existing coil-draft and retirement scripts.
 *
 * The script never publishes, never activates, never touches inventory, never
 * deletes, and refuses to write to any product outside the two authorized sets.
 * --premium-plus-only limits a run to the Premium Plus drafts and leaves every
 * coil draft untouched; --only-model=<slug> narrows it to one eligible model.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import coilCatalog from "../data/catalog/wireless-charging-coils-2026-08-29.json";
import mediaProvenance from "../data/catalog/review-media-provenance-2026-09-10.json";
import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";
import {
  getProductInformation,
  premiumPlusGrade,
  productInformationHtml,
  escapeHtml,
} from "../app/data/product-information";

const BACK_GLASS_TYPE = "Back Glass";
const COIL_TYPE = "Wireless Charging Coil";
const VENDOR = "Back Glass Pros";
/** Price 0 with no SKU is this repository's established "commercial data blocked" draft convention. */
const NO_APPROVED_PRICE = "0.00";
/** Marks every image this script copied onto a Premium Plus draft, so it can reconcile its own media. */
const SHARED_MEDIA_MARKER = "shared from the Premium half-assembly image set";
/** Recognises images this script added under any alt-text generation it has used. */
const SHARED_MEDIA_PATTERN = /shared from the .*premium half[ -]assembly image set/i;
/** Labels left over from the retired Full Assembly identity. */
const RETIRED_LABEL_PATTERN = /full.assembly|with.coil|[-_]fa\b|[-_]fa\./i;
/** Premium image sets that were visually verified and owner reviewed, keyed by model slug. */
const ownerReviewedMedia = mediaProvenance.premiumPlusMedia as Record<string, { imageCount: number; status: string }>;
const ownerReviewedModels = new Map((premiumPlusGrade.ownerReview ?? []).map((review) => [review.model, review]));

interface Variant {
  id: string;
  inventoryQuantity: number | null;
  price: string;
  sku: string | null;
  title: string;
}
interface MediaNode {
  id?: string;
  image?: { altText: string | null; url: string } | null;
}
interface ProductNode {
  descriptionHtml: string;
  handle: string;
  id: string;
  media: { nodes: MediaNode[] };
  mediaCount: { count: number };
  options: Array<{ name: string; values: string[] }>;
  productType: string;
  resourcePublicationsV2: {
    nodes: Array<{ isPublished: boolean; publication: { name: string } }>;
  };
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  tags: string[];
  title: string;
  totalInventory: number | null;
  variants: { nodes: Variant[] };
  vendor: string;
}

const PRODUCT_FIELDS = `
  descriptionHtml
  handle
  id
  mediaCount { count }
  media(first: 25) { nodes { ... on MediaImage { id image { url altText } } } }
  options { name values }
  productType
  status
  tags
  title
  totalInventory
  vendor
  variants(first: 60) { nodes { id title sku price inventoryQuantity } }
  resourcePublicationsV2(first: 20) { nodes { isPublished publication { name } } }
`;

const INVENTORY_QUERY = `#graphql
  query ReviewDraftInventory($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `#graphql
  mutation CreateReviewDraft($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product { ${PRODUCT_FIELDS} }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `#graphql
  mutation UpdateReviewDraft($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { ${PRODUCT_FIELDS} }
      userErrors { field message }
    }
  }
`;

const VARIANTS_BULK_CREATE_MUTATION = `#graphql
  mutation AddReviewDraftVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants { id title }
      userErrors { field message }
    }
  }
`;

const CREATE_MEDIA_MUTATION = `#graphql
  mutation AddReviewDraftMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id } }
      mediaUserErrors { field message }
    }
  }
`;

const DELETE_MEDIA_MUTATION = `#graphql
  mutation RemoveDuplicateReviewDraftMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      mediaUserErrors { field message }
    }
  }
`;

const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm-shopify-draft-review");
const premiumPlusOnly = process.argv.includes("--premium-plus-only");
/** --only-model=<slug> narrows the Premium Plus pass to one eligible model. */
const onlyModel = process.argv.find((value) => value.startsWith("--only-model="))?.split("=")[1] ?? null;
if (onlyModel && !premiumPlusGrade.eligibleModels.some((model) => model.slug === onlyModel)) {
  throw new Error(`--only-model=${onlyModel} is not a Premium Plus eligible model.`);
}
const expected = (flag: string) => {
  const argument = process.argv.find((value) => value.startsWith(`${flag}=`));
  return argument ? Number(argument.split("=")[1]) : Number.NaN;
};

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));

async function inventory() {
  const nodes: ProductNode[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page: {
      products: {
        nodes: ProductNode[];
        pageInfo: { endCursor: string; hasNextPage: boolean };
      };
    } = await client.query(INVENTORY_QUERY, { cursor });
    nodes.push(...page.products.nodes);
    if (!page.products.pageInfo.hasNextPage) break;
    cursor = page.products.pageInfo.endCursor;
  }
  return nodes;
}

function throwUserErrors(
  operation: string,
  errors: Array<{ field: string[] | null; message: string }>,
) {
  if (errors.length === 0) return;
  throw new Error(
    `${operation}: ${errors.map((error) => `${error.field?.join(".") ?? "input"}: ${error.message}`).join("; ")}`,
  );
}

/** Every written product must still be an unpublished, uncommercialised draft. */
function assertSafeDraft(product: ProductNode, expectedType: string) {
  const fail = (reason: string) => {
    throw new Error(`${product.title}: ${reason}`);
  };
  if (product.status !== "DRAFT") fail(`status is ${product.status}, not DRAFT`);
  if (product.productType !== expectedType) fail("unexpected product type");
  if (product.resourcePublicationsV2.nodes.some((node) => node.isPublished)) {
    fail("is published to a sales channel");
  }
  if (product.totalInventory) fail("has inventory");
  for (const variant of product.variants.nodes) {
    if (Number(variant.price) !== 0) fail("has an invented price");
    if (variant.sku) fail("has an invented SKU");
    if (variant.inventoryQuantity) fail("has inventory");
  }
}

// ---------------------------------------------------------------- Premium Plus

interface PremiumPlusPlan {
  colors: string[];
  descriptionHtml: string;
  handle: string;
  mediaBlockedReason: string | null;
  model: string;
  slug: string;
  sourceHandle: string;
  sourceId: string;
  sourceMedia: Array<{ alt: string; url: string }>;
  tags: string[];
  title: string;
}

/**
 * Premium Plus inherits the Premium half assembly's images. A source image set is
 * only usable when nothing about it says it depicts a different part: the repository
 * media policy forbids representing a half assembly with full-assembly imagery.
 */
function mediaBlocker(source: ProductNode, slug: string) {
  if (source.mediaCount.count === 0) return "Premium source has no media.";
  // A set whose pixels were checked and owner reviewed is not judged by its labels:
  // retired full-assembly wording there is left over from the old handle. The
  // count must still match, so a changed source set is re-verified, not trusted.
  const reviewed = ownerReviewedMedia[slug];
  if (reviewed?.status === "APPROVED_OWNER_REVIEWED_STORE_MEDIA") {
    return source.mediaCount.count === reviewed.imageCount
      ? null
      : `Premium source has ${source.mediaCount.count} images but the owner-reviewed set has ${reviewed.imageCount}; re-verify before sharing.`;
  }
  const wrongPart = source.media.nodes.filter((node) =>
    RETIRED_LABEL_PATTERN.test(`${node.image?.altText ?? ""} ${node.image?.url ?? ""}`),
  );
  if (wrongPart.length) {
    return `${wrongPart.length} of ${source.mediaCount.count} Premium source images are labelled as full-assembly media; half-assembly imagery is not verified.`;
  }
  return null;
}

function planPremiumPlus(products: ProductNode[]): {
  plans: PremiumPlusPlan[];
  skipped: Array<{ model: string; reason: string }>;
} {
  const plans: PremiumPlusPlan[] = [];
  const skipped: Array<{ model: string; reason: string }> = [];

  for (const entry of premiumPlusGrade.eligibleModels.filter((model) => !onlyModel || model.slug === onlyModel)) {
    // Defence in depth: the iPhone 14 series is Glass Only, so no 14-series half
    // assembly may ever be planned even if the canonical record is edited wrongly.
    if (/^iPhone 14\b/.test(entry.model)) {
      skipped.push({
        model: entry.model,
        reason:
          "The iPhone 14 series is Glass Only in this catalog. Premium Plus is a half assembly, so no iPhone 14 model is eligible. Intentional architecture, not a blocker.",
      });
      continue;
    }
    const source = products.find(
      (product) =>
        product.productType === BACK_GLASS_TYPE &&
        product.title === `${entry.model} Back Glass Half Assembly (No Coil) - Premium`,
    );
    if (!source) {
      skipped.push({
        model: entry.model,
        reason:
          "No Premium half-assembly product exists for this model in Shopify, so there is no corresponding Premium image set to inherit. Not fabricated.",
      });
      continue;
    }

    const colors = source.options.find((option) => /^colou?r$/i.test(option.name))?.values ?? [];
    if (colors.length === 0) {
      skipped.push({ model: entry.model, reason: "Premium source has no Color option to mirror." });
      continue;
    }

    const title = `${entry.model} Back Glass Half Assembly (No Coil) - Premium Plus`;
    const handle = `${entry.slug}-half-assembly-no-coil-premium-plus`;
    const blocked = mediaBlocker(source, entry.slug);
    const ownerReview = ownerReviewedModels.get(entry.model);
    const tags = [
      "premium plus",
      entry.slug,
      "commercial-data-blocked",
      ...(ownerReview ? [] : ["owner-review-pending"]),
      ...(blocked ? ["media-blocked"] : []),
    ];
    const facts = getProductInformation({
      handle,
      options: [{ name: "Color", position: 1, values: colors }],
      product_information: undefined,
      product_type: BACK_GLASS_TYPE,
      tags,
      title,
      variants: colors.map((color, index) => ({
        available: false,
        compare_at_price: null,
        featured_image: null,
        id: index,
        option1: color,
        option2: null,
        option3: null,
        price: NO_APPROVED_PRICE,
        sku: "",
        title: color,
      })),
    });
    const generated = productInformationHtml(facts);
    if (!generated) {
      skipped.push({ model: entry.model, reason: "Canonical description generator refused this product." });
      continue;
    }

    plans.push({
      colors,
      descriptionHtml: `${generated}<h2>Draft review status</h2><ul><li>Draft for Michael's review. Not published, not for sale.</li><li>No approved selling price, SKU or starting inventory. Price shown as ${NO_APPROVED_PRICE} is this catalog's "no approved price" marker, not a proposed price.</li><li>${escapeHtml(blocked ?? `Images are shared from the ${entry.model} Premium half assembly (${source.handle}). No separate Premium Plus photography exists.`)}</li><li>${
        ownerReview
          ? `Michael reviewed this draft with the iPhone 17 series on ${escapeHtml(ownerReview.reviewedAt)} (${escapeHtml(ownerReview.evidenceId)}). The camera-lens description still needs supporting evidence and does not establish Apple origin or OEM supply.`
          : `Camera-lens description is owner-specified (${escapeHtml(premiumPlusGrade.evidenceId)}) and awaits Michael's confirmation. It does not establish Apple origin or OEM supply.`
      }</li></ul>`,
      handle,
      mediaBlockedReason: blocked,
      model: entry.model,
      slug: entry.slug,
      sourceHandle: source.handle,
      sourceId: source.id,
      sourceMedia: blocked
        ? []
        : source.media.nodes
            .filter((node) => node.image?.url)
            .map((node, index, all) => ({
              // The index keeps each alt unique even when the Premium source images
              // carry no alt text of their own, which is what makes reconciliation stable.
              // Retired full-assembly wording in a source alt is dropped rather than
              // copied onto a half assembly's customer-visible alt text.
              alt: `${entry.model} Premium Plus — image ${index + 1} of ${all.length}, ${SHARED_MEDIA_MARKER} (${source.handle}).${node.image?.altText?.trim() && !RETIRED_LABEL_PATTERN.test(node.image.altText) ? ` ${node.image.altText.trim()}` : ""}`,
              url: node.image!.url,
            })),
      tags,
      title,
    });
  }
  return { plans, skipped };
}

// ------------------------------------------------------------------- Coils

interface CoilPlan {
  descriptionHtml: string;
  existingId: string | null;
  grade: string;
  mediaStatus: string;
  model: string;
  slug: string;
  tags: string[];
  titleCorrection: string | null;
  title: string;
}

function coilDescription(model: string, grade: string) {
  return `<section data-bgp-product-information="1"><p>${escapeHtml(model)} standalone wireless charging coil, listed as ${escapeHtml(grade)}, for mobile-device repair professionals. This is a separate replacement part. It is not a back glass, not a half assembly and not a full assembly.</p><h2>Draft review status</h2><ul><li>Draft for Michael's review. Not published, not for sale.</li><li>The recorded model mapping is ${escapeHtml(model)}. A matching model name alone does not establish verified fitment; compatibility requires Michael's verification.</li><li>OEM and Aftermarket are catalog grade labels awaiting a written definition. They do not establish Apple origin, Apple certification, or MagSafe certification.</li><li>No approved selling price, SKU, starting inventory, included-component list or approved model-specific product media.</li></ul></section>`;
}

function planCoils(products: ProductNode[]): CoilPlan[] {
  const existing = products.filter((product) => product.productType === COIL_TYPE);
  return coilCatalog.models.flatMap((model) =>
    coilCatalog.grades.map((grade) => {
      const title = `${model.model} Wireless Charging Coil - ${grade}`;
      const slugTag = model.slug;
      const gradeTag = grade.toLowerCase();
      // Match on the canonical model + grade tags rather than the title, so a
      // malformed title still resolves to its intended draft instead of duplicating.
      const match =
        existing.find((product) => product.title === title) ??
        existing.find(
          (product) => product.tags.includes(slugTag) && product.tags.includes(gradeTag),
        ) ??
        null;
      return {
        descriptionHtml: coilDescription(model.model, grade),
        existingId: match?.id ?? null,
        grade,
        mediaStatus: model.mediaStatus,
        model: model.model,
        slug: model.slug,
        tags: [
          "wireless charging coil",
          gradeTag,
          model.slug,
          "commercial-data-blocked",
          "owner-review-pending",
          ...(model.mediaStatus === "APPROVED" ? [] : ["media-blocked"]),
        ],
        title,
        titleCorrection: match && match.title !== title ? match.title : null,
      };
    }),
  );
}

/**
 * Shopify's productCreate only materialises the first option combination, so the
 * remaining colours are added here. Re-running converges instead of duplicating.
 */
async function reconcileVariants(product: ProductNode, colors: string[]) {
  const present = new Set(product.variants.nodes.map((variant) => variant.title));
  const missing = colors.filter((color) => !present.has(color));
  if (missing.length === 0) return 0;
  const result = await client.query<{
    productVariantsBulkCreate: {
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(VARIANTS_BULK_CREATE_MUTATION, {
    productId: product.id,
    variants: missing.map((color) => ({
      optionValues: [{ name: color, optionName: "Color" }],
      price: NO_APPROVED_PRICE,
    })),
  });
  throwUserErrors(
    `Add variants to ${product.title}`,
    result.productVariantsBulkCreate.userErrors,
  );
  return missing.length;
}

/**
 * Reconciles the inherited Premium image set. Shopify renames copied files, so
 * identity is the deterministic alt text this script writes, not the file name.
 * Any duplicate this script previously added is removed before gaps are filled.
 */
async function reconcileMedia(
  product: ProductNode,
  sourceMedia: Array<{ alt: string; url: string }>,
) {
  if (sourceMedia.length === 0) return { added: 0, removed: 0 };
  const wanted = new Set(sourceMedia.map((image) => image.alt));
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const node of product.media.nodes) {
    const alt = node.image?.altText ?? "";
    if (!node.id || !SHARED_MEDIA_PATTERN.test(alt)) continue;
    // Stale alt formats and repeats are both removed, so a re-run converges
    // on exactly one copy of each intended Premium image.
    if (!wanted.has(alt) || seen.has(alt)) duplicates.push(node.id);
    else seen.add(alt);
  }
  if (duplicates.length) {
    const removal = await client.query<{
      productDeleteMedia: {
        mediaUserErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(DELETE_MEDIA_MUTATION, { mediaIds: duplicates, productId: product.id });
    throwUserErrors(
      `Remove duplicate media from ${product.title}`,
      removal.productDeleteMedia.mediaUserErrors,
    );
  }
  const missing = sourceMedia.filter((image) => !seen.has(image.alt));
  if (missing.length) {
    const result = await client.query<{
      productCreateMedia: {
        mediaUserErrors: Array<{ field: string[] | null; message: string }>;
      };
    }>(CREATE_MEDIA_MUTATION, {
      media: missing.map((image) => ({
        alt: image.alt,
        mediaContentType: "IMAGE",
        originalSource: image.url,
      })),
      productId: product.id,
    });
    throwUserErrors(
      `Add media to ${product.title}`,
      result.productCreateMedia.mediaUserErrors,
    );
  }
  return { added: missing.length, removed: duplicates.length };
}

// -------------------------------------------------------------------- Run

const before = await inventory();
const { plans: premiumPlusPlans, skipped } = planPremiumPlus(before);
const coilPlans = premiumPlusOnly ? [] : planCoils(before);
const beforeById = new Map(before.map((product) => [product.id, product]));

const premiumPlusExisting = new Map(
  before
    .filter((product) => product.title.endsWith("- Premium Plus"))
    .map((product) => [product.title, product]),
);
const premiumPlusCreates = premiumPlusPlans.filter((plan) => !premiumPlusExisting.has(plan.title));
const premiumPlusUpdates = premiumPlusPlans.filter((plan) => premiumPlusExisting.has(plan.title));
const coilCreates = coilPlans.filter((plan) => !plan.existingId);
const coilUpdates = coilPlans.filter((plan) => plan.existingId);

const plan = {
  authorizedScope: premiumPlusOnly
    ? ["Premium Plus back-glass DRAFT products"]
    : ["Premium Plus back-glass DRAFT products", "Wireless Charging Coil DRAFT products"],
  capturedAt: new Date().toISOString(),
  mode: apply ? "APPLY" : "DRY_RUN",
  premiumPlus: {
    creates: premiumPlusCreates.length,
    plans: premiumPlusPlans.map((entry) => ({
      colors: entry.colors,
      draftHandle: entry.handle,
      draftTitle: entry.title,
      imageSource: entry.mediaBlockedReason ? "BLOCKED" : `${entry.sourceHandle} (${entry.sourceMedia.length} images)`,
      mediaBlockedReason: entry.mediaBlockedReason,
      model: entry.model,
      priceStatus: "NO_APPROVED_PRICE — 0.00 marker, no SKU",
      sourcePremiumId: entry.sourceId,
      sourcePremiumHandle: entry.sourceHandle,
      variants: entry.colors.length,
    })),
    skipped,
    updates: premiumPlusUpdates.length,
  },
  coils: {
    creates: coilCreates.length,
    models: [...new Set(coilPlans.map((entry) => entry.model))].length,
    titleCorrections: coilPlans
      .filter((entry) => entry.titleCorrection)
      .map((entry) => ({ from: entry.titleCorrection, to: entry.title })),
    total: coilPlans.length,
    updates: coilUpdates.length,
  },
  productsPublished: 0,
  inventoryMutations: 0,
};

console.log(JSON.stringify(plan, null, 2));

if (!apply) {
  console.log("\nDRY RUN: no Shopify changes made.");
  process.exit(0);
}

if (
  !confirmed ||
  expected("--expect-premium-plus") !== premiumPlusPlans.length ||
  expected("--expect-coil-updates") !== coilUpdates.length ||
  expected("--expect-coil-creates") !== coilCreates.length
) {
  throw new Error(
    `Apply requires --confirm-shopify-draft-review --expect-premium-plus=${premiumPlusPlans.length} --expect-coil-creates=${coilCreates.length} --expect-coil-updates=${coilUpdates.length}.`,
  );
}

const backupDirectory = resolve("backups/review-drafts");
const backupPath = resolve(
  backupDirectory,
  `before-review-drafts-${plan.capturedAt.replaceAll(":", "-")}.json`,
);
await mkdir(backupDirectory, { recursive: true });
await writeFile(
  backupPath,
  `${JSON.stringify(
    {
      capturedAt: plan.capturedAt,
      coilProductsBefore: before.filter((product) => product.productType === COIL_TYPE),
      plan,
      premiumSourcesBefore: premiumPlusPlans.map((entry) => beforeById.get(entry.sourceId)),
    },
    null,
    2,
  )}\n`,
  { encoding: "utf8", flag: "wx" },
);

const results: Array<Record<string, unknown>> = [];

for (const entry of premiumPlusPlans) {
  const existing = premiumPlusExisting.get(entry.title);
  if (existing) {
    // Only ever update a product this script itself owns: DRAFT and Premium Plus.
    assertSafeDraft(existing, BACK_GLASS_TYPE);
    const result = await client.query<{
      productUpdate: { product: ProductNode | null; userErrors: Array<{ field: string[] | null; message: string }> };
    }>(PRODUCT_UPDATE_MUTATION, {
      product: {
        descriptionHtml: entry.descriptionHtml,
        id: existing.id,
        tags: entry.tags,
      },
    });
    throwUserErrors(`Update ${entry.title}`, result.productUpdate.userErrors);
    const product = result.productUpdate.product!;
    assertSafeDraft(product, BACK_GLASS_TYPE);
    const addedVariants = await reconcileVariants(product, entry.colors);
    const media = await reconcileMedia(product, entry.sourceMedia);
    results.push({
      action: "updated",
      addedVariants,
      media,
      id: product.id,
      title: product.title,
    });
    console.log(
      `UPDATED\t${entry.title}\t+${addedVariants} variants\t+${media.added}/-${media.removed} images`,
    );
    continue;
  }

  const result = await client.query<{
    productCreate: { product: ProductNode | null; userErrors: Array<{ field: string[] | null; message: string }> };
  }>(PRODUCT_CREATE_MUTATION, {
    media: entry.sourceMedia.map((image) => ({
      alt: image.alt,
      mediaContentType: "IMAGE",
      originalSource: image.url,
    })),
    product: {
      descriptionHtml: entry.descriptionHtml,
      handle: entry.handle,
      productOptions: [{ name: "Color", values: entry.colors.map((name) => ({ name })) }],
      productType: BACK_GLASS_TYPE,
      status: "DRAFT",
      tags: entry.tags,
      title: entry.title,
      vendor: VENDOR,
    },
  });
  throwUserErrors(`Create ${entry.title}`, result.productCreate.userErrors);
  const product = result.productCreate.product!;
  assertSafeDraft(product, BACK_GLASS_TYPE);
  const addedVariants = await reconcileVariants(product, entry.colors);
  results.push({
    action: "created",
    addedVariants,
    id: product.id,
    title: product.title,
  });
  console.log(`CREATED\t${entry.title}\t+${addedVariants} variants`);
}

for (const entry of coilPlans) {
  if (!entry.existingId) {
    throw new Error(
      `${entry.title} has no existing draft. Coil creation belongs to scripts/shopify-create-coil-drafts.ts.`,
    );
  }
  const existing = beforeById.get(entry.existingId)!;
  assertSafeDraft(existing, COIL_TYPE);
  const result = await client.query<{
    productUpdate: { product: ProductNode | null; userErrors: Array<{ field: string[] | null; message: string }> };
  }>(PRODUCT_UPDATE_MUTATION, {
    product: {
      descriptionHtml: entry.descriptionHtml,
      id: entry.existingId,
      tags: entry.tags,
      ...(entry.titleCorrection ? { title: entry.title } : {}),
    },
  });
  throwUserErrors(`Update ${entry.title}`, result.productUpdate.userErrors);
  const product = result.productUpdate.product!;
  assertSafeDraft(product, COIL_TYPE);
  results.push({ action: "updated", id: product.id, title: product.title });
  console.log(`UPDATED\t${entry.title}`);
}

const after = await inventory();
const afterByTitle = new Map(after.map((product) => [product.title, product]));
for (const entry of premiumPlusPlans) {
  const product = afterByTitle.get(entry.title);
  if (!product) throw new Error(`Verification missing ${entry.title}.`);
  assertSafeDraft(product, BACK_GLASS_TYPE);
  if (product.variants.nodes.length !== entry.colors.length) {
    throw new Error(
      `${entry.title}: expected ${entry.colors.length} colour variants, found ${product.variants.nodes.length}.`,
    );
  }
  const expectedMedia = entry.mediaBlockedReason ? 0 : entry.sourceMedia.length;
  if (product.mediaCount.count !== expectedMedia) {
    throw new Error(
      `${entry.title}: expected ${expectedMedia} images, found ${product.mediaCount.count}.`,
    );
  }
}
for (const entry of coilPlans) {
  const product = afterByTitle.get(entry.title);
  if (!product) throw new Error(`Verification missing ${entry.title}.`);
  assertSafeDraft(product, COIL_TYPE);
}

const verificationPath = resolve(
  backupDirectory,
  `after-review-drafts-${plan.capturedAt.replaceAll(":", "-")}.json`,
);
await writeFile(
  verificationPath,
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      coilDrafts: after.filter((product) => product.productType === COIL_TYPE),
      premiumPlusDrafts: after.filter((product) => product.title.endsWith("- Premium Plus")),
      results,
    },
    null,
    2,
  )}\n`,
  { encoding: "utf8", flag: "wx" },
);

console.log(
  `\nAPPLIED AND VERIFIED\tpremiumPlus=${premiumPlusPlans.length}\tcoils=${coilPlans.length}\tbackup=${backupPath}\tverification=${verificationPath}`,
);
