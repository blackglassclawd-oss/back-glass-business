/**
 * Guarded removal of the two base iPhone 17 release targets from the manual
 * inclusion selections of the Full Assembly and New Arrivals collections.
 *
 * Scope is exactly 2 products × 2 collections = 4 selection removals. The other
 * six manually selected iPhone 17 / Air drafts are a separate catalog decision
 * and are preserved. The mutation carries nothing else: no condition, match
 * type, exclusion, source, title, SEO, sort or publication field.
 *
 * Verified read-only on 2026-09-15: each collection has exactly one
 * CollectionConditionsSource with target type PRODUCTS, not shareable, no app,
 * a single product-title condition, no exclusions, and whole-product selections
 * (variantIds null). Shopify documents `sourcesToUpdate.condition` as an update
 * to a "shareable" conditions source; whether it accepts these non-shareable
 * sources is only knowable at apply time, so any userError stops the run.
 *
 * Collections are cleaned one at a time and each is verified before the next.
 * A collection already cleaned is not restored if a later one fails: re-adding
 * a Full Assembly or New Arrivals selection would reintroduce the misfiling,
 * and any collection left uncleaned still blocks the base iPhone 17 release.
 */
import type { AdminClient, ReleaseBaseline } from "./iphone17-release";

export interface CleanupCollectionSpec {
  collectionId: string;
  condition: { id: string; relation: string; values: string[] };
  handle: string;
  sourceId: string;
}

export interface CleanupSpec {
  collections: CleanupCollectionSpec[];
  productIds: string[];
}

export const BASE_IPHONE17_SELECTION_CLEANUP: CleanupSpec = {
  collections: [
    {
      collectionId: "gid://shopify/Collection/308671381676",
      condition: { id: "gid://shopify/CollectionSourceInclusionConditionProductTitle/3153952940", relation: "CONTAINS", values: ["full assembly"] },
      handle: "full-assembly-with-charging-coil",
      sourceId: "gid://shopify/CollectionConditionsSource/5002068140",
    },
    {
      collectionId: "gid://shopify/Collection/309419933868",
      condition: { id: "gid://shopify/CollectionSourceInclusionConditionProductTitle/3175841964", relation: "CONTAINS", values: ["iPhone 16"] },
      handle: "new-arrivals",
      sourceId: "gid://shopify/CollectionConditionsSource/5043847340",
    },
  ],
  productIds: ["gid://shopify/Product/8675370991788", "gid://shopify/Product/8675371090092"],
};

export interface SelectionState {
  productId: string;
  variantIds: string[] | null;
}

export interface SourceState {
  appId: string | null;
  conditions: Array<{ id: string | null; relation: string | null; typename: string; values: string[] | null }>;
  exclusionConditionCount: number;
  exclusionMatchType: string | null;
  exclusionSelectionCount: number;
  id: string;
  inclusionMatchType: string | null;
  selections: SelectionState[];
  shareable: boolean | null;
  targetType: string | null;
  typename: string;
}

export interface CollectionCleanupState {
  collectionId: string;
  handle: string;
  productsCount: number;
  publications: string[];
  sortOrder: string;
  sources: SourceState[];
  targetMembership: Record<string, boolean>;
  title: string;
}

interface PageInfo {
  endCursor?: string | null;
  hasNextPage: boolean;
}
interface RawSource {
  __typename: string;
  app?: { id: string } | null;
  exclusion?: { conditions: Array<{ __typename: string }>; matchType: string; selections: { nodes: Array<{ product: { id: string } }>; pageInfo: PageInfo } } | null;
  id: string;
  inclusion?: {
    conditions: Array<{ __typename: string; id?: string; relation?: string; values?: string[] }>;
    matchType: string;
    selections: { nodes: Array<{ product: { id: string }; variantIds: string[] | null }>; pageInfo: PageInfo };
  };
  shareable?: boolean;
  targetType?: string;
}
interface RawCollection {
  handle: string;
  id: string;
  productsCount: { count: number };
  resourcePublicationsV2: { nodes: Array<{ isPublished: boolean; publication: { name: string } }>; pageInfo: PageInfo };
  sortOrder: string;
  sources: RawSource[];
  title: string;
}

const COLLECTION_QUERY = `#graphql
  query Iphone17CleanupCollection($id: ID!, $selectionsAfter: String) {
    collection(id: $id) {
      id handle title sortOrder
      productsCount { count }
      resourcePublicationsV2(first: 20, onlyPublished: false) { pageInfo { hasNextPage } nodes { isPublished publication { name } } }
      sources {
        __typename id
        ... on CollectionConditionsSource {
          targetType shareable
          app { id }
          inclusion {
            matchType
            conditions { __typename ... on CollectionSourceInclusionConditionProductTitle { id relation values } }
            selections(first: 100, after: $selectionsAfter) { pageInfo { hasNextPage endCursor } nodes { product { id } variantIds } }
          }
          exclusion {
            matchType
            conditions { __typename }
            selections(first: 10) { pageInfo { hasNextPage } nodes { product { id } } }
          }
        }
      }
    }
  }
`;

const MEMBERSHIP_QUERY = `#graphql
  query Iphone17CleanupMembership($collectionId: ID!, $productIds: [ID!]!) {
    nodes(ids: $productIds) { ... on Product { id inCollection(id: $collectionId) } }
  }
`;

const JOB_QUERY = `#graphql
  query Iphone17CleanupJob($id: ID!) { job(id: $id) { id done } }
`;

export const CLEANUP_MUTATION = `#graphql
  mutation Iphone17CleanupRemoveSelections($collection: CollectionUpdateInput!) {
    collectionUpdate(collection: $collection) { collection { id } job { id done } userErrors { field message } }
  }
`;

const MAX_SELECTION_PAGES = 20;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));
const sortedIds = (selections: SelectionState[]) => selections.map((selection) => selection.productId).sort();

// ------------------------------------------------------------------ Read

export async function readCollectionState(client: AdminClient, spec: CleanupCollectionSpec, productIds: string[]): Promise<CollectionCleanupState> {
  let first: RawCollection | null = null;
  const selections: SelectionState[] = [];
  let after: string | null = null;
  for (let pages = 0; ; pages += 1) {
    if (pages >= MAX_SELECTION_PAGES) throw new Error(`${spec.handle} selections exceed ${MAX_SELECTION_PAGES} pages.`);
    const response = await client.query<{ collection: RawCollection | null }>(COLLECTION_QUERY, { id: spec.collectionId, selectionsAfter: after });
    const collection: RawCollection | null = response.collection;
    if (!collection) throw new Error(`Collection ${spec.collectionId} (${spec.handle}) not found.`);
    if (collection.resourcePublicationsV2.pageInfo.hasNextPage) throw new Error(`${spec.handle} publications are truncated.`);
    first ??= collection;
    // Selections are paginated only for the expected single-source topology; any other topology blocks the plan.
    const inclusion: RawSource["inclusion"] = collection.sources.length === 1 ? collection.sources[0].inclusion : undefined;
    if (!inclusion) break;
    const selectionPage: NonNullable<RawSource["inclusion"]>["selections"] = inclusion.selections;
    selections.push(...selectionPage.nodes.map((node) => ({ productId: node.product.id, variantIds: node.variantIds ?? null })));
    if (!selectionPage.pageInfo.hasNextPage) break;
    after = selectionPage.pageInfo.endCursor ?? null;
  }
  if (!first) throw new Error(`Collection ${spec.collectionId} (${spec.handle}) was not read.`);

  const sources: SourceState[] = first.sources.map((source, index) => ({
    appId: source.app?.id ?? null,
    conditions: (source.inclusion?.conditions ?? []).map((condition) => ({
      id: condition.id ?? null,
      relation: condition.relation ?? null,
      typename: condition.__typename,
      values: condition.values ?? null,
    })),
    exclusionConditionCount: source.exclusion?.conditions.length ?? 0,
    exclusionMatchType: source.exclusion?.matchType ?? null,
    exclusionSelectionCount: (source.exclusion?.selections.nodes.length ?? 0) + (source.exclusion?.selections.pageInfo.hasNextPage ? 1 : 0),
    id: source.id,
    inclusionMatchType: source.inclusion?.matchType ?? null,
    selections: first!.sources.length === 1 && index === 0
      ? selections
      : (source.inclusion?.selections.nodes ?? []).map((node) => ({ productId: node.product.id, variantIds: node.variantIds ?? null })),
    shareable: source.shareable ?? null,
    targetType: source.targetType ?? null,
    typename: source.__typename,
  }));

  const membership = await client.query<{ nodes: Array<{ id: string; inCollection: boolean } | null> }>(
    MEMBERSHIP_QUERY,
    { collectionId: spec.collectionId, productIds },
  );
  const targetMembership: Record<string, boolean> = {};
  for (const productId of productIds) {
    const node = membership.nodes.find((entry) => entry?.id === productId);
    if (!node) throw new Error(`Product ${productId} not found while reading ${spec.handle} membership.`);
    targetMembership[productId] = node.inCollection;
  }

  return {
    collectionId: first.id,
    handle: first.handle,
    productsCount: first.productsCount.count,
    publications: first.resourcePublicationsV2.nodes.map((node) => `${node.publication.name}:${node.isPublished}`).sort(),
    sortOrder: first.sortOrder,
    sources,
    targetMembership,
    title: first.title,
  };
}

// ------------------------------------------------------------------ Plan

export interface CollectionCleanupPlan {
  blockers: string[];
  collectionId: string;
  expectedPostSelections: SelectionState[];
  handle: string;
  predictedProductsCount: number;
  preSelections: SelectionState[];
  productsCountBefore: number;
  selectionsToRemove: Array<{ productId: string }>;
  sourceId: string;
}

export function planCollectionCleanup(state: CollectionCleanupState, spec: CleanupCollectionSpec, productIds: string[]): CollectionCleanupPlan {
  const blockers: string[] = [];
  if (state.collectionId !== spec.collectionId) blockers.push(`Collection ID is ${state.collectionId}, expected ${spec.collectionId}.`);
  if (state.handle !== spec.handle) blockers.push(`Collection handle is "${state.handle}", expected "${spec.handle}".`);
  if (state.sources.length !== 1) blockers.push(`Unexpected source topology: ${state.sources.length} sources, expected exactly 1.`);
  const source = state.sources[0];
  if (source) {
    if (source.typename !== "CollectionConditionsSource") blockers.push(`Unexpected source type ${source.typename}.`);
    if (source.id !== spec.sourceId) blockers.push(`Source ID is ${source.id}, expected ${spec.sourceId}.`);
    if (source.targetType !== "PRODUCTS") blockers.push(`Source target type is ${source.targetType}, expected PRODUCTS.`);
    if (source.shareable !== false) blockers.push(`Source shareable is ${source.shareable}; a shared source may feed other collections.`);
    if (source.appId) blockers.push(`Source is managed by app ${source.appId}.`);
    const condition = source.conditions[0];
    if (source.conditions.length !== 1 || condition.typename !== "CollectionSourceInclusionConditionProductTitle"
      || condition.id !== spec.condition.id || condition.relation !== spec.condition.relation
      || JSON.stringify(condition.values) !== JSON.stringify(spec.condition.values)) {
      blockers.push(`Inclusion conditions ${JSON.stringify(source.conditions)} differ from the verified ${JSON.stringify(spec.condition)}.`);
    }
    if (source.exclusionConditionCount || source.exclusionSelectionCount) {
      blockers.push(`Source has exclusions (${source.exclusionConditionCount} conditions, ${source.exclusionSelectionCount} selections).`);
    }
  }

  const preSelections = source?.selections ?? [];
  const selectionsToRemove: Array<{ productId: string }> = [];
  for (const productId of productIds) {
    const matches = preSelections.filter((selection) => selection.productId === productId);
    if (matches.length === 0) blockers.push(`Target ${productId} is not an explicit selection.`);
    else if (matches.length > 1) blockers.push(`Target ${productId} is selected ${matches.length} times.`);
    else if (matches[0].variantIds !== null) blockers.push(`Target ${productId} is a variant-targeted selection (${matches[0].variantIds.join(", ")}); only whole-product removal is supported.`);
    else selectionsToRemove.push({ productId });
  }

  const removed = new Set(selectionsToRemove.map((selection) => selection.productId));
  return {
    blockers,
    collectionId: spec.collectionId,
    expectedPostSelections: preSelections.filter((selection) => !removed.has(selection.productId)),
    handle: spec.handle,
    // Diagnostic only, never a gate: assumes neither target matches the title condition.
    predictedProductsCount: state.productsCount - productIds.filter((productId) => removed.has(productId) && state.targetMembership[productId]).length,
    preSelections,
    productsCountBefore: state.productsCount,
    selectionsToRemove,
    sourceId: spec.sourceId,
  };
}

export function cleanupMutationInput(plan: CollectionCleanupPlan) {
  return {
    collection: {
      id: plan.collectionId,
      sourcesToUpdate: [{ condition: { id: plan.sourceId, inclusion: { selectionsToRemove: plan.selectionsToRemove.map(({ productId }) => ({ productId })) } } }],
    },
  };
}

/** Fails unless the input is exactly id → sourcesToUpdate[1] → condition{id, inclusion{selectionsToRemove[{productId}]}} for release targets. */
export function assertNarrowCleanupInput(input: unknown, spec: CleanupSpec) {
  const keys = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).sort().join(",") : String(value));
  const fail = (message: string) => { throw new Error(`Cleanup mutation input is not narrow: ${message}`); };
  const root = input as { collection?: { id?: string; sourcesToUpdate?: Array<{ condition?: { id?: string; inclusion?: { selectionsToRemove?: Array<{ productId?: string }> } } }> } };
  if (keys(root) !== "collection") fail(`root keys ${keys(root)}`);
  const collection = root.collection!;
  if (keys(collection) !== "id,sourcesToUpdate") fail(`collection keys ${keys(collection)}`);
  const collectionSpec = spec.collections.find((entry) => entry.collectionId === collection.id);
  if (!collectionSpec) fail(`unknown collection ${collection.id}`);
  if (collection.sourcesToUpdate?.length !== 1) fail(`${collection.sourcesToUpdate?.length} source updates`);
  const update = collection.sourcesToUpdate![0];
  if (keys(update) !== "condition") fail(`source update keys ${keys(update)}`);
  if (keys(update.condition) !== "id,inclusion") fail(`condition keys ${keys(update.condition)}`);
  if (update.condition!.id !== collectionSpec!.sourceId) fail(`source ${update.condition!.id}`);
  if (keys(update.condition!.inclusion) !== "selectionsToRemove") fail(`inclusion keys ${keys(update.condition!.inclusion)}`);
  const removals = update.condition!.inclusion!.selectionsToRemove ?? [];
  if (removals.length === 0 || removals.length > spec.productIds.length) fail(`${removals.length} removals`);
  for (const removal of removals) {
    if (keys(removal) !== "productId") fail(`selection keys ${keys(removal)}`);
    if (!spec.productIds.includes(removal.productId!)) fail(`non-target product ${removal.productId}`);
  }
  if (new Set(removals.map((removal) => removal.productId)).size !== removals.length) fail("duplicate removals");
}

export function assertCleanupScope(spec: CleanupSpec, baseline: ReleaseBaseline) {
  const targetIds = baseline.targets.map((target) => target.productId).sort();
  if (JSON.stringify([...spec.productIds].sort()) !== JSON.stringify(targetIds)) {
    throw new Error(`Cleanup products [${spec.productIds.join(", ")}] differ from the release targets [${targetIds.join(", ")}].`);
  }
  const handles = spec.collections.map((collection) => collection.handle).sort();
  for (const target of baseline.targets) {
    if (JSON.stringify([...target.forbiddenCollections].sort()) !== JSON.stringify(handles)) {
      throw new Error(`Cleanup collections [${handles.join(", ")}] differ from ${target.title}'s forbidden collections.`);
    }
  }
}

export async function planCleanup(client: AdminClient, spec: CleanupSpec) {
  const states: CollectionCleanupState[] = [];
  const plans: CollectionCleanupPlan[] = [];
  for (const collectionSpec of spec.collections) {
    const state = await readCollectionState(client, collectionSpec, spec.productIds);
    states.push(state);
    plans.push(planCollectionCleanup(state, collectionSpec, spec.productIds));
  }
  const blockers = plans.flatMap((plan) => plan.blockers.map((blocker) => `${plan.handle}: ${blocker}`));
  return {
    blockers,
    plans,
    states,
    summary: {
      blocked: blockers.length > 0,
      collections: plans.length,
      conditionMutations: 0,
      exclusionMutations: 0,
      productRemovals: blockers.length ? 0 : plans.reduce((total, plan) => total + plan.selectionsToRemove.length, 0),
      publicationMutations: 0,
    },
  };
}

// ------------------------------------------------------------------ Verify

const MEMBERSHIP_FAILURE = "still an effective member";

export function verifyCollectionCleanup(before: CollectionCleanupState, after: CollectionCleanupState, plan: CollectionCleanupPlan) {
  const failures: string[] = [];
  for (const field of ["collectionId", "handle", "title", "sortOrder"] as const) {
    if (after[field] !== before[field]) failures.push(`${field} changed from "${before[field]}" to "${after[field]}".`);
  }
  if (JSON.stringify(after.publications) !== JSON.stringify(before.publications)) {
    failures.push(`Publications changed from [${before.publications.join(", ")}] to [${after.publications.join(", ")}].`);
  }
  const shape = (source: SourceState) => JSON.stringify({
    appId: source.appId, conditions: source.conditions, exclusionConditionCount: source.exclusionConditionCount,
    exclusionMatchType: source.exclusionMatchType, exclusionSelectionCount: source.exclusionSelectionCount, id: source.id,
    inclusionMatchType: source.inclusionMatchType, shareable: source.shareable, targetType: source.targetType, typename: source.typename,
  });
  if (after.sources.length !== before.sources.length || after.sources.some((source, index) => shape(source) !== shape(before.sources[index]))) {
    failures.push("Source configuration (ID, type, conditions, match type, exclusions or sharing) changed.");
  }
  const actual = after.sources[0]?.selections ?? [];
  const byId = (selections: SelectionState[]) => JSON.stringify([...selections].sort((left, right) => left.productId.localeCompare(right.productId)));
  if (byId(actual) !== byId(plan.expectedPostSelections)) {
    failures.push(`Explicit selections [${sortedIds(actual).join(", ")}] differ from the expected [${sortedIds(plan.expectedPostSelections).join(", ")}].`);
  }
  for (const [productId, member] of Object.entries(after.targetMembership)) {
    if (member) failures.push(`${productId} is ${MEMBERSHIP_FAILURE} of ${after.handle}.`);
  }
  return failures;
}

// ------------------------------------------------------------------ Execute (never run without explicit confirmation)

export type CleanupOutcome = "BLOCKED" | "APPLIED" | "FAILED_STOPPED";

export interface CleanupResult {
  blockers: string[];
  completedCollections: string[];
  failures: string[];
  mutations: Array<{ collectionId: string; removals: string[]; userErrors?: string }>;
  outcome: CleanupOutcome;
}

export interface CleanupOptions {
  client: AdminClient;
  log?: (line: string) => void;
  membershipRetries?: number;
  onBeforeWrites?: (capture: { plans: CollectionCleanupPlan[]; states: CollectionCleanupState[] }) => Promise<void> | void;
  sleep?: (milliseconds: number) => Promise<void>;
  spec: CleanupSpec;
}

export async function executeCleanup(options: CleanupOptions): Promise<CleanupResult> {
  const { client, spec } = options;
  const log = options.log ?? (() => {});
  const sleep = options.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const retries = options.membershipRetries ?? 10;
  const result: CleanupResult = { blockers: [], completedCollections: [], failures: [], mutations: [], outcome: "BLOCKED" };

  const first = await planCleanup(client, spec);
  if (first.blockers.length) return { ...result, blockers: first.blockers };
  await options.onBeforeWrites?.({ plans: first.plans, states: first.states });

  // Re-read immediately before the first write; any change since the backup blocks.
  const fresh = await planCleanup(client, spec);
  if (fresh.blockers.length) return { ...result, blockers: fresh.blockers };
  if (JSON.stringify(fresh.plans) !== JSON.stringify(first.plans)) {
    return { ...result, blockers: ["Collection selections changed between the backup read and the pre-write read."] };
  }

  for (const [index, plan] of fresh.plans.entries()) {
    const input = cleanupMutationInput(plan);
    assertNarrowCleanupInput(input, spec);
    const record: CleanupResult["mutations"][number] = { collectionId: plan.collectionId, removals: plan.selectionsToRemove.map((selection) => selection.productId) };
    result.mutations.push(record);
    let payload: { collectionUpdate: { job: { done: boolean; id: string } | null; userErrors: Array<{ field: string[] | null; message: string }> } };
    try {
      payload = await client.query(CLEANUP_MUTATION, input);
    } catch (error) {
      return { ...result, failures: [`${plan.handle}: collectionUpdate failed: ${messageOf(error)}`], outcome: "FAILED_STOPPED" };
    }
    const { job, userErrors } = payload.collectionUpdate;
    if (userErrors.length) {
      record.userErrors = userErrors.map((error) => `${error.field?.join(".") ?? "input"}: ${error.message}`).join("; ");
      return { ...result, failures: [`${plan.handle}: collectionUpdate rejected: ${record.userErrors}`], outcome: "FAILED_STOPPED" };
    }
    if (job && !job.done) {
      for (let attempt = 0; attempt < retries; attempt += 1) {
        const { job: polled } = await client.query<{ job: { done: boolean } | null }>(JOB_QUERY, { id: job.id });
        if (polled?.done) break;
        await sleep(3000);
      }
    }
    let failures: string[] = [];
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const after = await readCollectionState(client, spec.collections[index], spec.productIds);
      failures = verifyCollectionCleanup(fresh.states[index], after, plan);
      // Effective membership may settle asynchronously; configuration drift never retries.
      if (!failures.length || failures.some((failure) => !failure.includes(MEMBERSHIP_FAILURE)) || attempt === retries) break;
      await sleep(3000);
    }
    if (failures.length) {
      return { ...result, failures: failures.map((failure) => `${plan.handle}: ${failure}`), outcome: "FAILED_STOPPED" };
    }
    result.completedCollections.push(plan.handle);
    log(`CLEANED\t${plan.handle}\tremoved ${record.removals.join(", ")}`);
  }
  return { ...result, outcome: "APPLIED" };
}
