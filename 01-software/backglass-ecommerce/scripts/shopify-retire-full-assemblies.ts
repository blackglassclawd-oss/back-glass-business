import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductNode {
  handle: string;
  id: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  title: string;
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

interface CatalogState {
  collectionByHandle: CollectionNode | null;
  products: { nodes: ProductNode[] };
}

interface MutationUserError {
  field?: string[];
  message: string;
}

const EXTEND_COLLECTION_HANDLE =
  "do-not-delete-all-products-generated-by-extend-commerce";

const CATALOG_STATE_QUERY = `#graphql
  query FullAssemblyRetirementState($extendHandle: String!) {
    products(first: 250) {
      nodes { handle id status title }
    }
    collectionByHandle(handle: $extendHandle) {
      handle
      id
      title
      productsCount { count }
      ruleSet {
        appliedDisjunctively
        rules { column condition relation }
      }
    }
  }
`;

const PRODUCT_STATUS_MUTATION = `#graphql
  mutation RetireFullAssembly($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id status }
      userErrors { field message }
    }
  }
`;

function fullAssemblies(state: CatalogState) {
  return state.products.nodes.filter((product) =>
    /full assembly|\(with coil\)/i.test(product.title),
  );
}

function assertNoErrors(context: string, errors: MutationUserError[]) {
  if (!errors.length) return;
  throw new Error(
    `${context}: ${errors.map((error) => error.message).join("; ")}`,
  );
}

async function loadState(client: ShopifyAdminClient) {
  return client.query<CatalogState>(CATALOG_STATE_QUERY, {
    extendHandle: EXTEND_COLLECTION_HANDLE,
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmed = process.argv.includes("--confirm-production-retirement");
  const expectedCountArgument = process.argv.find((argument) =>
    argument.startsWith("--expect-count="),
  );
  const expectedCount = expectedCountArgument
    ? Number(expectedCountArgument.split("=")[1])
    : null;
  const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
  const before = await loadState(client);
  const products = fullAssemblies(before);

  if (!before.collectionByHandle) {
    throw new Error("Extend Commerce All Products collection was not found.");
  }
  products.forEach((product) =>
    console.log(`${product.status}\t${product.title}\t${product.handle}`),
  );

  if (!apply) {
    console.log(
      `DRY RUN: ${products.filter((product) => product.status !== "DRAFT").length} of ${products.length} full assemblies would move to DRAFT; Extend collection remains unchanged.`,
    );
    return;
  }
  if (!confirmed || expectedCount === null || expectedCount !== products.length) {
    throw new Error(
      `Apply requires --confirm-production-retirement and --expect-count=${products.length} after reviewing the dry-run.`,
    );
  }

  const backupDirectory = path.resolve("backups/catalog-retirement");
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    backupDirectory,
    `before-full-assembly-retirement-${timestamp}.json`,
  );
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    backupPath,
    `${JSON.stringify({ capturedAt: new Date().toISOString(), state: before }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );

  for (const product of products.filter((item) => item.status !== "DRAFT")) {
    const response = await client.query<{
      productUpdate: { userErrors: MutationUserError[] };
    }>(PRODUCT_STATUS_MUTATION, {
      product: { id: product.id, status: "DRAFT" },
    });
    assertNoErrors(
      `Move ${product.title} to DRAFT`,
      response.productUpdate.userErrors,
    );
  }

  const after = await loadState(client);
  const remaining = fullAssemblies(after).filter(
    (product) => product.status !== "DRAFT",
  );
  if (remaining.length) {
    throw new Error(
      `Retirement verification failed: ${remaining.map((product) => product.title).join(", ")}`,
    );
  }
  if (
    after.collectionByHandle?.id !== before.collectionByHandle.id ||
    JSON.stringify(after.collectionByHandle.ruleSet) !==
      JSON.stringify(before.collectionByHandle.ruleSet)
  ) {
    throw new Error("Extend Commerce collection changed during retirement.");
  }

  console.log(`APPLIED AND VERIFIED\tbackup=${backupPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
