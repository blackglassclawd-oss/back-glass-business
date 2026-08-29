import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductVariant {
  id: string;
  legacyResourceId: string;
  price: string;
  sku: string;
  title: string;
}

interface ProductNode {
  handle: string;
  id: string;
  legacyResourceId: string;
  status: string;
  title: string;
  variants: {
    nodes: ProductVariant[];
  };
}

interface ProductsResponse {
  nodes: Array<ProductNode | null>;
}

interface MutationUserError {
  field?: string[];
  message: string;
}

const targets = [
  {
    colors: ["Black", "White", "Mist Blue", "Lavender", "Sage"],
    id: "gid://shopify/Product/8675370991788",
    price: "12.00",
    title: "iPhone 17 Back Glass Full Assembly (With Coil) - A Grade",
  },
  {
    colors: ["Black", "White", "Mist Blue", "Lavender", "Sage"],
    id: "gid://shopify/Product/8675371090092",
    price: "18.00",
    title: "iPhone 17 Back Glass Full Assembly (With Coil) - Premium",
  },
  {
    colors: ["Silver", "Cosmic Orange", "Deep Blue"],
    id: "gid://shopify/Product/8675371352236",
    price: null,
    title: "iPhone 17 Pro Back Glass Full Assembly (With Coil) - A Grade",
  },
  {
    colors: ["Silver", "Cosmic Orange", "Deep Blue"],
    id: "gid://shopify/Product/8675371417772",
    price: "10.00",
    title: "iPhone 17 Pro Back Glass Full Assembly (With Coil) - Premium",
  },
  {
    colors: ["Silver", "Cosmic Orange", "Deep Blue"],
    id: "gid://shopify/Product/8675371516076",
    price: null,
    title: "iPhone 17 Pro Max Back Glass Full Assembly (With Coil) - A Grade",
  },
  {
    colors: ["Silver", "Cosmic Orange", "Deep Blue"],
    id: "gid://shopify/Product/8675371614380",
    price: "10.00",
    title: "iPhone 17 Pro Max Back Glass Full Assembly (With Coil) - Premium",
  },
  {
    colors: ["Space Black", "Cloud White", "Light Gold", "Sky Blue"],
    id: "gid://shopify/Product/8675371188396",
    price: null,
    title: "iPhone Air Back Glass Full Assembly (With Coil) - A Grade",
  },
  {
    colors: ["Space Black", "Cloud White", "Light Gold", "Sky Blue"],
    id: "gid://shopify/Product/8675371253932",
    price: "60.00",
    title: "iPhone Air Back Glass Full Assembly (With Coil) - Premium",
  },
] as const;

const productQuery = `#graphql
  query Iphone17TemporaryPricingProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        handle
        id
        legacyResourceId
        status
        title
        variants(first: 100) {
          nodes {
            id
            legacyResourceId
            price
            sku
            title
          }
        }
      }
    }
  }
`;

const variantMutation = `#graphql
  mutation Iphone17TemporaryVariantPrices(
    $productId: ID!
    $variants: [ProductVariantsBulkInput!]!
  ) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const productMutation = `#graphql
  mutation Iphone17TemporaryDraftStatus($product: ProductUpdateInput!) {
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

function assertNoUserErrors(
  operation: string,
  userErrors: MutationUserError[],
) {
  if (userErrors.length === 0) {
    return;
  }

  throw new Error(
    `${operation}: ${userErrors
      .map((error) => `${error.field?.join(".") ?? "unknown"}: ${error.message}`)
      .join("; ")}`,
  );
}

function validateProducts(products: ProductNode[]) {
  for (const target of targets) {
    const product = products.find((candidate) => candidate.id === target.id);
    if (!product) {
      throw new Error(`Missing Shopify product ${target.id}.`);
    }
    if (product.title !== target.title) {
      throw new Error(
        `Product ${target.id} title changed: expected "${target.title}", received "${product.title}".`,
      );
    }

    const actualColors = product.variants.nodes.map((variant) => variant.title);
    const missingColors = target.colors.filter(
      (color) => !actualColors.includes(color),
    );
    const extraColors = actualColors.filter(
      (color) => !target.colors.includes(color as never),
    );

    if (missingColors.length > 0 || extraColors.length > 0) {
      throw new Error(
        `${product.title} color mismatch. Missing: ${missingColors.join(", ") || "none"}; extra: ${extraColors.join(", ") || "none"}.`,
      );
    }
  }
}

async function loadProducts(client: ShopifyAdminClient) {
  const response = await client.query<ProductsResponse>(productQuery, {
    ids: targets.map((target) => target.id),
  });
  const products = response.nodes.filter(
    (node): node is ProductNode => node !== null,
  );
  validateProducts(products);
  return products;
}

function printPlan(products: ProductNode[]) {
  for (const target of targets) {
    const product = products.find((candidate) => candidate.id === target.id)!;
    if (target.price === null) {
      console.log(`DRAFT\t${product.title}\t${product.variants.nodes.length} colors`);
      continue;
    }

    console.log(
      `PRICE\t${product.title}\t${product.variants.nodes.length} colors\t${target.price}`,
    );
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const config = loadShopifyConfig(process.env);
  const client = new ShopifyAdminClient(config);
  const products = await loadProducts(client);

  printPlan(products);
  if (!apply) {
    console.log("DRY RUN: pass --apply to perform these exact updates.");
    return;
  }

  const backupDirectory = path.resolve("data/backups");
  await mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    backupDirectory,
    `shopify-iphone17-before-temporary-prices-${timestamp}.json`,
  );
  await writeFile(
    backupPath,
    `${JSON.stringify({ capturedAt: new Date().toISOString(), products }, null, 2)}\n`,
  );

  for (const target of targets) {
    const product = products.find((candidate) => candidate.id === target.id)!;
    if (target.price === null) {
      const response = await client.query<{
        productUpdate: {
          userErrors: MutationUserError[];
        };
      }>(productMutation, {
        product: { id: product.id, status: "DRAFT" },
      });
      assertNoUserErrors(
        `Draft ${product.title}`,
        response.productUpdate.userErrors,
      );
      continue;
    }

    const response = await client.query<{
      productVariantsBulkUpdate: {
        userErrors: MutationUserError[];
      };
    }>(variantMutation, {
      productId: product.id,
      variants: product.variants.nodes.map((variant) => ({
        id: variant.id,
        price: target.price,
      })),
    });
    assertNoUserErrors(
      `Price ${product.title}`,
      response.productVariantsBulkUpdate.userErrors,
    );
  }

  const verifiedProducts = await loadProducts(client);
  for (const target of targets) {
    const product = verifiedProducts.find(
      (candidate) => candidate.id === target.id,
    )!;
    if (target.price === null) {
      if (product.status !== "DRAFT") {
        throw new Error(`${product.title} did not move to draft.`);
      }
      continue;
    }

    const incorrect = product.variants.nodes.filter(
      (variant) => variant.price !== target.price,
    );
    if (incorrect.length > 0) {
      throw new Error(
        `${product.title} has ${incorrect.length} variants with an incorrect price.`,
      );
    }
  }

  console.log(`APPLIED AND VERIFIED\tbackup=${backupPath}`);
}

await main();
