import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductNode {
  handle: string;
  id: string;
  legacyResourceId: string;
  status: string;
  title: string;
}

interface MutationUserError {
  field?: string[];
  message: string;
}

const targetIds = [
  "gid://shopify/Product/8675370991788",
  "gid://shopify/Product/8675371090092",
  "gid://shopify/Product/8675371352236",
  "gid://shopify/Product/8675371417772",
  "gid://shopify/Product/8675371516076",
  "gid://shopify/Product/8675371614380",
  "gid://shopify/Product/8675371188396",
  "gid://shopify/Product/8675371253932",
] as const;

const productQuery = `#graphql
  query Iphone17ReviewVisibility($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        handle
        id
        legacyResourceId
        status
        title
      }
    }
  }
`;

const productMutation = `#graphql
  mutation Iphone17ReviewVisible($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function assertNoUserErrors(operation: string, errors: MutationUserError[]) {
  if (errors.length === 0) return;
  throw new Error(
    `${operation}: ${errors
      .map((error) => `${error.field?.join(".") ?? "unknown"}: ${error.message}`)
      .join("; ")}`,
  );
}

async function loadProducts(client: ShopifyAdminClient) {
  const response = await client.query<{ nodes: Array<ProductNode | null> }>(
    productQuery,
    { ids: [...targetIds] },
  );
  const products = response.nodes.filter(
    (product): product is ProductNode => product !== null,
  );
  if (products.length !== targetIds.length) {
    throw new Error(
      `Expected ${targetIds.length} iPhone 17 products, received ${products.length}.`,
    );
  }
  for (const product of products) {
    if (!/^(iPhone 17(?: Pro(?: Max)?)?|iPhone Air) Back Glass Full Assembly \(With Coil\) - (A Grade|Premium)$/.test(product.title)) {
      throw new Error(`Unexpected product at ${product.id}: ${product.title}`);
    }
  }
  return products;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
  const products = await loadProducts(client);
  const drafts = products.filter((product) => product.status !== "ACTIVE");

  for (const product of products) {
    console.log(`${product.status}\t${product.title}\t${product.handle}`);
  }
  if (!apply) {
    console.log(`DRY RUN: ${drafts.length} product(s) would be set ACTIVE.`);
    return;
  }

  const backupDirectory = path.resolve("data/backups");
  await mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    backupDirectory,
    `shopify-iphone17-before-review-visibility-${timestamp}.json`,
  );
  await writeFile(
    backupPath,
    `${JSON.stringify({ capturedAt: new Date().toISOString(), products }, null, 2)}\n`,
  );

  for (const product of drafts) {
    const response = await client.query<{
      productUpdate: { userErrors: MutationUserError[] };
    }>(productMutation, { product: { id: product.id, status: "ACTIVE" } });
    assertNoUserErrors(
      `Set ${product.title} active`,
      response.productUpdate.userErrors,
    );
  }

  const verified = await loadProducts(client);
  const stillHidden = verified.filter((product) => product.status !== "ACTIVE");
  if (stillHidden.length > 0) {
    throw new Error(
      `Products still not active: ${stillHidden.map((product) => product.title).join(", ")}`,
    );
  }
  console.log(`APPLIED AND VERIFIED\tbackup=${backupPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
