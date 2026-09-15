import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

const TARGET_HANDLES = new Set([
  "a-grade",
  "premium",
  "half-assembly-without-charging-coil",
  "glass-only",
  "new-arrivals",
]);

interface Money {
  amount: string;
}

interface Product {
  id: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  priceRangeV2: {
    maxVariantPrice: Money;
  };
}

interface Collection {
  id: string;
  title: string;
  handle: string;
  sortOrder: string;
  products: {
    nodes: Product[];
  };
}

interface CollectionsQuery {
  collections: {
    nodes: Collection[];
  };
}

interface UserError {
  field?: string[];
  message: string;
}

interface CollectionUpdateMutation {
  collectionUpdate: {
    collection: { id: string; sortOrder: string } | null;
    userErrors: UserError[];
  };
}

interface ReorderMutation {
  collectionReorderProducts: {
    job: { id: string } | null;
    userErrors: UserError[];
  };
}

interface JobQuery {
  job: { done: boolean } | null;
}

interface SortKey {
  releaseRank: number;
  modelRank: number;
  price: number;
  gradeRank: number;
  assemblyRank: number;
}

const COLLECTIONS_QUERY = `#graphql
  query CatalogCollections {
    collections(first: 100) {
      nodes {
        id
        title
        handle
        sortOrder
        products(first: 250) {
          nodes {
            id
            title
            status
            priceRangeV2 {
              maxVariantPrice {
                amount
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTION_UPDATE = `#graphql
  mutation SetCollectionManual($collection: CollectionUpdateInput!) {
    collectionUpdate(collection: $collection) {
      collection {
        id
        sortOrder
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const REORDER_PRODUCTS = `#graphql
  mutation ReorderCollectionProducts($id: ID!, $moves: [MoveInput!]!) {
    collectionReorderProducts(id: $id, moves: $moves) {
      job {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const JOB_QUERY = `#graphql
  query ReorderJob($id: ID!) {
    job(id: $id) {
      done
    }
  }
`;

function getSortKey(product: Product): SortKey {
  const title = product.title.toLowerCase();
  const releaseRank = getReleaseRank(title);

  let modelRank = 20;
  if (title.includes("pro max")) modelRank = 50;
  else if (title.includes("pro")) modelRank = 40;
  else if (title.includes("plus") || title.includes("xs max")) modelRank = 30;
  else if (title.includes("air")) modelRank = 25;
  else if (title.includes("mini")) modelRank = 10;

  return {
    releaseRank,
    modelRank,
    price: Number(product.priceRangeV2.maxVariantPrice.amount),
    gradeRank: title.includes("premium") ? 2 : title.includes("a grade") ? 1 : 0,
    assemblyRank: title.includes("full assembly")
      ? 2
      : title.includes("half assembly")
        ? 1
        : 0,
  };
}

function getReleaseRank(title: string): number {
  if (/iphone (17|air)\b/.test(title)) return 17;
  if (/iphone 16\b/.test(title)) return 16;
  if (/iphone 15\b/.test(title)) return 15;
  if (/iphone 14\b/.test(title)) return 14;
  if (title.includes("se 3rd gen")) return 13.5;
  if (/iphone 13\b/.test(title)) return 13;
  if (/iphone 12\b/.test(title)) return 12;
  if (title.includes("se 2nd gen")) return 11.5;
  if (/iphone 11\b/.test(title)) return 11;
  if (/iphone (xs|xr)\b/.test(title)) return 10.5;
  if (/iphone x\b/.test(title)) return 10;
  if (/iphone 8\b/.test(title)) return 8;
  throw new Error(`Unrecognized iPhone release in product title: ${title}`);
}

function compareProducts(left: Product, right: Product): number {
  const a = getSortKey(left);
  const b = getSortKey(right);

  return (
    b.releaseRank - a.releaseRank ||
    b.modelRank - a.modelRank ||
    b.price - a.price ||
    b.gradeRank - a.gradeRank ||
    b.assemblyRank - a.assemblyRank ||
    left.title.localeCompare(right.title)
  );
}

function buildMoves(current: Product[], desired: Product[]) {
  const working = current.map((product) => product.id);
  const moves: Array<{ id: string; newPosition: string }> = [];

  desired.forEach((product, targetIndex) => {
    if (working[targetIndex] === product.id) return;

    const currentIndex = working.indexOf(product.id);
    if (currentIndex === -1) {
      throw new Error(`Product ${product.id} disappeared while planning moves.`);
    }

    working.splice(currentIndex, 1);
    working.splice(targetIndex, 0, product.id);
    moves.push({ id: product.id, newPosition: String(targetIndex) });
  });

  return moves;
}

function assertNoErrors(context: string, errors: UserError[]) {
  if (errors.length === 0) return;
  throw new Error(
    `${context}: ${errors.map((error) => error.message).join("; ")}`,
  );
}

async function loadCollections(client: ShopifyAdminClient) {
  const data = await client.query<CollectionsQuery>(COLLECTIONS_QUERY);
  const collections = data.collections.nodes.filter((collection) =>
    TARGET_HANDLES.has(collection.handle),
  );
  const found = new Set(collections.map((collection) => collection.handle));
  const missing = [...TARGET_HANDLES].filter((handle) => !found.has(handle));

  if (missing.length > 0) {
    throw new Error(`Missing target collections: ${missing.join(", ")}`);
  }

  return collections;
}

async function waitForJob(client: ShopifyAdminClient, jobId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const data = await client.query<JobQuery>(JOB_QUERY, { id: jobId });
    if (data.job?.done) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for Shopify job ${jobId}.`);
}

function printPlan(collection: Collection, desired: Product[]) {
  const moves = buildMoves(collection.products.nodes, desired);
  console.log(
    `\n${collection.title}\t${collection.sortOrder} -> MANUAL\t${moves.length} moves`,
  );
  desired.forEach((product, index) => {
    const price = Number(product.priceRangeV2.maxVariantPrice.amount).toFixed(2);
    console.log(
      `${String(index + 1).padStart(3)}\t${product.status}\t$${price}\t${product.title}`,
    );
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
  const before = await loadCollections(client);
  const plans = before.map((collection) => ({
    collection,
    desired: [...collection.products.nodes].sort(compareProducts),
  }));

  plans.forEach(({ collection, desired }) => printPlan(collection, desired));

  if (!apply) {
    console.log("\nDRY RUN: rerun with --apply after granting write_products.");
    return;
  }

  const backupDirectory = path.resolve("data/backups");
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    backupDirectory,
    `shopify-collection-order-before-release-sort-${timestamp}.json`,
  );
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(backupPath, `${JSON.stringify(before, null, 2)}\n`);

  for (const { collection, desired } of plans) {
    if (collection.sortOrder !== "MANUAL") {
      const updated = await client.query<CollectionUpdateMutation>(
        COLLECTION_UPDATE,
        { collection: { id: collection.id, sortOrder: "MANUAL" } },
      );
      assertNoErrors(
        `Set ${collection.title} to MANUAL`,
        updated.collectionUpdate.userErrors,
      );
    }

    const moves = buildMoves(collection.products.nodes, desired);
    if (moves.length === 0) continue;

    const reordered = await client.query<ReorderMutation>(REORDER_PRODUCTS, {
      id: collection.id,
      moves,
    });
    assertNoErrors(
      `Reorder ${collection.title}`,
      reordered.collectionReorderProducts.userErrors,
    );
    const jobId = reordered.collectionReorderProducts.job?.id;
    if (!jobId) throw new Error(`Shopify returned no job for ${collection.title}.`);
    await waitForJob(client, jobId);
  }

  const after = await loadCollections(client);
  for (const collection of after) {
    const expected = [...collection.products.nodes].sort(compareProducts);
    const actualIds = collection.products.nodes.map((product) => product.id);
    const expectedIds = expected.map((product) => product.id);
    if (
      collection.sortOrder !== "MANUAL" ||
      JSON.stringify(actualIds) !== JSON.stringify(expectedIds)
    ) {
      throw new Error(`Verification failed for ${collection.title}.`);
    }
  }

  console.log(`\nAPPLIED AND VERIFIED\tbackup=${backupPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
