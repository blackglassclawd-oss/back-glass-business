import { describe, expect, it } from "vitest";

import baselineJson from "../../data/catalog/iphone-17-release-baseline-2026-09-15.json";
import {
  BASE_IPHONE17_SELECTION_CLEANUP as SPEC,
  assertCleanupScope,
  assertNarrowCleanupInput,
  cleanupMutationInput,
  executeCleanup,
  planCleanup,
  type SelectionState,
} from "./iphone17-collection-cleanup";
import type { AdminClient, ReleaseBaseline } from "./iphone17-release";

const baseline = baselineJson as unknown as ReleaseBaseline;
const [A_GRADE, PREMIUM] = SPEC.productIds;
const [FULL_ASSEMBLY, NEW_ARRIVALS] = SPEC.collections;
/** The six other retitled iPhone 17 / Air drafts: selected in both collections and out of scope here. */
const OTHER_DRAFTS = [
  "gid://shopify/Product/8675371253932", "gid://shopify/Product/8675371352236", "gid://shopify/Product/8675371516076",
  "gid://shopify/Product/8675371614380", "gid://shopify/Product/8675371188396", "gid://shopify/Product/8675371417772",
];
const SELECTED_IPHONE16 = ["gid://shopify/Product/8100268900524", "gid://shopify/Product/8100269064364", "gid://shopify/Product/8112326246572"];

interface FakeSource {
  appId: string | null;
  conditions: Array<{ id: string; relation: string; typename: string; values: string[] }>;
  exclusionConditions: number;
  exclusionSelections: string[];
  id: string;
  selections: SelectionState[];
  shareable: boolean;
  targetType: string;
  typename: string;
}
interface FakeCollection {
  handle: string;
  id: string;
  publications: Array<{ isPublished: boolean; name: string }>;
  sortOrder: string;
  sources: FakeSource[];
  title: string;
}
type Intercept = (operation: string, variables: Record<string, unknown>, store: FakeCollections) => unknown;

const page = <T>(nodes: T[], hasNextPage = false, endCursor: string | null = null) => ({ nodes, pageInfo: { endCursor, hasNextPage } });
const whole = (productId: string): SelectionState => ({ productId, variantIds: null });
const channels = () => ["Online Store", "Shop", "Point of Sale"].map((name) => ({ isPublished: true, name }));

class FakeCollections implements AdminClient {
  calls: Array<{ operation: string; variables: Record<string, unknown> }> = [];
  collections = new Map<string, FakeCollection>();
  intercept?: Intercept;
  selectionPageSize = 100;
  titles = new Map<string, string>();

  constructor() {
    for (const id of [A_GRADE, PREMIUM, ...OTHER_DRAFTS]) this.titles.set(id, `iPhone 17 Back Glass Half Assembly (No Coil) ${id}`);
    for (let index = 0; index < 20; index += 1) this.titles.set(`gid://shopify/Product/1${index}`, `iPhone 15 Back Glass Full Assembly ${index}`);
    for (let index = 0; index < 22; index += 1) this.titles.set(`gid://shopify/Product/2${index}`, `iPhone 16 Back Glass Half Assembly ${index}`);
    for (const id of SELECTED_IPHONE16) this.titles.set(id, `iPhone 16 Back Glass Half Assembly ${id}`);

    const source = (spec: typeof FULL_ASSEMBLY, selections: SelectionState[]): FakeSource => ({
      appId: null,
      conditions: [{ id: spec.condition.id, relation: spec.condition.relation, typename: "CollectionSourceInclusionConditionProductTitle", values: [...spec.condition.values] }],
      exclusionConditions: 0, exclusionSelections: [], id: spec.sourceId, selections, shareable: false, targetType: "PRODUCTS",
      typename: "CollectionConditionsSource",
    });
    this.collections.set(FULL_ASSEMBLY.collectionId, {
      handle: FULL_ASSEMBLY.handle, id: FULL_ASSEMBLY.collectionId, publications: channels(), sortOrder: "MANUAL", title: "Full Assembly (With Charging Coil)",
      sources: [source(FULL_ASSEMBLY, [A_GRADE, OTHER_DRAFTS[0], PREMIUM, ...OTHER_DRAFTS.slice(1)].map(whole))],
    });
    this.collections.set(NEW_ARRIVALS.collectionId, {
      handle: NEW_ARRIVALS.handle, id: NEW_ARRIVALS.collectionId, publications: channels(), sortOrder: "MANUAL", title: "New Arrivals",
      sources: [source(NEW_ARRIVALS, [...SELECTED_IPHONE16, A_GRADE, PREMIUM, ...OTHER_DRAFTS].map(whole))],
    });
  }

  collection(id: string) {
    return this.collections.get(id)!;
  }

  member(collection: FakeCollection, productId: string) {
    return collection.sources.some((source) =>
      source.selections.some((selection) => selection.productId === productId)
      || source.conditions.every((condition) => (this.titles.get(productId) ?? "").toLowerCase().includes(condition.values[0].toLowerCase())));
  }

  writes() {
    return this.calls.filter((call) => call.operation === "Iphone17CleanupRemoveSelections");
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const operation = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "anonymous";
    this.calls.push({ operation, variables: structuredClone(variables) });
    const intercepted = this.intercept?.(operation, variables, this);
    if (intercepted !== undefined) return intercepted as T;
    switch (operation) {
      case "Iphone17CleanupCollection": {
        const collection = this.collections.get(variables.id as string);
        if (!collection) return { collection: null } as T;
        const start = variables.selectionsAfter ? Number(variables.selectionsAfter) : 0;
        const members = [...this.titles.keys()].filter((productId) => this.member(collection, productId));
        return {
          collection: {
            handle: collection.handle, id: collection.id, productsCount: { count: members.length },
            resourcePublicationsV2: page(collection.publications.map(({ isPublished, name }) => ({ isPublished, publication: { name } }))),
            sortOrder: collection.sortOrder, title: collection.title,
            sources: collection.sources.map((source) => source.typename !== "CollectionConditionsSource" ? { __typename: source.typename, id: source.id } : {
              __typename: source.typename, app: source.appId ? { id: source.appId } : null, id: source.id, shareable: source.shareable, targetType: source.targetType,
              exclusion: {
                conditions: Array.from({ length: source.exclusionConditions }, () => ({ __typename: "CollectionSourceExclusionConditionProductTag" })),
                matchType: "ALL",
                selections: page(source.exclusionSelections.map((id) => ({ product: { id } }))),
              },
              inclusion: {
                conditions: source.conditions.map(({ id, relation, typename, values }) => ({ __typename: typename, id, relation, values })),
                matchType: "ALL",
                selections: page(
                  source.selections.slice(start, start + this.selectionPageSize).map(({ productId, variantIds }) => ({ product: { id: productId }, variantIds })),
                  source.selections.length > start + this.selectionPageSize,
                  String(start + this.selectionPageSize),
                ),
              },
            }),
          },
        } as T;
      }
      case "Iphone17CleanupMembership": {
        const collection = this.collection(variables.collectionId as string);
        return { nodes: (variables.productIds as string[]).map((id) => ({ id, inCollection: this.member(collection, id) })) } as T;
      }
      case "Iphone17CleanupRemoveSelections": {
        const input = variables.collection as ReturnType<typeof cleanupMutationInput>["collection"];
        const collection = this.collection(input.id);
        const update = input.sourcesToUpdate[0].condition;
        const source = collection.sources.find((entry) => entry.id === update.id)!;
        const remove = new Set(update.inclusion.selectionsToRemove.map((selection) => selection.productId));
        source.selections = source.selections.filter((selection) => !remove.has(selection.productId));
        return { collectionUpdate: { collection: { id: collection.id }, job: null, userErrors: [] } } as T;
      }
      default:
        throw new Error(`Unexpected Admin API operation ${operation}`);
    }
  }
}

const apply = (store: FakeCollections, extra: Partial<Parameters<typeof executeCleanup>[0]> = {}) =>
  executeCleanup({ client: store, membershipRetries: 1, sleep: async () => {}, spec: SPEC, ...extra });

describe("base iPhone 17 collection selection cleanup", () => {
  it("targets exactly the release products and their forbidden collections", () => {
    expect(() => assertCleanupScope(SPEC, baseline)).not.toThrow();
    expect(SPEC.productIds).toEqual(baseline.targets.map((target) => target.productId));
    expect(() => assertCleanupScope({ ...SPEC, productIds: [...SPEC.productIds, OTHER_DRAFTS[0]] }, baseline)).toThrow(/differ from the release targets/);
  });

  it("1 & 9. plans exactly four removals: two products in each of two collections, with counts as diagnostics only", async () => {
    const store = new FakeCollections();
    const { blockers, plans, summary } = await planCleanup(store, SPEC);

    expect(blockers).toEqual([]);
    expect(summary).toEqual({ blocked: false, collections: 2, conditionMutations: 0, exclusionMutations: 0, productRemovals: 4, publicationMutations: 0 });
    expect(plans.map((plan) => [plan.collectionId, plan.sourceId, plan.selectionsToRemove])).toEqual([
      [FULL_ASSEMBLY.collectionId, FULL_ASSEMBLY.sourceId, [{ productId: A_GRADE }, { productId: PREMIUM }]],
      [NEW_ARRIVALS.collectionId, NEW_ARRIVALS.sourceId, [{ productId: A_GRADE }, { productId: PREMIUM }]],
    ]);
    expect(plans.map((plan) => [plan.productsCountBefore, plan.predictedProductsCount])).toEqual([[28, 26], [33, 31]]);
    expect(store.writes()).toEqual([]);
  });

  it("6. keeps every unrelated selection, in order and structure, in the expected post-state", async () => {
    const { plans } = await planCleanup(new FakeCollections(), SPEC);

    expect(plans[0].expectedPostSelections).toEqual(OTHER_DRAFTS.map(whole));
    expect(plans[1].expectedPostSelections).toEqual([...SELECTED_IPHONE16, ...OTHER_DRAFTS].map(whole));
    for (const plan of plans) {
      expect(plan.expectedPostSelections).toEqual(plan.preSelections.filter((selection) => !SPEC.productIds.includes(selection.productId)));
    }
  });

  it("sends only id → sourcesToUpdate → condition{id, inclusion{selectionsToRemove}} and rejects anything wider", async () => {
    const { plans } = await planCleanup(new FakeCollections(), SPEC);
    const input = cleanupMutationInput(plans[0]);

    expect(input).toEqual({
      collection: {
        id: FULL_ASSEMBLY.collectionId,
        sourcesToUpdate: [{ condition: { id: FULL_ASSEMBLY.sourceId, inclusion: { selectionsToRemove: [{ productId: A_GRADE }, { productId: PREMIUM }] } } }],
      },
    });
    expect(() => assertNarrowCleanupInput(input, SPEC)).not.toThrow();

    const widen = (mutate: (copy: typeof input) => void) => { const copy = structuredClone(input); mutate(copy); return copy; };
    expect(() => assertNarrowCleanupInput(widen((copy) => { (copy.collection as Record<string, unknown>).title = "x"; }), SPEC)).toThrow(/collection keys/);
    expect(() => assertNarrowCleanupInput(widen((copy) => { (copy.collection.sourcesToUpdate[0].condition.inclusion as Record<string, unknown>).matchType = "ANY"; }), SPEC)).toThrow(/inclusion keys/);
    expect(() => assertNarrowCleanupInput(widen((copy) => { (copy.collection.sourcesToUpdate[0].condition as Record<string, unknown>).exclusion = {}; }), SPEC)).toThrow(/condition keys/);
    expect(() => assertNarrowCleanupInput(widen((copy) => { copy.collection.sourcesToUpdate[0].condition.inclusion.selectionsToRemove.push({ productId: OTHER_DRAFTS[0] }); }), SPEC)).toThrow(/removals|non-target/);
    expect(() => assertNarrowCleanupInput(widen((copy) => { copy.collection.sourcesToUpdate[0].condition.inclusion.selectionsToRemove[0] = { productId: OTHER_DRAFTS[0] }; }), SPEC)).toThrow(/non-target product/);
  });

  it("2. blocks when a target is not an explicit selection", async () => {
    const store = new FakeCollections();
    const source = store.collection(NEW_ARRIVALS.collectionId).sources[0];
    source.selections = source.selections.filter((selection) => selection.productId !== PREMIUM);

    const { blockers, summary } = await planCleanup(store, SPEC);
    expect(blockers).toEqual([`new-arrivals: Target ${PREMIUM} is not an explicit selection.`]);
    expect(summary.productRemovals).toBe(0);
    expect((await apply(store)).outcome).toBe("BLOCKED");
    expect(store.writes()).toEqual([]);
  });

  it("3. blocks a wrong source ID", async () => {
    const store = new FakeCollections();
    store.collection(FULL_ASSEMBLY.collectionId).sources[0].id = "gid://shopify/CollectionConditionsSource/1";

    expect((await planCleanup(store, SPEC)).blockers).toContain(`full-assembly-with-charging-coil: Source ID is gid://shopify/CollectionConditionsSource/1, expected ${FULL_ASSEMBLY.sourceId}.`);
  });

  it.each([
    ["a shareable source", (store: FakeCollections) => { store.collection(FULL_ASSEMBLY.collectionId).sources[0].shareable = true; }, /shared source may feed other collections/],
    ["an app-managed source", (store: FakeCollections) => { store.collection(FULL_ASSEMBLY.collectionId).sources[0].appId = "gid://shopify/App/1"; }, /managed by app/],
    ["a second source", (store: FakeCollections) => {
      store.collection(FULL_ASSEMBLY.collectionId).sources.push({ ...store.collection(FULL_ASSEMBLY.collectionId).sources[0], id: "gid://shopify/CollectionSubCollectionsSource/9", typename: "CollectionSubCollectionsSource" });
    }, /Unexpected source topology: 2 sources/],
    ["a variant-targeted source", (store: FakeCollections) => { store.collection(FULL_ASSEMBLY.collectionId).sources[0].targetType = "VARIANTS"; }, /target type is VARIANTS/],
    ["exclusions", (store: FakeCollections) => { store.collection(FULL_ASSEMBLY.collectionId).sources[0].exclusionSelections = [OTHER_DRAFTS[0]]; }, /Source has exclusions/],
    ["a changed condition", (store: FakeCollections) => { store.collection(FULL_ASSEMBLY.collectionId).sources[0].conditions[0].values = ["assembly"]; }, /Inclusion conditions/],
  ])("4. blocks %s", async (_name, change, message) => {
    const store = new FakeCollections();
    change(store);

    const { blockers } = await planCleanup(store, SPEC);
    expect(blockers.some((blocker) => message.test(blocker))).toBe(true);
    expect((await apply(store)).outcome).toBe("BLOCKED");
    expect(store.writes()).toEqual([]);
  });

  it("5. blocks a variant-targeted selection of a target", async () => {
    const store = new FakeCollections();
    const selection = store.collection(NEW_ARRIVALS.collectionId).sources[0].selections.find((entry) => entry.productId === A_GRADE)!;
    selection.variantIds = ["gid://shopify/ProductVariant/46825690202284"];

    expect((await planCleanup(store, SPEC)).blockers).toEqual([
      `new-arrivals: Target ${A_GRADE} is a variant-targeted selection (gid://shopify/ProductVariant/46825690202284); only whole-product removal is supported.`,
    ]);
  });

  it("reads every selection page before planning", async () => {
    const store = new FakeCollections();
    store.selectionPageSize = 3;

    const { plans } = await planCleanup(store, SPEC);
    expect(plans[1].preSelections).toHaveLength(11);
    expect(plans[1].selectionsToRemove).toHaveLength(2);
  });

  it("applies the four removals on a fake store and verifies targets absent, everything else unchanged", async () => {
    const store = new FakeCollections();
    const result = await apply(store);

    expect(result.outcome).toBe("APPLIED");
    expect(result.completedCollections).toEqual([FULL_ASSEMBLY.handle, NEW_ARRIVALS.handle]);
    expect(store.writes()).toHaveLength(2);
    expect(result.mutations.flatMap((mutation) => mutation.removals)).toHaveLength(4);
    for (const spec of SPEC.collections) {
      const collection = store.collection(spec.collectionId);
      expect(SPEC.productIds.some((productId) => store.member(collection, productId))).toBe(false);
    }
    expect(store.collection(FULL_ASSEMBLY.collectionId).sources[0].selections).toEqual(OTHER_DRAFTS.map(whole));
  });

  it("7. fails verification and stops when the write also changes the condition", async () => {
    const store = new FakeCollections();
    store.intercept = (operation, _variables, fake) => {
      if (operation === "Iphone17CleanupRemoveSelections") fake.collection(FULL_ASSEMBLY.collectionId).sources[0].conditions[0].values = ["assembly"];
      return undefined;
    };

    const result = await apply(store);
    expect(result.outcome).toBe("FAILED_STOPPED");
    expect(result.failures).toContain("full-assembly-with-charging-coil: Source configuration (ID, type, conditions, match type, exclusions or sharing) changed.");
    expect(store.writes()).toHaveLength(1);
  });

  it("8. fails verification and stops when the write also changes publications", async () => {
    const store = new FakeCollections();
    store.intercept = (operation, _variables, fake) => {
      if (operation === "Iphone17CleanupRemoveSelections") fake.collection(FULL_ASSEMBLY.collectionId).publications[1].isPublished = false;
      return undefined;
    };

    const result = await apply(store);
    expect(result.outcome).toBe("FAILED_STOPPED");
    expect(result.failures[0]).toMatch(/Publications changed/);
    expect(store.writes()).toHaveLength(1);
  });

  it("stops without touching the second collection when Shopify rejects the first update", async () => {
    const store = new FakeCollections();
    store.intercept = (operation) => operation === "Iphone17CleanupRemoveSelections"
      ? { collectionUpdate: { collection: null, job: null, userErrors: [{ field: ["sourcesToUpdate"], message: "Source is not shareable" }] } }
      : undefined;

    const result = await apply(store);
    expect(result.outcome).toBe("FAILED_STOPPED");
    expect(result.failures).toEqual(["full-assembly-with-charging-coil: collectionUpdate rejected: sourcesToUpdate: Source is not shareable"]);
    expect(store.writes()).toHaveLength(1);
    expect(store.collection(NEW_ARRIVALS.collectionId).sources[0].selections).toHaveLength(11);
  });

  it("re-reads before writing and blocks if selections changed after the backup", async () => {
    const store = new FakeCollections();
    const result = await apply(store, {
      onBeforeWrites: () => { store.collection(NEW_ARRIVALS.collectionId).sources[0].selections.push(whole("gid://shopify/Product/555")); },
    });

    expect(result.outcome).toBe("BLOCKED");
    expect(result.blockers).toEqual(["Collection selections changed between the backup read and the pre-write read."]);
    expect(store.writes()).toEqual([]);
  });
});
