import { describe, expect, it } from "vitest";

import { iphone17SeriesApproval, publishableIphone17BackGlass } from "../../app/data/iphone17-series-approval";
import baselineJson from "../../data/catalog/iphone-17-release-baseline-2026-09-15.json";
import {
  assertReleaseScope,
  executeRelease,
  familyFingerprints,
  preflight,
  releaseSummary,
  type AdminClient,
  type ReleaseBaseline,
  type ReleaseTargetBaseline,
} from "./iphone17-release";

const baseline = baselineJson as unknown as ReleaseBaseline;
const [aGrade, premium] = baseline.targets;
const STALE = ["full-assembly-with-charging-coil", "new-arrivals"];
const CHANNELS = [
  { id: "gid://shopify/Publication/1", name: "Online Store" },
  { id: "gid://shopify/Publication/2", name: "Shop" },
  { id: "gid://shopify/Publication/3", name: "Point of Sale" },
];

interface FakeVariant {
  id: string;
  inventoryPolicy: string;
  inventoryQuantity: number | null;
  inventoryTracked: boolean;
  mediaIds: string[];
  price: string;
  sku: string | null;
  title: string;
}
interface FakeProduct {
  collections: string[];
  colors: string[];
  handle: string;
  id: string;
  mediaIds: string[];
  productType: string;
  published: string[];
  status: string;
  title: string;
  variants: FakeVariant[];
}
type Intercept = (operation: string, variables: Record<string, unknown>, store: FakeShopify) => unknown;

const page = <T>(nodes: T[], hasNextPage = false, endCursor: string | null = null) => ({ nodes, pageInfo: { endCursor, hasNextPage } });

function productFor(target: ReleaseTargetBaseline): FakeProduct {
  return {
    collections: [...target.requiredCollections, "do-not-delete-all-products-generated-by-extend-commerce"],
    colors: [...target.colors],
    handle: target.handle,
    id: target.productId,
    mediaIds: [...target.mediaIds],
    productType: target.productType,
    published: [...target.preReleasePublications],
    status: target.preReleaseStatus,
    title: target.title,
    variants: target.variants.map((variant) => ({
      id: variant.variantId,
      inventoryPolicy: variant.inventoryPolicy,
      inventoryQuantity: variant.inventoryQuantity,
      inventoryTracked: variant.inventoryTracked,
      mediaIds: [variant.mediaId],
      price: variant.price,
      sku: variant.sku,
      title: variant.color,
    })),
  };
}

const simple = (id: string, handle: string, title: string, productType: string): FakeProduct => ({
  collections: [], colors: [], handle, id, mediaIds: [], productType, published: [], status: "DRAFT", title,
  variants: [{ id: `${id}/v`, inventoryPolicy: "DENY", inventoryQuantity: 0, inventoryTracked: false, mediaIds: [], price: "0.00", sku: null, title: "Default" }],
});

/** In-memory Admin API: answers only the release engine's named operations and throws on anything else. */
class FakeShopify implements AdminClient {
  calls: Array<{ operation: string; variables: Record<string, unknown> }> = [];
  collectionPageSize = 50;
  handles = new Map<string, string>();
  intercept?: Intercept;
  products = new Map<string, FakeProduct>();
  truncatedVariants = new Set<string>();

  constructor(stale = false) {
    for (const target of baseline.targets) {
      const product = productFor(target);
      if (stale) product.collections.push(...STALE);
      this.add(product);
    }
    const e = baseline.canonical17e;
    this.add({ ...simple(e.productId, e.handle, e.title, e.productType), colors: ["Black", "White", "Soft Pink"] });
    this.add(simple("gid://shopify/Product/8736047268012", "iphone-17-wireless-charging-coil-oem", "iPhone 17 Wireless Charging Coil - OEM", "Wireless Charging Coil"));
    this.add(simple("gid://shopify/Product/8675371417772", "iphone-17-pro-half-assembly-no-coil-premium", "iPhone 17 Pro Back Glass Half Assembly (No Coil) - Premium", "Back Glass"));
    this.add(simple("gid://shopify/Product/8748929941676", "iphone-17-pro-max-half-assembly-no-coil-premium-plus", "iPhone 17 Pro Max Back Glass Half Assembly (No Coil) - Premium Plus", "Back Glass"));
    this.add(simple("gid://shopify/Product/8675371253932", "iphone-air-half-assembly-no-coil-premium", "iPhone Air Back Glass Half Assembly (No Coil) - Premium", "Back Glass"));
    this.add(simple("gid://shopify/Product/8100267983020", "iphone-16-half-assembly-no-coil-premium", "iPhone 16 Back Glass Half Assembly (No Coil) - Premium", "Back Glass"));
  }

  add(product: FakeProduct) {
    this.products.set(product.id, product);
    this.handles.set(product.handle, product.id);
  }

  get(id: string) {
    return this.products.get(id)!;
  }

  mutationCalls() {
    return this.calls.filter((call) => /Publish|Unpublish|SetStatus/.test(call.operation));
  }

  private rawProduct(product: FakeProduct) {
    const collections = product.collections.slice(0, this.collectionPageSize);
    return {
      collections: page(collections.map((handle) => ({ handle })), product.collections.length > this.collectionPageSize, String(this.collectionPageSize)),
      handle: product.handle,
      id: product.id,
      media: page(product.mediaIds.map((id) => ({ id }))),
      options: [{ name: "Color", values: product.colors }],
      productType: product.productType,
      resourcePublicationsV2: page(product.published.map((name) => ({ isPublished: true, publication: { name } }))),
      status: product.status,
      title: product.title,
      variants: page(
        product.variants.map((variant) => ({
          id: variant.id,
          inventoryItem: { tracked: variant.inventoryTracked },
          inventoryPolicy: variant.inventoryPolicy,
          inventoryQuantity: variant.inventoryQuantity,
          media: page(variant.mediaIds.map((id) => ({ id }))),
          price: variant.price,
          sku: variant.sku,
          title: variant.title,
        })),
        this.truncatedVariants.has(product.id),
      ),
    };
  }

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const operation = /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] ?? "anonymous";
    this.calls.push({ operation, variables });
    const intercepted = this.intercept?.(operation, variables, this);
    if (intercepted !== undefined) return intercepted as T;
    const id = variables.id as string;
    switch (operation) {
      case "Iphone17ReleaseChannels":
        return { publications: page(CHANNELS) } as T;
      case "Iphone17ReleaseProduct": {
        const product = this.products.get(id);
        return { product: product ? this.rawProduct(product) : null } as T;
      }
      case "Iphone17ReleaseProductCollections": {
        const product = this.get(id);
        const start = Number(variables.after);
        const end = start + this.collectionPageSize;
        const nodes = product.collections.slice(start, end).map((handle) => ({ handle }));
        return { product: { collections: page(nodes, product.collections.length > end, String(end)) } } as T;
      }
      case "Iphone17ReleaseCanonical17e": {
        const product = this.products.get(id);
        const resolved = this.handles.get(variables.handle as string);
        return {
          product: product && { ...product, resourcePublicationsV2: page(product.published.map((name) => ({ publication: { name } }))) },
          productByIdentifier: resolved ? { id: resolved } : null,
          products: page([...this.products.values()].filter((entry) => /17e/i.test(entry.title)).map(({ handle, id: productId, productType, title }) => ({ handle, id: productId, productType, title }))),
        } as T;
      }
      case "Iphone17ReleaseFamily": {
        // Whole catalog, like the live query: the engine must filter the family itself.
        const catalog = [...this.products.values()].sort((l, r) => l.id.localeCompare(r.id));
        const start = variables.after ? Number(variables.after) : 0;
        const nodes = catalog.slice(start, start + 10).map((product) => ({
          handle: product.handle,
          id: product.id,
          media: page(product.mediaIds.map((mediaId) => ({ id: mediaId }))),
          productType: product.productType,
          resourcePublicationsV2: page(product.published.map((name) => ({ publication: { name } }))),
          status: product.status,
          title: product.title,
          variants: page(product.variants.map((variant) => ({
            id: variant.id, inventoryItem: { tracked: variant.inventoryTracked }, inventoryPolicy: variant.inventoryPolicy,
            inventoryQuantity: variant.inventoryQuantity, price: variant.price, sku: variant.sku,
          }))),
        }));
        return { products: page(nodes, catalog.length > start + 10, String(start + 10)) } as T;
      }
      case "Iphone17ReleasePublish":
      case "Iphone17ReleaseUnpublish": {
        const product = this.get(id);
        const names = (variables.input as Array<{ publicationId: string }>).map((entry) => CHANNELS.find((channel) => channel.id === entry.publicationId)!.name);
        product.published = operation === "Iphone17ReleasePublish"
          ? [...new Set([...product.published, ...names])]
          : product.published.filter((name) => !names.includes(name));
        const key = operation === "Iphone17ReleasePublish" ? "publishablePublish" : "publishableUnpublish";
        return { [key]: { userErrors: [] } } as T;
      }
      case "Iphone17ReleaseSetStatus": {
        const input = variables.product as { id: string; status: string };
        this.get(input.id).status = input.status;
        return { productUpdate: { product: input, userErrors: [] } } as T;
      }
      default:
        throw new Error(`Unexpected Admin API operation ${operation}`);
    }
  }
}

const release = (store: FakeShopify, extra: Partial<Parameters<typeof executeRelease>[0]> = {}) =>
  executeRelease({ baseline, client: store, ...extra });

const failWhen = (predicate: (operation: string, variables: Record<string, unknown>) => boolean, error = new Error("simulated Shopify failure")): Intercept =>
  (operation, variables) => {
    if (predicate(operation, variables)) throw error;
    return undefined;
  };

const activating = (productId: string) => (operation: string, variables: Record<string, unknown>) =>
  operation === "Iphone17ReleaseSetStatus" && (variables.product as { id: string; status: string }).id === productId && (variables.product as { status: string }).status === "ACTIVE";

describe("iPhone 17 release baseline", () => {
  it("records exactly the two approved base products with per-colour SKU, price, inventory and image", () => {
    expect(() => assertReleaseScope(baseline, publishableIphone17BackGlass())).not.toThrow();
    expect(baseline.targets.map((target) => [target.productId, target.approvedSellingPrice])).toEqual([
      ["gid://shopify/Product/8675370991788", "12.00"],
      ["gid://shopify/Product/8675371090092", "18.00"],
    ]);
    for (const target of baseline.targets) {
      expect(target.variants.map((variant) => variant.color)).toEqual(target.colors);
      expect(new Set(target.variants.map((variant) => variant.mediaId)).size).toBe(target.colors.length);
      expect(target.forbiddenCollections).toEqual(STALE);
      expect(target.preReleaseStatus).toBe("DRAFT");
    }
  });
});

describe("iPhone 17 release safety", () => {
  it("1. blocks on Full Assembly / New Arrivals membership and writes nothing", async () => {
    const store = new FakeShopify(true);
    const checks = await preflight(store, baseline);

    for (const handle of STALE) {
      expect(checks.targets[0].blockers).toContain(`Still a member of ${handle} (forbidden collection membership).`);
      expect(checks.targets[1].blockers).toContain(`Still a member of ${handle} (forbidden collection membership).`);
    }
    expect(releaseSummary(checks)).toMatchObject({ create: 0, publish: 0, publishBlocked: 2 });
    const result = await release(store);
    expect(result.outcome).toBe("BLOCKED");
    expect(store.mutationCalls()).toEqual([]);
  });

  it("2. blocks a Black ↔ White image swap even though count and approved media still match", async () => {
    const store = new FakeShopify();
    const variants = store.get(aGrade.productId).variants;
    [variants[0].mediaIds, variants[1].mediaIds] = [variants[1].mediaIds, variants[0].mediaIds];

    const checks = await preflight(store, baseline);
    expect(checks.targets[0].blockers).toEqual([
      `Black: assigned image [${aGrade.variants[1].mediaId}] is not the approved Black image ${aGrade.variants[0].mediaId}.`,
      `White: assigned image [${aGrade.variants[0].mediaId}] is not the approved White image ${aGrade.variants[1].mediaId}.`,
    ]);
    expect((await release(store)).outcome).toBe("BLOCKED");
    expect(store.mutationCalls()).toEqual([]);
  });

  it("3. blocks a same-count media substitution", async () => {
    const store = new FakeShopify();
    const product = store.get(premium.productId);
    product.mediaIds[0] = "gid://shopify/MediaImage/999";
    product.variants[0].mediaIds = ["gid://shopify/MediaImage/999"];

    const blockers = (await preflight(store, baseline)).targets[1].blockers;
    expect(product.mediaIds).toHaveLength(premium.mediaIds.length);
    expect(blockers.some((blocker) => blocker.startsWith("Product media ["))).toBe(true);
    expect(blockers.some((blocker) => blocker.startsWith("Black: assigned image"))).toBe(true);
  });

  it("4. blocks any SKU change, even to a different unique SKU", async () => {
    const store = new FakeShopify();
    store.get(aGrade.productId).variants[2].sku = "SKU-I17-A-GRADE-MISTBLUE-HA";

    expect((await preflight(store, baseline)).targets[0].blockers).toEqual([
      `Mist Blue: SKU is "SKU-I17-A-GRADE-MISTBLUE-HA", expected exactly "${aGrade.variants[2].sku}".`,
    ]);
  });

  it.each([
    ["tracking", (variant: FakeVariant) => { variant.inventoryTracked = true; }, "inventory tracked is true"],
    ["policy", (variant: FakeVariant) => { variant.inventoryPolicy = "CONTINUE"; }, "inventory policy is CONTINUE"],
    ["quantity", (variant: FakeVariant) => { variant.inventoryQuantity = 7; }, "inventory quantity is 7"],
  ])("5. blocks inventory %s drift", async (_name, change, message) => {
    const store = new FakeShopify();
    change(store.get(premium.productId).variants[4]);

    expect((await preflight(store, baseline)).targets[1].blockers).toEqual([`Sage: ${message}, verified ${message.includes("tracked") ? "false" : message.includes("policy") ? "DENY" : "0"}.`]);
  });

  describe("6. binds iPhone 17e to its canonical product ID", () => {
    const e = baseline.canonical17e;

    it("blocks when the expected handle resolves to another product", async () => {
      const store = new FakeShopify();
      store.get(e.productId).handle = `${e.handle}-1`;
      store.handles.delete(e.handle);
      store.add({ ...simple("gid://shopify/Product/1", e.handle, e.title, "Back Glass") });

      const checks = await preflight(store, baseline);
      expect(checks.canonical17e).toEqual(expect.arrayContaining([
        `Canonical iPhone 17e handle is "${e.handle}-1", expected "${e.handle}".`,
        `Handle ${e.handle} resolves to gid://shopify/Product/1, expected ${e.productId}.`,
        `Duplicate iPhone 17e back-glass record gid://shopify/Product/1 (${e.handle}).`,
      ]));
      expect((await release(store)).outcome).toBe("BLOCKED");
      expect(store.mutationCalls()).toEqual([]);
    });

    it("blocks when the canonical product is missing, and never creates one", async () => {
      const store = new FakeShopify();
      store.products.delete(e.productId);
      store.handles.delete(e.handle);

      const checks = await preflight(store, baseline);
      expect(checks.canonical17e).toContain(`Canonical iPhone 17e product ${e.productId} not found.`);
      expect(releaseSummary(checks)).toMatchObject({ create: 0, publish: 0 });
      expect((await release(store)).outcome).toBe("BLOCKED");
      expect(store.calls.every((call) => call.operation.startsWith("Iphone17Release"))).toBe(true);
    });
  });

  describe("7. incomplete gate data never certifies readiness", () => {
    it("fails a truncated variant list", async () => {
      const store = new FakeShopify();
      store.truncatedVariants.add(aGrade.productId);

      const checks = await preflight(store, baseline);
      expect(checks.targets[0].blockers).toEqual([`${aGrade.productId} variants is truncated; a partial read cannot certify release state.`]);
      expect(releaseSummary(checks).publish).toBe(0);
    });

    it("finds a forbidden collection on a later page", async () => {
      const store = new FakeShopify();
      store.collectionPageSize = 2;
      store.get(premium.productId).collections.push("x", "y", "new-arrivals");

      expect((await preflight(store, baseline)).targets[1].blockers).toEqual(["Still a member of new-arrivals (forbidden collection membership)."]);
      expect(store.calls.filter((call) => call.operation === "Iphone17ReleaseProductCollections").length).toBeGreaterThan(0);
    });
  });

  it("stages both targets while DRAFT, then activates, then verifies", async () => {
    const store = new FakeShopify();
    const result = await release(store);

    expect(result.outcome).toBe("RELEASED");
    const operations = store.mutationCalls().map((call) => call.operation);
    expect(operations).toEqual(["Iphone17ReleasePublish", "Iphone17ReleasePublish", "Iphone17ReleaseSetStatus", "Iphone17ReleaseSetStatus"]);
    for (const target of baseline.targets) {
      expect(store.get(target.productId).status).toBe("ACTIVE");
      expect([...store.get(target.productId).published].sort()).toEqual(["Online Store", "Point of Sale", "Shop"]);
    }
  });

  it("re-reads immediately before the first write and blocks drift introduced after the backup", async () => {
    const store = new FakeShopify();
    const result = await release(store, {
      onBeforeWrites: () => { store.get(premium.productId).variants[0].price = "17.00"; },
    });

    expect(result.outcome).toBe("BLOCKED");
    expect(result.blockers).toContain(`${premium.title}: Black: price is $17.00, approved price is $18.00.`);
    expect(store.mutationCalls()).toEqual([]);
  });

  it("8. compensates when the second activation fails after the first succeeded, keeping pre-existing channels", async () => {
    const withPos = structuredClone(baseline);
    for (const target of withPos.targets) target.preReleasePublications = ["Point of Sale"];
    const store = new FakeShopify();
    for (const target of withPos.targets) store.get(target.productId).published = ["Point of Sale"];
    store.intercept = failWhen(activating(premium.productId));

    const result = await executeRelease({ baseline: withPos, client: store });

    expect(result.outcome).toBe("ROLLED_BACK");
    expect(result.failures[0]).toMatch(/simulated Shopify failure/);
    expect(result.recovery).toEqual([]);
    for (const target of withPos.targets) {
      expect(store.get(target.productId).status).toBe("DRAFT");
      expect(store.get(target.productId).published).toEqual(["Point of Sale"]);
    }
    const rollback = result.mutations.filter((mutation) => mutation.detail.startsWith("rollback"));
    expect(rollback.map((mutation) => [mutation.productId, mutation.operation])).toEqual([
      [aGrade.productId, "productUpdate"],
      [aGrade.productId, "publishableUnpublish"],
      [premium.productId, "publishableUnpublish"],
    ]);
    expect(rollback.find((mutation) => mutation.operation === "publishableUnpublish")!.detail).toBe("rollback withdraw Online Store, Shop");
  });

  it("8b. compensates a partial staging failure before anything was activated", async () => {
    const store = new FakeShopify();
    store.intercept = failWhen((operation, variables) => operation === "Iphone17ReleasePublish" && variables.id === premium.productId);

    const result = await release(store);

    expect(result.outcome).toBe("ROLLED_BACK");
    expect(store.get(aGrade.productId).published).toEqual([]);
    expect(store.mutationCalls().some((call) => call.operation === "Iphone17ReleaseSetStatus")).toBe(false);
  });

  it("9. reports PARTIAL_RELEASE_MANUAL_RECOVERY with exact differences when rollback fails", async () => {
    const store = new FakeShopify();
    store.intercept = failWhen((operation, variables) => {
      const product = variables.product as { id: string; status: string } | undefined;
      return activating(premium.productId)(operation, variables) || (operation === "Iphone17ReleaseSetStatus" && product?.id === aGrade.productId && product.status === "DRAFT");
    });
    const lines: string[] = [];

    const result = await release(store, { log: (line) => lines.push(line) });

    expect(result.outcome).toBe("PARTIAL_RELEASE_MANUAL_RECOVERY");
    expect(result.recovery).toEqual([`${aGrade.title} (${aGrade.productId}): status ACTIVE, pre-release DRAFT.`]);
    expect(lines.join("\n")).toContain("PARTIAL RELEASE — MANUAL RECOVERY REQUIRED");
    expect(store.get(aGrade.productId).published).toEqual([]);
  });

  it("E. fails closed and rolls back when media change after activation with the count intact", async () => {
    const store = new FakeShopify();
    store.intercept = (operation, variables, fake) => {
      if (activating(premium.productId)(operation, variables)) {
        const product = fake.get(aGrade.productId);
        product.mediaIds[0] = "gid://shopify/MediaImage/999";
        product.variants[0].mediaIds = ["gid://shopify/MediaImage/999"];
      }
      return undefined;
    };

    const result = await release(store);

    expect(result.outcome).toBe("ROLLED_BACK");
    expect(result.failures[0]).toMatch(/Final verification failed[\s\S]*Black: assigned image/);
    expect(store.get(aGrade.productId).status).toBe("DRAFT");
  });

  it("10. never lets a blocked Pro, Air, withdrawn A Grade or Premium Plus record into the release set", () => {
    const approvedIds = publishableIphone17BackGlass().map((decision) => decision.productId);
    const blocked = iphone17SeriesApproval.backGlass.filter((decision) => !approvedIds.includes(decision.productId));

    expect(blocked.length).toBe(7);
    for (const decision of blocked) {
      expect(baseline.targets.map((target) => target.productId)).not.toContain(decision.productId);
      expect(() => assertReleaseScope(baseline, [...publishableIphone17BackGlass(), { ...decision, approvedSellingPrice: "10.00" }])).toThrow(/differ from the approval record/);
    }
    const repriced = structuredClone(baseline);
    repriced.targets[0].approvedSellingPrice = "13.00";
    expect(() => assertReleaseScope(repriced, publishableIphone17BackGlass())).toThrow(/not the approved price/);
  });

  it("11. keeps coils and every other family record out of the mutation set and fails on collateral change", async () => {
    const store = new FakeShopify();
    const coil = store.get("gid://shopify/Product/8736047268012");
    const released = await release(store);

    const targetIds = baseline.targets.map((target) => target.productId);
    expect(released.outcome).toBe("RELEASED");
    expect(store.mutationCalls().every((call) => targetIds.includes((call.variables.id ?? (call.variables.product as { id: string }).id) as string))).toBe(true);
    expect([coil.status, coil.published]).toEqual(["DRAFT", []]);

    const second = new FakeShopify();
    second.intercept = (operation, variables, fake) => {
      if (activating(premium.productId)(operation, variables)) fake.get("gid://shopify/Product/8736047268012").variants[0].price = "5.00";
      return undefined;
    };
    const collateral = await release(second);
    expect(collateral.outcome).toBe("ROLLED_BACK");
    expect(collateral.failures[0]).toMatch(/Collateral change: iPhone 17 Wireless Charging Coil - OEM/);
  });

  it("F. fingerprints every iPhone 17-family record, coils included, from a full catalog scan", async () => {
    const store = new FakeShopify();
    for (let index = 0; index < 25; index += 1) {
      store.add(simple(`gid://shopify/Product/7${String(index).padStart(3, "0")}`, `filler-${index}`, `iPhone 15 Filler ${index}`, "Back Glass"));
    }
    store.add(simple("gid://shopify/Product/99999", "iphone-air-wireless-charging-coil-oem", "iPhone Air Wireless Charging Coil - OEM", "Wireless Charging Coil"));

    const titles = [...(await familyFingerprints(store)).values()].map((record) => record.title);

    expect(titles).toHaveLength(8);
    expect(titles).toEqual(expect.arrayContaining([
      aGrade.title, premium.title, baseline.canonical17e.title,
      "iPhone 17 Wireless Charging Coil - OEM", "iPhone Air Wireless Charging Coil - OEM",
    ]));
    expect(titles.some((title) => /iPhone 1[56] /.test(title))).toBe(false);
    expect(store.calls.filter((call) => call.operation === "Iphone17ReleaseFamily").length).toBe(4);
  });

  it("12. plans zero creates when canonical iPhone 17e exists", async () => {
    const store = new FakeShopify();
    const checks = await preflight(store, baseline);

    expect(checks.canonical17e).toEqual([]);
    expect(releaseSummary(checks)).toEqual({
      coilMutations: 0, collectionMutations: 0, create: 0, inventoryMutations: 0, priceMutations: 0, publish: 2, publishBlocked: 0,
    });
  });
});
