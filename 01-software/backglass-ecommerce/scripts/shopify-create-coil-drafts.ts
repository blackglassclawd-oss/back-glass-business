import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import coilCatalog from "../data/catalog/wireless-charging-coils-2026-08-29.json";
import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductNode {
  handle: string;
  id: string;
  mediaCount: { count: number };
  productType: string;
  resourcePublicationsV2: {
    nodes: Array<{ isPublished: boolean; publication: { name: string } }>;
  };
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  title: string;
  variants: { nodes: Array<{ price: string; sku: string | null }> };
}

interface CollectionNode {
  handle: string;
  id: string;
  productsCount: { count: number };
  ruleSet: {
    appliedDisjunctively: boolean;
    rules: Array<{ column: string; condition: string; relation: string }>;
  } | null;
  title: string;
}

interface InventoryQuery {
  collectionByHandle: CollectionNode | null;
  products: { nodes: ProductNode[] };
}

interface ProductCreateMutation {
  productCreate: {
    product: ProductNode | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
}

interface CollectionCreateMutation {
  collectionCreate: {
    collection: CollectionNode | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
}

const COLLECTION_HANDLE = "wireless-charging-coils";
const PRODUCT_TYPE = "Wireless Charging Coil";
const apply = process.argv.includes("--apply");
const confirmed = process.argv.includes("--confirm-shopify-draft-creation");
const expectedArgument = process.argv.find((argument) =>
  argument.startsWith("--expect-count="),
);
const expectedCount = expectedArgument
  ? Number(expectedArgument.split("=")[1])
  : Number.NaN;

const plannedProducts = coilCatalog.models.flatMap((model) =>
  coilCatalog.grades.map((grade) => ({
    grade,
    mediaBlocked: model.mediaStatus !== "APPROVED",
    model: model.model,
    slug: model.slug,
    title: `${model.model} Wireless Charging Coil - ${grade}`,
  })),
);

if (apply && (!confirmed || expectedCount !== plannedProducts.length)) {
  throw new Error(
    `Apply requires --confirm-shopify-draft-creation --expect-count=${plannedProducts.length}.`,
  );
}

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));

const INVENTORY_QUERY = `#graphql
  query CoilDraftInventory($collectionHandle: String!) {
    products(first: 250) {
      nodes {
        handle
        id
        mediaCount { count }
        productType
        status
        title
        variants(first: 10) { nodes { price sku } }
        resourcePublicationsV2(first: 20) {
          nodes { isPublished publication { name } }
        }
      }
    }
    collectionByHandle(handle: $collectionHandle) {
      handle
      id
      productsCount { count }
      ruleSet {
        appliedDisjunctively
        rules { column condition relation }
      }
      title
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `#graphql
  mutation CreateCoilDraft($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        handle
        id
        mediaCount { count }
        productType
        status
        title
        variants(first: 10) { nodes { price sku } }
        resourcePublicationsV2(first: 20) {
          nodes { isPublished publication { name } }
        }
      }
      userErrors { field message }
    }
  }
`;

const COLLECTION_CREATE_MUTATION = `#graphql
  mutation CreateCoilCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        handle
        id
        productsCount { count }
        ruleSet {
          appliedDisjunctively
          rules { column condition relation }
        }
        title
      }
      userErrors { field message }
    }
  }
`;

async function inventory() {
  return client.query<InventoryQuery>(INVENTORY_QUERY, {
    collectionHandle: COLLECTION_HANDLE,
  });
}

function throwUserErrors(
  operation: string,
  errors: Array<{ field: string[] | null; message: string }>,
) {
  if (errors.length === 0) return;
  throw new Error(
    `${operation}: ${errors
      .map((error) => `${error.field?.join(".") ?? "input"}: ${error.message}`)
      .join("; ")}`,
  );
}

function assertSafeDraft(product: ProductNode) {
  if (product.status !== "DRAFT") {
    throw new Error(`${product.title} is not Draft.`);
  }
  if (product.productType !== PRODUCT_TYPE) {
    throw new Error(`${product.title} has an unexpected product type.`);
  }
  if (product.mediaCount.count !== 0) {
    throw new Error(`${product.title} unexpectedly has media.`);
  }
  if (
    product.resourcePublicationsV2.nodes.some(
      (publication) => publication.isPublished,
    )
  ) {
    throw new Error(`${product.title} is unexpectedly published.`);
  }
  if (
    product.variants.nodes.some(
      (variant) => Number(variant.price) !== 0 || Boolean(variant.sku),
    )
  ) {
    throw new Error(`${product.title} has invented price or SKU data.`);
  }
}

const before = await inventory();
const existingByTitle = new Map(
  before.products.nodes.map((product) => [product.title, product]),
);
const conflicts = plannedProducts.filter((product) => {
  const existing = existingByTitle.get(product.title);
  return (
    existing &&
    (existing.status !== "DRAFT" || existing.productType !== PRODUCT_TYPE)
  );
});

if (conflicts.length > 0) {
  throw new Error(
    `Existing product conflicts: ${conflicts.map((product) => product.title).join(", ")}`,
  );
}

const missing = plannedProducts.filter(
  (product) => !existingByTitle.has(product.title),
);

console.log(
  `${plannedProducts.length} coil drafts planned; ${missing.length} missing; ${before.collectionByHandle ? "collection exists" : "collection missing"}.`,
);

if (!apply) {
  console.log("DRY RUN: no Shopify changes made.");
  process.exit(0);
}

const backupDirectory = resolve("backups/catalog-coil-drafts");
const capturedAt = new Date().toISOString();
const backupPath = resolve(
  backupDirectory,
  `before-coil-draft-creation-${capturedAt.replaceAll(":", "-")}.json`,
);
await mkdir(backupDirectory, { recursive: true });
await writeFile(
  backupPath,
  `${JSON.stringify(
    {
      capturedAt,
      collection: before.collectionByHandle,
      existingCoilProducts: before.products.nodes.filter(
        (product) => product.productType === PRODUCT_TYPE,
      ),
      plannedTitles: plannedProducts.map((product) => product.title),
    },
    null,
    2,
  )}\n`,
  { encoding: "utf8", flag: "wx" },
);

for (const product of missing) {
  const result = await client.query<ProductCreateMutation>(
    PRODUCT_CREATE_MUTATION,
    {
      product: {
        productType: PRODUCT_TYPE,
        status: "DRAFT",
        tags: [
          "wireless charging coil",
          product.grade.toLowerCase(),
          product.slug,
          "commercial-data-blocked",
          ...(product.mediaBlocked ? ["media-blocked"] : []),
        ],
        title: product.title,
      },
    },
  );
  throwUserErrors(`Create ${product.title}`, result.productCreate.userErrors);
  if (!result.productCreate.product) {
    throw new Error(`Shopify returned no product for ${product.title}.`);
  }
  assertSafeDraft(result.productCreate.product);
  console.log(`CREATED\t${product.title}`);
}

if (!before.collectionByHandle) {
  const result = await client.query<CollectionCreateMutation>(
    COLLECTION_CREATE_MUTATION,
    {
      input: {
        descriptionHtml:
          "Standalone wireless charging coils organized by compatible iPhone model.",
        handle: COLLECTION_HANDLE,
        ruleSet: {
          appliedDisjunctively: false,
          rules: [
            {
              column: "TYPE",
              condition: PRODUCT_TYPE,
              relation: "EQUALS",
            },
          ],
        },
        sortOrder: "CREATED_DESC",
        title: "Wireless Charging Coils",
      },
    },
  );
  throwUserErrors(
    "Create Wireless Charging Coils collection",
    result.collectionCreate.userErrors,
  );
  if (!result.collectionCreate.collection) {
    throw new Error("Shopify returned no Wireless Charging Coils collection.");
  }
  console.log("CREATED\tWireless Charging Coils collection");
}

const after = await inventory();
const afterByTitle = new Map(
  after.products.nodes.map((product) => [product.title, product]),
);
for (const planned of plannedProducts) {
  const product = afterByTitle.get(planned.title);
  if (!product) throw new Error(`Verification missing ${planned.title}.`);
  assertSafeDraft(product);
}

const collection = after.collectionByHandle;
if (
  !collection ||
  collection.title !== "Wireless Charging Coils" ||
  collection.ruleSet?.appliedDisjunctively !== false ||
  collection.ruleSet.rules.length !== 1 ||
  collection.ruleSet.rules[0]?.column !== "TYPE" ||
  collection.ruleSet.rules[0]?.condition !== PRODUCT_TYPE ||
  collection.ruleSet.rules[0]?.relation !== "EQUALS"
) {
  throw new Error("Wireless Charging Coils collection verification failed.");
}

console.log(
  `APPLIED AND VERIFIED\tproducts=${plannedProducts.length}\tcollection=${collection.id}\tbackup=${backupPath}`,
);
