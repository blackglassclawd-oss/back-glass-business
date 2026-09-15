/**
 * Guarded two-product release engine for the base iPhone 17 back glass.
 *
 * Shopify has no multi-product transaction. This is a guarded release with a
 * compensating rollback on detected or runtime failures, not an atomic one:
 *
 *  1. Preflight: every target must match its verified baseline exactly —
 *     identity, colour order, variant IDs, the Color each variant ID reports in
 *     selectedOptions, SKUs, approved price, inventory state, product media IDs,
 *     the approved image on each colour variant, required collections, no
 *     forbidden collection, DRAFT and unpublished — and canonical iPhone 17e
 *     must be bound to its product ID. Every gating connection is read to
 *     completion or the read fails.
 *  2. The caller captures a backup, then everything is re-read immediately
 *     before the first write, so a slow backup cannot bless stale state.
 *  3. Channels are granted to BOTH targets while they are still DRAFT.
 *     ProductStatus.DRAFT is documented as "unavailable to customers on sales
 *     channels and apps", so a grant alone exposes nothing.
 *  4. Both staged targets are re-verified, then activated back to back. No read
 *     sits between the two activations: it could not make the second write
 *     safer and would only lengthen the window where one product is live alone.
 *  5. Final state and every other iPhone 17-family record are verified.
 *  6. Any error or failed verification triggers compensation from fresh state:
 *     restore the captured status first (hide), then withdraw only the channel
 *     grants this run introduced. Rollback is reported clean only if both
 *     targets again match their full pre-release state AND every other
 *     iPhone 17-family record matches its pre-release fingerprint. Collateral
 *     records are never mutated; any remaining difference is reported as
 *     PARTIAL_RELEASE_MANUAL_RECOVERY.
 *
 * Limitation: compensation runs inside this process. An abrupt termination
 * (killed process, crash, lost machine) between writes cannot be compensated
 * and can leave one target staged or active. The next preflight recognises that
 * shape and reports POSSIBLE PARTIAL RELEASE — MANUAL RECONCILIATION REQUIRED;
 * it never mutates anything on startup.
 */
import { createHash } from "node:crypto";

export interface AdminClient {
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export interface BaselineVariant {
  color: string;
  inventoryPolicy: string;
  inventoryQuantity: number | null;
  inventoryTracked: boolean;
  mediaId: string;
  price: string;
  sku: string;
  variantId: string;
}

export interface ReleaseTargetBaseline {
  approvedSellingPrice: string;
  colors: string[];
  forbiddenCollections: string[];
  handle: string;
  mediaIds: string[];
  preReleasePublications: string[];
  preReleaseStatus: "DRAFT";
  productId: string;
  productType: string;
  requiredCollections: string[];
  title: string;
  variants: BaselineVariant[];
}

export interface Canonical17eBaseline {
  handle: string;
  productId: string;
  productType: string;
  status: "DRAFT";
  title: string;
}

export interface ReleaseBaseline {
  canonical17e: Canonical17eBaseline;
  releaseChannels: string[];
  targets: ReleaseTargetBaseline[];
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface VariantState {
  id: string;
  inventoryPolicy: string;
  inventoryQuantity: number | null;
  inventoryTracked: boolean;
  mediaIds: string[];
  price: string;
  selectedOptions: SelectedOption[];
  sku: string | null;
  title: string;
}

export interface ProductState {
  collections: string[];
  colors: string[];
  handle: string;
  id: string;
  mediaIds: string[];
  productType: string;
  publishedChannels: string[];
  status: string;
  title: string;
  variants: VariantState[];
}

export class IncompleteReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncompleteReadError";
  }
}

/** Loop guard for paginated per-product reads. */
export const MAX_PAGES = 25;

interface PageInfo {
  endCursor?: string | null;
  hasNextPage: boolean;
}
interface Connection<T> {
  nodes: T[];
  pageInfo: PageInfo;
}
type UserErrors = Array<{ field: string[] | null; message: string }>;

const PRODUCT_QUERY = `#graphql
  query Iphone17ReleaseProduct($id: ID!) {
    product(id: $id) {
      id handle title status productType
      options { name values }
      media(first: 50) { pageInfo { hasNextPage } nodes { id } }
      variants(first: 50) {
        pageInfo { hasNextPage }
        nodes {
          id title sku price inventoryPolicy inventoryQuantity
          selectedOptions { name value }
          inventoryItem { tracked }
          media(first: 5) { pageInfo { hasNextPage } nodes { id } }
        }
      }
      resourcePublicationsV2(first: 50, onlyPublished: true) { pageInfo { hasNextPage } nodes { isPublished publication { name } } }
      collections(first: 50) { pageInfo { hasNextPage endCursor } nodes { handle } }
    }
  }
`;

const PRODUCT_COLLECTIONS_QUERY = `#graphql
  query Iphone17ReleaseProductCollections($id: ID!, $after: String) {
    product(id: $id) { collections(first: 50, after: $after) { pageInfo { hasNextPage endCursor } nodes { handle } } }
  }
`;

const CANONICAL_17E_QUERY = `#graphql
  query Iphone17ReleaseCanonical17e($id: ID!, $handle: String!) {
    product(id: $id) {
      id handle title status productType
      resourcePublicationsV2(first: 50, onlyPublished: true) { pageInfo { hasNextPage } nodes { publication { name } } }
    }
    productByIdentifier(identifier: { handle: $handle }) { id }
    products(first: 50, query: "title:*17e*") { pageInfo { hasNextPage } nodes { id handle title productType } }
  }
`;

const CHANNELS_QUERY = `#graphql
  query Iphone17ReleaseChannels { publications(first: 50) { pageInfo { hasNextPage } nodes { id name } } }
`;

/**
 * The family snapshot scans the whole catalog and filters titles locally. A
 * search such as `title:*iPhone 17* OR title:*iPhone Air*` is not a phrase
 * match and silently returned a fraction of the family on 2026-09-15.
 */
const FAMILY_QUERY = `#graphql
  query Iphone17ReleaseFamily($after: String) {
    products(first: 10, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id handle title status productType
        media(first: 20) { pageInfo { hasNextPage } nodes { id } }
        variants(first: 30) { pageInfo { hasNextPage } nodes { id sku price inventoryPolicy inventoryQuantity selectedOptions { name value } inventoryItem { tracked } } }
        resourcePublicationsV2(first: 10, onlyPublished: true) { pageInfo { hasNextPage } nodes { publication { name } } }
      }
    }
  }
`;

export const FAMILY_TITLE = /iPhone 17|iPhone Air/i;
const FAMILY_MAX_PAGES = 100;

export const PUBLISH_MUTATION = `#graphql
  mutation Iphone17ReleasePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

export const UNPUBLISH_MUTATION = `#graphql
  mutation Iphone17ReleaseUnpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

export const STATUS_MUTATION = `#graphql
  mutation Iphone17ReleaseSetStatus($product: ProductUpdateInput!) {
    productUpdate(product: $product) { product { id status } userErrors { field message } }
  }
`;

const same = (left: string[], right: string[]) => left.length === right.length && left.every((value, index) => value === right[index]);
const sorted = (values: string[]) => [...values].sort();
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function assertComplete(pageInfo: PageInfo, what: string) {
  if (pageInfo.hasNextPage) throw new IncompleteReadError(`${what} is truncated; a partial read cannot certify release state.`);
}

// ------------------------------------------------------------------ Reads

interface RawVariant {
  id: string;
  inventoryItem: { tracked: boolean };
  inventoryPolicy: string;
  inventoryQuantity: number | null;
  media: Connection<{ id: string }>;
  price: string;
  selectedOptions: SelectedOption[];
  sku: string | null;
  title: string;
}
interface RawProduct {
  collections: Connection<{ handle: string }>;
  handle: string;
  id: string;
  media: Connection<{ id: string }>;
  options: Array<{ name: string; values: string[] }>;
  productType: string;
  resourcePublicationsV2: Connection<{ isPublished: boolean; publication: { name: string } }>;
  status: string;
  title: string;
  variants: Connection<RawVariant>;
}

export async function readProductState(client: AdminClient, productId: string): Promise<ProductState | null> {
  const { product } = await client.query<{ product: RawProduct | null }>(PRODUCT_QUERY, { id: productId });
  if (!product) return null;
  assertComplete(product.variants.pageInfo, `${productId} variants`);
  assertComplete(product.media.pageInfo, `${productId} media`);
  assertComplete(product.resourcePublicationsV2.pageInfo, `${productId} publications`);
  for (const variant of product.variants.nodes) assertComplete(variant.media.pageInfo, `${variant.id} media`);

  const collections = product.collections.nodes.map((node) => node.handle);
  let pageInfo = product.collections.pageInfo;
  for (let pages = 1; pageInfo.hasNextPage; pages += 1) {
    if (pages >= MAX_PAGES) throw new IncompleteReadError(`${productId} collections exceed ${MAX_PAGES} pages.`);
    const next = await client.query<{ product: { collections: Connection<{ handle: string }> } | null }>(
      PRODUCT_COLLECTIONS_QUERY,
      { after: pageInfo.endCursor, id: productId },
    );
    if (!next.product) throw new IncompleteReadError(`${productId} disappeared while its collections were being read.`);
    collections.push(...next.product.collections.nodes.map((node) => node.handle));
    pageInfo = next.product.collections.pageInfo;
  }

  return {
    collections,
    colors: product.options.find((option) => option.name === "Color")?.values ?? [],
    handle: product.handle,
    id: product.id,
    mediaIds: product.media.nodes.map((node) => node.id),
    productType: product.productType,
    publishedChannels: sorted(product.resourcePublicationsV2.nodes.filter((node) => node.isPublished).map((node) => node.publication.name)),
    status: product.status,
    title: product.title,
    variants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      inventoryPolicy: variant.inventoryPolicy,
      inventoryQuantity: variant.inventoryQuantity,
      inventoryTracked: variant.inventoryItem.tracked,
      mediaIds: variant.media.nodes.map((node) => node.id),
      price: variant.price,
      selectedOptions: variant.selectedOptions.map(({ name, value }) => ({ name, value })),
      sku: variant.sku,
      title: variant.title,
    })),
  };
}

export async function loadChannels(client: AdminClient, names: string[]) {
  const { publications } = await client.query<{ publications: Connection<{ id: string; name: string }> }>(CHANNELS_QUERY);
  assertComplete(publications.pageInfo, "Sales channel list");
  const ids = new Map<string, string>();
  for (const name of names) {
    const matches = publications.nodes.filter((node) => node.name === name);
    if (matches.length !== 1) throw new Error(`Sales channel "${name}" resolved to ${matches.length} publications.`);
    ids.set(name, matches[0].id);
  }
  return ids;
}

export interface FamilyRecord {
  fingerprint: string;
  id: string;
  productType: string;
  title: string;
}

interface RawFamilyProduct {
  handle: string;
  id: string;
  media: Connection<{ id: string }>;
  productType: string;
  resourcePublicationsV2: Connection<{ publication: { name: string } }>;
  status: string;
  title: string;
  variants: Connection<{
    id: string;
    inventoryItem: { tracked: boolean };
    inventoryPolicy: string;
    inventoryQuantity: number | null;
    price: string;
    selectedOptions: SelectedOption[];
    sku: string | null;
  }>;
}

/** Compact per-product hashes of the release-sensitive fields of every iPhone 17-family record, coils included. */
export async function familyFingerprints(client: AdminClient) {
  const records = new Map<string, FamilyRecord>();
  let after: string | null | undefined = null;
  for (let pages = 0; ; pages += 1) {
    if (pages >= FAMILY_MAX_PAGES) throw new IncompleteReadError(`Catalog scan exceeds ${FAMILY_MAX_PAGES} pages.`);
    const { products }: { products: Connection<RawFamilyProduct> } = await client.query(FAMILY_QUERY, { after });
    for (const product of products.nodes) {
      if (!FAMILY_TITLE.test(product.title)) continue;
      assertComplete(product.media.pageInfo, `${product.id} media`);
      assertComplete(product.variants.pageInfo, `${product.id} variants`);
      assertComplete(product.resourcePublicationsV2.pageInfo, `${product.id} publications`);
      const safeFields = {
        handle: product.handle,
        mediaIds: sorted(product.media.nodes.map((node) => node.id)),
        productType: product.productType,
        publications: sorted(product.resourcePublicationsV2.nodes.map((node) => node.publication.name)),
        status: product.status,
        title: product.title,
        variants: [...product.variants.nodes]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((variant) => [
            variant.id, variant.sku, variant.price, variant.inventoryPolicy, variant.inventoryQuantity, variant.inventoryItem.tracked,
            variant.selectedOptions.map((option) => `${option.name}=${option.value}`),
          ]),
      };
      records.set(product.id, {
        fingerprint: createHash("sha256").update(JSON.stringify(safeFields)).digest("hex"),
        id: product.id,
        productType: product.productType,
        title: product.title,
      });
    }
    if (!products.pageInfo.hasNextPage) break;
    after = products.pageInfo.endCursor;
  }
  return records;
}

export function collateralChanges(before: Map<string, FamilyRecord>, after: Map<string, FamilyRecord>, excluded: Set<string>) {
  const changes: string[] = [];
  for (const record of before.values()) {
    if (excluded.has(record.id)) continue;
    const now = after.get(record.id);
    if (!now) changes.push(`Collateral change: ${record.title} (${record.id}) is missing after the release.`);
    else if (now.fingerprint !== record.fingerprint) changes.push(`Collateral change: ${record.title} (${record.id}) changed during the release.`);
  }
  for (const record of after.values()) {
    if (!before.has(record.id) && !excluded.has(record.id)) changes.push(`Collateral change: ${record.title} (${record.id}) appeared during the release.`);
  }
  return changes;
}

// ------------------------------------------------------------------ Invariants

export type ReleasePhase = "PRE_RELEASE" | "STAGED" | "RELEASED";
type Check = (state: ProductState, target: ReleaseTargetBaseline, phase: ReleasePhase, channels: string[]) => string[];

/** Named invariant checks; the dry run reports each by name. */
export const TARGET_CHECKS: Array<[string, Check]> = [
  ["identity", (state, target) => [
    ...(state.id !== target.productId ? [`Product ID is ${state.id}, expected ${target.productId}.`] : []),
    ...(state.handle !== target.handle ? [`Handle is "${state.handle}", expected "${target.handle}".`] : []),
    ...(state.title !== target.title ? [`Title is "${state.title}", expected "${target.title}".`] : []),
    ...(state.productType !== target.productType ? [`Product type is "${state.productType}", expected "${target.productType}".`] : []),
  ]],
  ["colors", (state, target) =>
    same(state.colors, target.colors) ? [] : [`Colors are [${state.colors.join(", ")}], expected [${target.colors.join(", ")}] in that order.`]],
  ["variantIdentity", (state, target) => {
    const actual = sorted(state.variants.map((variant) => variant.id));
    const expected = sorted(target.variants.map((variant) => variant.variantId));
    return same(actual, expected) ? [] : [`Variant IDs [${actual.join(", ")}] differ from the verified [${expected.join(", ")}].`];
  }],
  // selectedOptions is authoritative: variant title, array position and product option order are not.
  // Non-Color options are ignored so an added option cannot hide or fake the Color mapping.
  ["variantColorMapping", (state, target) => {
    const blockers: string[] = [];
    const claimedBy = new Map<string, string[]>();
    for (const expected of target.variants) {
      const actual = state.variants.find((variant) => variant.id === expected.variantId);
      if (!actual) continue;
      const colorOptions = actual.selectedOptions.filter((option) => option.name === "Color");
      if (colorOptions.length !== 1) {
        blockers.push(`${expected.color}: variant ${expected.variantId} has ${colorOptions.length} Color options in selectedOptions, expected exactly 1.`);
        continue;
      }
      const color = colorOptions[0].value;
      if (!target.colors.includes(color)) blockers.push(`${expected.color}: variant ${expected.variantId} reports unexpected Color=${color}.`);
      else if (color !== expected.color) blockers.push(`${expected.color}: variant ${expected.variantId} reports Color=${color}, verified ${expected.color}.`);
      claimedBy.set(color, [...(claimedBy.get(color) ?? []), expected.variantId]);
    }
    for (const [color, variantIds] of claimedBy) {
      if (variantIds.length > 1) blockers.push(`Color=${color} is reported by ${variantIds.length} variants: ${variantIds.join(", ")}.`);
    }
    return blockers;
  }],
  ["exactSkus", (state, target) => target.variants.flatMap((expected) => {
    const actual = state.variants.find((variant) => variant.id === expected.variantId);
    return actual && actual.sku !== expected.sku ? [`${expected.color}: SKU is "${actual.sku ?? ""}", expected exactly "${expected.sku}".`] : [];
  })],
  ["approvedPrices", (state, target) => target.variants.flatMap((expected) => {
    const actual = state.variants.find((variant) => variant.id === expected.variantId);
    return actual && (actual.price !== target.approvedSellingPrice || expected.price !== target.approvedSellingPrice)
      ? [`${expected.color}: price is $${actual.price}, approved price is $${target.approvedSellingPrice}.`]
      : [];
  })],
  ["inventoryState", (state, target) => target.variants.flatMap((expected) => {
    const actual = state.variants.find((variant) => variant.id === expected.variantId);
    if (!actual) return [];
    return [
      ...(actual.inventoryTracked !== expected.inventoryTracked ? [`${expected.color}: inventory tracked is ${actual.inventoryTracked}, verified ${expected.inventoryTracked}.`] : []),
      ...(actual.inventoryPolicy !== expected.inventoryPolicy ? [`${expected.color}: inventory policy is ${actual.inventoryPolicy}, verified ${expected.inventoryPolicy}.`] : []),
      ...(actual.inventoryQuantity !== expected.inventoryQuantity ? [`${expected.color}: inventory quantity is ${actual.inventoryQuantity}, verified ${expected.inventoryQuantity}.`] : []),
    ];
  })],
  ["mediaIdentity", (state, target) => {
    const actual = sorted(state.mediaIds);
    const expected = sorted(target.mediaIds);
    return same(actual, expected) ? [] : [`Product media [${actual.join(", ")}] differ from the approved media [${expected.join(", ")}].`];
  }],
  ["variantImageAssignment", (state, target) => target.variants.flatMap((expected) => {
    const actual = state.variants.find((variant) => variant.id === expected.variantId);
    return actual && !same(actual.mediaIds, [expected.mediaId])
      ? [`${expected.color}: assigned image [${actual.mediaIds.join(", ")}] is not the approved ${expected.color} image ${expected.mediaId}.`]
      : [];
  })],
  ["requiredCollections", (state, target) =>
    target.requiredCollections.filter((handle) => !state.collections.includes(handle)).map((handle) => `Not in ${handle}.`)],
  ["forbiddenCollections", (state, target) =>
    target.forbiddenCollections.filter((handle) => state.collections.includes(handle)).map((handle) => `Still a member of ${handle} (forbidden collection membership).`)],
  ["statusAndChannels", (state, target, phase, channels) => {
    const expectedStatus = phase === "RELEASED" ? "ACTIVE" : target.preReleaseStatus;
    const expectedChannels = phase === "PRE_RELEASE" ? sorted(target.preReleasePublications) : stagedChannels(target, channels);
    return [
      ...(state.status !== expectedStatus ? [`Status is ${state.status}, expected ${expectedStatus}.`] : []),
      ...(!same(state.publishedChannels, expectedChannels)
        ? [`Published to [${state.publishedChannels.join(", ")}], expected [${expectedChannels.join(", ")}].`]
        : []),
    ];
  }],
];

const stagedChannels = (target: ReleaseTargetBaseline, channels: string[]) =>
  sorted([...new Set([...target.preReleasePublications, ...channels])]);

export function targetBlockers(state: ProductState | null, target: ReleaseTargetBaseline, phase: ReleasePhase, channels: string[]) {
  if (!state) return [`Product ${target.productId} not found.`];
  return TARGET_CHECKS.flatMap(([, check]) => check(state, target, phase, channels));
}

export function invariantReport(state: ProductState, target: ReleaseTargetBaseline, channels: string[]) {
  return Object.fromEntries(
    TARGET_CHECKS.map(([name, check]) => [name, check(state, target, "PRE_RELEASE", channels).length ? "FAIL" : "PASS"]),
  );
}

export async function canonical17eBlockers(client: AdminClient, expected: Canonical17eBaseline) {
  const data = await client.query<{
    product: { handle: string; id: string; productType: string; resourcePublicationsV2: Connection<{ publication: { name: string } }>; status: string; title: string } | null;
    productByIdentifier: { id: string } | null;
    products: Connection<{ handle: string; id: string; productType: string; title: string }>;
  }>(CANONICAL_17E_QUERY, { handle: expected.handle, id: expected.productId });
  const blockers: string[] = [];
  const product = data.product;
  if (!product) {
    blockers.push(`Canonical iPhone 17e product ${expected.productId} not found.`);
  } else {
    assertComplete(product.resourcePublicationsV2.pageInfo, `${expected.productId} publications`);
    if (product.handle !== expected.handle) blockers.push(`Canonical iPhone 17e handle is "${product.handle}", expected "${expected.handle}".`);
    if (product.title !== expected.title) blockers.push(`Canonical iPhone 17e title is "${product.title}", expected "${expected.title}".`);
    if (product.productType !== expected.productType) blockers.push(`Canonical iPhone 17e product type is "${product.productType}".`);
    if (product.status !== expected.status) blockers.push(`Canonical iPhone 17e status is ${product.status}, expected ${expected.status}.`);
    const published = product.resourcePublicationsV2.nodes.map((node) => node.publication.name);
    if (published.length) blockers.push(`Canonical iPhone 17e is published to ${published.join(", ")}.`);
  }
  if (data.productByIdentifier?.id !== expected.productId) {
    blockers.push(`Handle ${expected.handle} resolves to ${data.productByIdentifier?.id ?? "no product"}, expected ${expected.productId}.`);
  }
  assertComplete(data.products.pageInfo, "iPhone 17e duplicate search");
  for (const duplicate of data.products.nodes) {
    if (duplicate.id === expected.productId || duplicate.productType !== expected.productType) continue;
    if (duplicate.title === expected.title || duplicate.handle.startsWith(expected.handle)) {
      blockers.push(`Duplicate iPhone 17e back-glass record ${duplicate.id} (${duplicate.handle}).`);
    }
  }
  return blockers;
}

// ------------------------------------------------------------------ Plan

export interface TargetCheck {
  baseline: ReleaseTargetBaseline;
  blockers: string[];
  state: ProductState | null;
}

export type ReleaseState = "PRE_RELEASE" | "RELEASED" | "POSSIBLE_PARTIAL_RELEASE" | "UNKNOWN";

export interface Preflight {
  blockers: string[];
  canonical17e: string[];
  releaseState: ReleaseState;
  targets: TargetCheck[];
}

/**
 * Classifies the targets' status and channel grants together. Anything other
 * than "all untouched" or "all fully released" looks like an interrupted run
 * and is surfaced explicitly. Diagnostic only: nothing is mutated.
 */
export function classifyReleaseState(targets: TargetCheck[], channels: string[]): { lines: string[]; state: ReleaseState } {
  if (targets.some((check) => !check.state)) return { lines: [], state: "UNKNOWN" };
  const phase = ({ baseline: target, state }: TargetCheck) => {
    if (state!.status === target.preReleaseStatus && same(state!.publishedChannels, sorted(target.preReleasePublications))) return "PRE_RELEASE";
    if (state!.status === "ACTIVE" && same(state!.publishedChannels, stagedChannels(target, channels))) return "RELEASED";
    return "OTHER";
  };
  const describe = targets
    .map(({ baseline: target, state }) => `${target.title}: status ${state!.status}, published to [${state!.publishedChannels.join(", ")}]`)
    .join("; ");
  const phases = targets.map(phase);
  if (phases.every((value) => value === "PRE_RELEASE")) return { lines: [], state: "PRE_RELEASE" };
  if (phases.every((value) => value === "RELEASED")) return { lines: [`BASE IPHONE 17 ALREADY RELEASED — ${describe}.`], state: "RELEASED" };
  return { lines: [`POSSIBLE PARTIAL RELEASE — MANUAL RECONCILIATION REQUIRED — ${describe}.`], state: "POSSIBLE_PARTIAL_RELEASE" };
}

export async function preflight(client: AdminClient, baseline: ReleaseBaseline): Promise<Preflight> {
  const targets: TargetCheck[] = [];
  for (const target of baseline.targets) {
    try {
      const state = await readProductState(client, target.productId);
      targets.push({ baseline: target, blockers: targetBlockers(state, target, "PRE_RELEASE", baseline.releaseChannels), state });
    } catch (error) {
      if (!(error instanceof IncompleteReadError)) throw error;
      targets.push({ baseline: target, blockers: [error.message], state: null });
    }
  }
  let canonical17e: string[];
  try {
    canonical17e = await canonical17eBlockers(client, baseline.canonical17e);
  } catch (error) {
    if (!(error instanceof IncompleteReadError)) throw error;
    canonical17e = [error.message];
  }
  const releaseState = classifyReleaseState(targets, baseline.releaseChannels);
  return {
    blockers: [
      ...releaseState.lines,
      ...targets.flatMap((check) => check.blockers.map((blocker) => `${check.baseline.title}: ${blocker}`)),
      ...canonical17e,
    ],
    canonical17e,
    releaseState: releaseState.state,
    targets,
  };
}

/** Publication requires every gate on every target to pass; any blocker anywhere plans no publication. Nothing is ever created. */
export function releaseSummary(checks: Preflight) {
  const publish = checks.blockers.length === 0 ? checks.targets.length : 0;
  return {
    coilMutations: 0,
    collectionMutations: 0,
    create: 0,
    inventoryMutations: 0,
    priceMutations: 0,
    publish,
    publishBlocked: checks.targets.length - publish,
  };
}

/** The release set must be exactly the approval record's publishable set: no blocked, withdrawn, Premium Plus or coil record. */
export function assertReleaseScope(
  baseline: ReleaseBaseline,
  approved: Array<{ approvedSellingPrice: string | null; productId: string; title: string }>,
) {
  const approvedIds = sorted(approved.map((decision) => decision.productId));
  const targetIds = sorted(baseline.targets.map((target) => target.productId));
  if (!same(approvedIds, targetIds)) {
    throw new Error(`Release targets [${targetIds.join(", ")}] differ from the approval record's publishable set [${approvedIds.join(", ")}].`);
  }
  for (const target of baseline.targets) {
    const decision = approved.find((entry) => entry.productId === target.productId)!;
    if (decision.title !== target.title) throw new Error(`${target.productId}: baseline title differs from the approval record.`);
    if (decision.approvedSellingPrice === null || decision.approvedSellingPrice !== target.approvedSellingPrice) {
      throw new Error(`${target.title}: baseline price ${target.approvedSellingPrice} is not the approved price ${decision.approvedSellingPrice}.`);
    }
    if (target.variants.some((variant) => variant.price !== target.approvedSellingPrice)) {
      throw new Error(`${target.title}: a baseline variant price differs from the approved price.`);
    }
    if (target.productType !== "Back Glass" || /coil/i.test(target.title.replace("(No Coil)", "")) || /premium plus/i.test(target.title)) {
      throw new Error(`${target.title}: only back glass may be released here.`);
    }
    if (target.forbiddenCollections.length === 0) throw new Error(`${target.title}: the forbidden-collection gate is missing.`);
  }
  if (baseline.targets.length === 0) throw new Error("No release targets.");
}

// ------------------------------------------------------------------ Execute

export type ReleaseOutcome = "BLOCKED" | "RELEASED" | "ROLLED_BACK" | "PARTIAL_RELEASE_MANUAL_RECOVERY";

export interface MutationRecord {
  detail: string;
  error?: string;
  operation: "productUpdate" | "publishablePublish" | "publishableUnpublish";
  productId: string;
}

export interface ReleaseResult {
  blockers: string[];
  failures: string[];
  mutations: MutationRecord[];
  outcome: ReleaseOutcome;
  recovery: string[];
}

export interface ReleaseOptions {
  baseline: ReleaseBaseline;
  client: AdminClient;
  log?: (line: string) => void;
  /** Runs after the first preflight and before the pre-write revalidation; use it to write the backup. */
  onBeforeWrites?: (capture: { familyBefore: Map<string, FamilyRecord>; preStates: ProductState[] }) => Promise<void> | void;
}

class ReleaseAbort extends Error {}

async function mutate(
  client: AdminClient,
  mutations: MutationRecord[],
  record: MutationRecord,
  query: string,
  variables: Record<string, unknown>,
  userErrorsOf: (data: never) => UserErrors,
) {
  mutations.push(record);
  let data: unknown;
  try {
    data = await client.query(query, variables);
  } catch (error) {
    record.error = messageOf(error);
    throw error;
  }
  const errors = userErrorsOf(data as never);
  if (errors.length) {
    record.error = errors.map((error) => `${error.field?.join(".") ?? "input"}: ${error.message}`).join("; ");
    throw new ReleaseAbort(`${record.operation} ${record.productId}: ${record.error}`);
  }
}

const setStatus = (client: AdminClient, mutations: MutationRecord[], productId: string, status: string, detail: string) =>
  mutate(client, mutations, { detail, operation: "productUpdate", productId }, STATUS_MUTATION, { product: { id: productId, status } },
    (data: { productUpdate: { userErrors: UserErrors } }) => data.productUpdate.userErrors);

const grant = (client: AdminClient, mutations: MutationRecord[], productId: string, names: string[], ids: Map<string, string>, detail: string, unpublish = false) =>
  mutate(
    client,
    mutations,
    { detail, operation: unpublish ? "publishableUnpublish" : "publishablePublish", productId },
    unpublish ? UNPUBLISH_MUTATION : PUBLISH_MUTATION,
    { id: productId, input: names.map((name) => ({ publicationId: ids.get(name) })) },
    (data: { publishablePublish?: { userErrors: UserErrors }; publishableUnpublish?: { userErrors: UserErrors } }) =>
      (unpublish ? data.publishableUnpublish : data.publishablePublish)?.userErrors ?? [],
  );

async function verifyTargets(client: AdminClient, baseline: ReleaseBaseline, phase: ReleasePhase) {
  const failures: string[] = [];
  for (const target of baseline.targets) {
    try {
      const state = await readProductState(client, target.productId);
      failures.push(...targetBlockers(state, target, phase, baseline.releaseChannels).map((failure) => `${target.title} (${target.productId}): ${failure}`));
    } catch (error) {
      failures.push(`${target.title} (${target.productId}): ${messageOf(error)}`);
    }
  }
  return failures;
}

export async function executeRelease(options: ReleaseOptions): Promise<ReleaseResult> {
  const { baseline, client } = options;
  const log = options.log ?? (() => {});
  const mutations: MutationRecord[] = [];
  const channelIds = await loadChannels(client, baseline.releaseChannels);

  const first = await preflight(client, baseline);
  if (first.blockers.length) return { blockers: first.blockers, failures: [], mutations, outcome: "BLOCKED", recovery: [] };
  const familyBefore = await familyFingerprints(client);
  await options.onBeforeWrites?.({ familyBefore, preStates: first.targets.map((check) => check.state!) });

  // Re-read everything immediately before the first write.
  const fresh = await preflight(client, baseline);
  if (fresh.blockers.length) return { blockers: fresh.blockers, failures: [], mutations, outcome: "BLOCKED", recovery: [] };
  const captured = fresh.targets.map((check) => check.state!);
  const targetIds = new Set(baseline.targets.map((target) => target.productId));
  const failures: string[] = [];

  try {
    // Stage 1: grant channels to every target while all are still DRAFT.
    for (const [index, target] of baseline.targets.entries()) {
      const missing = baseline.releaseChannels.filter((name) => !captured[index].publishedChannels.includes(name));
      if (!missing.length) continue;
      await grant(client, mutations, target.productId, missing, channelIds, `grant ${missing.join(", ")} while DRAFT`);
      log(`STAGED\t${target.title}\t${missing.join(", ")}`);
    }
    // Stage 2: both targets must be staged, still DRAFT and otherwise unchanged.
    const staged = await verifyTargets(client, baseline, "STAGED");
    if (staged.length) throw new ReleaseAbort(`Staged verification failed:\n${staged.join("\n")}`);
    // Stage 3: activate back to back.
    for (const target of baseline.targets) {
      await setStatus(client, mutations, target.productId, "ACTIVE", "DRAFT → ACTIVE");
      log(`ACTIVATED\t${target.title}`);
    }
    // Stage 4: final state and collateral.
    const final = await verifyTargets(client, baseline, "RELEASED");
    const collateral = collateralChanges(familyBefore, await familyFingerprints(client), targetIds);
    if (final.length || collateral.length) throw new ReleaseAbort(`Final verification failed:\n${[...final, ...collateral].join("\n")}`);
    return { blockers: [], failures, mutations, outcome: "RELEASED", recovery: [] };
  } catch (error) {
    failures.push(messageOf(error));
    log(`RELEASE FAILED: ${messageOf(error)}\nCompensating toward the captured pre-release state.`);
    const recovery = await compensate(client, baseline, captured, channelIds, mutations, log, familyBefore);
    if (recovery.length) log(`PARTIAL RELEASE — MANUAL RECOVERY REQUIRED\n${recovery.join("\n")}`);
    return { blockers: [], failures, mutations, outcome: recovery.length ? "PARTIAL_RELEASE_MANUAL_RECOVERY" : "ROLLED_BACK", recovery };
  }
}

/**
 * Restores captured status (hide first) and withdraws only grants introduced by
 * this run, on the release targets only. Then verifies, from fresh reads, that
 * both targets match their full pre-release state and that every other
 * iPhone 17-family record matches its pre-release fingerprint. Returns the
 * remaining differences; an empty list is the only clean rollback.
 */
async function compensate(
  client: AdminClient,
  baseline: ReleaseBaseline,
  captured: ProductState[],
  channelIds: Map<string, string>,
  mutations: MutationRecord[],
  log: (line: string) => void,
  familyBefore: Map<string, FamilyRecord>,
) {
  for (const [index, target] of baseline.targets.entries()) {
    const pre = captured[index];
    let current: ProductState | null = null;
    try {
      current = await readProductState(client, target.productId);
    } catch (error) {
      log(`Rollback read failed for ${target.title}: ${messageOf(error)}; applying idempotent rollback writes.`);
    }
    if (!current || current.status !== pre.status) {
      try {
        await setStatus(client, mutations, target.productId, pre.status, `rollback status → ${pre.status}`);
      } catch (error) {
        log(`Rollback status failed for ${target.title}: ${messageOf(error)}`);
      }
    }
    const introduced = baseline.releaseChannels.filter((name) => !pre.publishedChannels.includes(name));
    const withdraw = current ? introduced.filter((name) => current!.publishedChannels.includes(name)) : introduced;
    if (withdraw.length) {
      try {
        await grant(client, mutations, target.productId, withdraw, channelIds, `rollback withdraw ${withdraw.join(", ")}`, true);
      } catch (error) {
        log(`Rollback unpublish failed for ${target.title}: ${messageOf(error)}`);
      }
    }
  }

  // Both targets against their full captured pre-release state (preflight proved captured == baseline).
  const issues = await verifyTargets(client, baseline, "PRE_RELEASE");

  // Collateral is verified, never repaired: the engine may only touch the release targets.
  try {
    const targetIds = new Set(baseline.targets.map((target) => target.productId));
    for (const change of collateralChanges(familyBefore, await familyFingerprints(client), targetIds)) {
      issues.push(`${change} Collateral state differs from the pre-release fingerprint; the release engine does not modify collateral records.`);
    }
  } catch (error) {
    issues.push(`Collateral state could not be verified after rollback: ${messageOf(error)}`);
  }
  return issues;
}
