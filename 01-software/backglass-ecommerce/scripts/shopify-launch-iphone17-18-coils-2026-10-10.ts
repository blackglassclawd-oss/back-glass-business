import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

// Applies data/catalog/launch-iphone17-18-coils-2026-10-10.json.
// Dry run by default; pass --apply to write. Only approvedPrice values are
// ever written, and a product goes ACTIVE only when every variant has one.

interface Variant {
  id: string;
  price: string;
  sku: string | null;
  title: string;
}

interface Product {
  handle: string;
  id: string;
  resourcePublicationsCount: { count: number };
  status: string;
  title: string;
  variants: { nodes: Variant[] };
}

interface MutationUserError {
  field?: string[];
  message: string;
}

interface Manifest {
  coils: {
    products: Array<{
      approvedPrice: string | null;
      handle: string;
      sku: string;
    }>;
  };
  iphone17HalfAssemblies: {
    products: Array<{ approvedPrice: string | null; handle: string }>;
  };
  iphone18Drafts: {
    products: Array<{
      handle: string;
      productType: string;
      tags: string[];
      title: string;
      variants: Array<{ color: string | null; sku: string }>;
    }>;
  };
}

const NEW_ARRIVALS_ID = "gid://shopify/Collection/309419933868";
const NEW_ARRIVALS_TITLES = ["iPhone 16", "iPhone 17", "iPhone Air", "iPhone 18"];
const IPHONE17_TITLE_FIXES: Record<string, string> = {
  "iphone-17-pro-max-half-assembly-no-coil-a-grade":
    "iPhone 17 Pro Max Back Glass Half Assembly (No Coil) - A Grade",
};

const productQuery = `#graphql
  query LaunchProduct($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      handle
      title
      status
      resourcePublicationsCount { count }
      variants(first: 20) { nodes { id title sku price } }
    }
  }
`;

const publicationsQuery = `#graphql
  query LaunchPublications { publications(first: 20) { nodes { id } } }
`;

const productSetMutation = `#graphql
  mutation LaunchProductSet($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle status }
      userErrors { field message }
    }
  }
`;

const publishMutation = `#graphql
  mutation LaunchPublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

const productMutation = `#graphql
  mutation LaunchStatus($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id status title }
      userErrors { field message }
    }
  }
`;

const variantMutation = `#graphql
  mutation LaunchVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id sku price }
      userErrors { field message }
    }
  }
`;

const collectionMutation = `#graphql
  mutation LaunchCollection($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id title }
      userErrors { field message }
    }
  }
`;

function assertNoUserErrors(operation: string, userErrors: MutationUserError[]) {
  if (userErrors.length === 0) {
    return;
  }

  throw new Error(
    `${operation}: ${userErrors
      .map((error) => `${error.field?.join(".") ?? "unknown"}: ${error.message}`)
      .join("; ")}`,
  );
}

function isApproved(price: string | null): price is string {
  return price !== null && Number(price) > 0;
}

async function loadProduct(client: ShopifyAdminClient, handle: string) {
  const response = await client.query<{ productByIdentifier: Product | null }>(
    productQuery,
    { handle },
  );
  return response.productByIdentifier;
}

async function requireProduct(client: ShopifyAdminClient, handle: string) {
  const product = await loadProduct(client, handle);
  if (!product) {
    throw new Error(`Missing Shopify product ${handle}.`);
  }
  return product;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const manifest = JSON.parse(
    await readFile("data/catalog/launch-iphone17-18-coils-2026-10-10.json", "utf8"),
  ) as Manifest;
  const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
  const publications = (
    await client.query<{ publications: { nodes: Array<{ id: string }> } }>(
      publicationsQuery,
    )
  ).publications.nodes.map((publication) => ({ publicationId: publication.id }));

  const iphone17 = await Promise.all(
    manifest.iphone17HalfAssemblies.products.map(async (entry) => ({
      entry,
      product: await requireProduct(client, entry.handle),
    })),
  );
  const coils = await Promise.all(
    manifest.coils.products.map(async (entry) => ({
      entry,
      product: await requireProduct(client, entry.handle),
    })),
  );
  const iphone18 = await Promise.all(
    manifest.iphone18Drafts.products.map(async (entry) => ({
      entry,
      product: await loadProduct(client, entry.handle),
    })),
  );

  const iphone17Ready = iphone17.every(({ entry }) => isApproved(entry.approvedPrice));
  for (const { entry, product } of iphone17) {
    const skuFixes = product.variants.nodes.filter((variant) => variant.sku?.endsWith("-FA"));
    console.log(
      `I17\t${product.title}\tSKU fixes=${skuFixes.length}\t${
        iphone17Ready ? `ACTIVE at ${entry.approvedPrice}` : "stays DRAFT"
      }`,
    );
  }
  for (const { entry, product } of iphone18) {
    console.log(`I18\t${entry.title}\t${product ? "exists, skipped" : "create DRAFT"}`);
  }
  for (const { entry, product } of coils) {
    console.log(
      `COIL\t${product.title}\tsku=${entry.sku}\t${
        isApproved(entry.approvedPrice) ? `ACTIVE at ${entry.approvedPrice}` : "stays DRAFT"
      }`,
    );
  }
  console.log(`COLLECTION\tNew Arrivals matches: ${NEW_ARRIVALS_TITLES.join(", ")}`);

  if (!apply) {
    console.log("DRY RUN: pass --apply to perform these exact updates.");
    return;
  }

  const backupDirectory = path.resolve("data/backups");
  await mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupPath = path.join(
    backupDirectory,
    `shopify-before-launch-iphone17-18-coils-${timestamp}.json`,
  );
  await writeFile(
    backupPath,
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        coils: coils.map(({ product }) => product),
        iphone17: iphone17.map(({ product }) => product),
      },
      null,
      2,
    )}\n`,
  );

  for (const { entry, product } of iphone17) {
    const response = await client.query<{
      productVariantsBulkUpdate: { userErrors: MutationUserError[] };
    }>(variantMutation, {
      productId: product.id,
      variants: product.variants.nodes.map((variant) => ({
        id: variant.id,
        inventoryItem: { sku: variant.sku?.replace(/-FA$/, "-HA") },
        ...(iphone17Ready ? { price: entry.approvedPrice } : {}),
      })),
    });
    assertNoUserErrors(`Variants ${product.title}`, response.productVariantsBulkUpdate.userErrors);

    const title = IPHONE17_TITLE_FIXES[product.handle];
    if (title || iphone17Ready) {
      const update = await client.query<{
        productUpdate: { userErrors: MutationUserError[] };
      }>(productMutation, {
        product: {
          id: product.id,
          ...(title ? { title } : {}),
          ...(iphone17Ready ? { status: "ACTIVE" } : {}),
        },
      });
      assertNoUserErrors(`Update ${product.title}`, update.productUpdate.userErrors);
    }
    if (iphone17Ready) {
      const publish = await client.query<{
        publishablePublish: { userErrors: MutationUserError[] };
      }>(publishMutation, { id: product.id, input: publications });
      assertNoUserErrors(`Publish ${product.title}`, publish.publishablePublish.userErrors);
    }
  }

  for (const { entry, product } of iphone18) {
    if (product) {
      continue;
    }
    const hasColor = entry.variants.every((variant) => variant.color !== null);
    const optionName = hasColor ? "Color" : "Title";
    const values = entry.variants.map((variant) => variant.color ?? "Default Title");
    const response = await client.query<{
      productSet: { userErrors: MutationUserError[] };
    }>(productSetMutation, {
      input: {
        handle: entry.handle,
        productOptions: [{ name: optionName, values: values.map((name) => ({ name })) }],
        productType: entry.productType,
        status: "DRAFT",
        tags: entry.tags,
        title: entry.title,
        variants: entry.variants.map((variant, index) => ({
          inventoryPolicy: "DENY",
          optionValues: [{ name: values[index], optionName }],
          price: "0.00",
          sku: variant.sku,
        })),
      },
    });
    assertNoUserErrors(`Create ${entry.title}`, response.productSet.userErrors);
  }

  for (const { entry, product } of coils) {
    const approved = isApproved(entry.approvedPrice);
    const response = await client.query<{
      productVariantsBulkUpdate: { userErrors: MutationUserError[] };
    }>(variantMutation, {
      productId: product.id,
      variants: product.variants.nodes.map((variant) => ({
        id: variant.id,
        inventoryItem: { sku: entry.sku },
        ...(approved ? { price: entry.approvedPrice } : {}),
      })),
    });
    assertNoUserErrors(`Variants ${product.title}`, response.productVariantsBulkUpdate.userErrors);
    if (!approved) {
      continue;
    }

    const update = await client.query<{
      productUpdate: { userErrors: MutationUserError[] };
    }>(productMutation, { product: { id: product.id, status: "ACTIVE" } });
    assertNoUserErrors(`Activate ${product.title}`, update.productUpdate.userErrors);
    const publish = await client.query<{
      publishablePublish: { userErrors: MutationUserError[] };
    }>(publishMutation, { id: product.id, input: publications });
    assertNoUserErrors(`Publish ${product.title}`, publish.publishablePublish.userErrors);
  }

  const collection = await client.query<{
    collectionUpdate: { userErrors: MutationUserError[] };
  }>(collectionMutation, {
    input: {
      id: NEW_ARRIVALS_ID,
      ruleSet: {
        appliedDisjunctively: true,
        rules: NEW_ARRIVALS_TITLES.map((condition) => ({
          column: "TITLE",
          condition,
          relation: "CONTAINS",
        })),
      },
    },
  });
  assertNoUserErrors("New Arrivals", collection.collectionUpdate.userErrors);

  for (const { entry } of coils.filter(({ entry }) => isApproved(entry.approvedPrice))) {
    const product = await requireProduct(client, entry.handle);
    const wrong = product.variants.nodes.filter((variant) => variant.price !== entry.approvedPrice);
    if (product.status !== "ACTIVE" || wrong.length > 0) {
      throw new Error(`${product.title} did not verify as ACTIVE at ${entry.approvedPrice}.`);
    }
  }
  for (const { entry } of iphone18) {
    if (!(await loadProduct(client, entry.handle))) {
      throw new Error(`${entry.title} was not created.`);
    }
  }

  console.log(`APPLIED AND VERIFIED\tbackup=${backupPath}`);
}

await main();
