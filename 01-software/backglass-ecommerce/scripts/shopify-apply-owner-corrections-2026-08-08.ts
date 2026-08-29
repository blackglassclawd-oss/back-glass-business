import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import {
  loadShopifyConfig,
  type ShopifyConfig,
} from "../app/services/shopify/config";

interface UserError {
  field?: string[];
  message: string;
}

interface MediaNode {
  alt: string | null;
  id: string;
  image: {
    height: number;
    url: string;
    width: number;
  } | null;
  preview: {
    status: string;
  };
}

interface VariantNode {
  id: string;
  legacyResourceId: string;
  media: {
    nodes: Array<Pick<MediaNode, "id">>;
  };
  sku: string;
  title: string;
}

interface ProductNode {
  featuredMedia: Pick<MediaNode, "alt" | "id" | "image"> | null;
  handle: string;
  id: string;
  legacyResourceId: string;
  media: {
    nodes: MediaNode[];
  };
  status: string;
  title: string;
  variants: {
    nodes: VariantNode[];
  };
}

interface ProductPlan {
  handle: string;
  heroVariant: string;
  replacements: Record<string, string>;
}

const assetRoot = path.resolve(
  "public/product-media/shopify-corrections-2026-08-08",
);

const productPlans: ProductPlan[] = [
  {
    handle: "iphone-15-pro-max-half-assembly-no-coil-premium",
    heroVariant: "Titanium Natural",
    replacements: {
      "Titanium Natural": "iphone-15-pro-max-premium-natural-hero.png",
    },
  },
  {
    handle: "iphone-15-pro-max-half-assembly-no-coil-a-grade",
    heroVariant: "Titanium Natural",
    replacements: {
      "Titanium Natural": "iphone-15-pro-max-a-grade-natural-hero.png",
      "Titanium Black": "../shopify-corrections-2026-08-06/iphone-15-pro-max-black.jpg",
      "Titanium Blue": "../shopify-corrections-2026-08-06/iphone-15-pro-max-blue.jpg",
      "Titanium White": "iphone-15-pro-max-a-grade-white.jpg",
    },
  },
  {
    handle: "iphone-16-pro-max-half-assembly-no-coil-premium",
    heroVariant: "Desert Titanium",
    replacements: {
      "Desert Titanium": "iphone-16-pro-max-premium-desert-hero.png",
    },
  },
  {
    handle: "iphone-se-2nd-gen-large-hole-back-glass-premium",
    heroVariant: "(Product)RED",
    replacements: {
      "(Product)RED": "iphone-se-2nd-gen-premium-red-hero.png",
      White: "iphone-se-2nd-gen-premium-white.png",
      Black: "iphone-se-2nd-gen-premium-black.png",
    },
  },
  {
    handle: "iphone-8-large-hole-back-glass-premium",
    heroVariant: "Red",
    replacements: {
      Red: "iphone-8-premium-red-hero.png",
      Gold: "iphone-8-premium-gold.png",
      White: "iphone-8-premium-white.png",
      Black: "iphone-8-premium-black.png",
    },
  },
];

const deleteHandle = "iphone-xs-max-large-hole-back-glass-a-grade";

const productQuery = `#graphql
  query OwnerCorrectionProduct($query: String!) {
    products(first: 10, query: $query) {
      nodes {
        featuredMedia {
          ... on MediaImage {
            alt
            id
            image {
              height
              url
              width
            }
          }
        }
        handle
        id
        legacyResourceId
        media(first: 100) {
          nodes {
            ... on MediaImage {
              alt
              id
              image {
                height
                url
                width
              }
              preview {
                status
              }
            }
          }
        }
        status
        title
        variants(first: 100) {
          nodes {
            id
            legacyResourceId
            media(first: 20) {
              nodes {
                id
              }
            }
            sku
            title
          }
        }
      }
    }
  }
`;

const reorderMutation = `#graphql
  mutation OwnerCorrectionReorderMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job {
        id
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

const deleteMediaMutation = `#graphql
  mutation OwnerCorrectionDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
    productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
      deletedMediaIds
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

const deleteMutation = `#graphql
  mutation OwnerCorrectionDeleteProduct($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

function assertNoErrors(operation: string, errors: UserError[]) {
  if (errors.length === 0) {
    return;
  }

  throw new Error(
    `${operation}: ${errors
      .map((error) => `${error.field?.join(".") ?? "unknown"}: ${error.message}`)
      .join("; ")}`,
  );
}

async function loadProduct(
  client: ShopifyAdminClient,
  handle: string,
  required = true,
) {
  const response = await client.query<{
    products: { nodes: ProductNode[] };
  }>(productQuery, { query: `handle:${handle}` });
  const exact = response.products.nodes.filter(
    (product) => product.handle === handle,
  );

  if (exact.length > 1) {
    throw new Error(`Multiple Shopify products matched ${handle}.`);
  }
  if (required && exact.length !== 1) {
    throw new Error(`Shopify product ${handle} was not found.`);
  }

  return exact[0] ?? null;
}

function validateProduct(product: ProductNode, plan: ProductPlan) {
  const actualVariants = new Set(
    product.variants.nodes.map((variant) => variant.title),
  );
  const plannedVariants = Object.keys(plan.replacements);
  const missing = plannedVariants.filter(
    (variant) => !actualVariants.has(variant),
  );

  if (missing.length > 0) {
    throw new Error(
      `${product.title} is missing variants: ${missing.join(", ")}.`,
    );
  }
  if (!plannedVariants.includes(plan.heroVariant)) {
    throw new Error(`${plan.handle} hero variant has no replacement asset.`);
  }
}

async function getAccessToken(config: ShopifyConfig) {
  const response = await fetch(
    `https://${config.storeDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "client_credentials",
      }),
    },
  );
  const payload = (await response.json()) as { access_token?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Shopify token request returned HTTP ${response.status}.`);
  }
  return payload.access_token;
}

async function addReplacementMedia(
  config: ShopifyConfig,
  accessToken: string,
  product: ProductNode,
  plan: ProductPlan,
) {
  const uploaded = new Map<string, string>();

  for (const [variant, relativeFile] of Object.entries(plan.replacements)) {
    const filePath = path.resolve(assetRoot, relativeFile);
    const targetVariant = product.variants.nodes.find(
      (candidate) => candidate.title === variant,
    );
    if (!targetVariant) {
      throw new Error(`No Shopify variant found for ${product.title} / ${variant}.`);
    }
    const alt = `BGP correction 2026-08-08 | ${product.handle} | ${variant}`;
    const response = await fetch(
      `https://${config.storeDomain}/admin/api/${config.apiVersion}/products/${product.legacyResourceId}/images.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          image: {
            alt,
            attachment: (await readFile(filePath)).toString("base64"),
            filename: path.basename(filePath),
            ...(variant === plan.heroVariant ? { position: 1 } : {}),
            variant_ids: [Number(targetVariant.legacyResourceId)],
          },
        }),
      },
    );
    const payload = (await response.json()) as {
      errors?: unknown;
      image?: { admin_graphql_api_id?: string };
    };
    if (!response.ok || !payload.image?.admin_graphql_api_id) {
      throw new Error(
        `Upload ${path.basename(filePath)} failed with HTTP ${response.status}: ${JSON.stringify(payload.errors ?? payload)}.`,
      );
    }
    uploaded.set(variant, payload.image.admin_graphql_api_id);
    console.log(`UPLOADED\t${product.title}\t${variant}`);
  }

  return uploaded;
}

async function reorderHero(
  client: ShopifyAdminClient,
  product: ProductNode,
  plan: ProductPlan,
  uploaded: Map<string, string>,
) {
  const heroId = uploaded.get(plan.heroVariant);
  if (!heroId) {
    throw new Error(`No hero media found for ${product.title}.`);
  }
  const reordered = await client.query<{
    productReorderMedia: {
      mediaUserErrors: UserError[];
    };
  }>(reorderMutation, {
    id: product.id,
    moves: [{ id: heroId, newPosition: "0" }],
  });
  assertNoErrors(
    `Reorder hero media for ${product.title}`,
    reordered.productReorderMedia.mediaUserErrors,
  );
}

async function deleteSupersededMedia(
  client: ShopifyAdminClient,
  product: ProductNode,
  plan: ProductPlan,
) {
  const replacementTitles = new Set(Object.keys(plan.replacements));
  const retainedMediaIds = new Set(
    product.variants.nodes
      .filter((variant) => !replacementTitles.has(variant.title))
      .flatMap((variant) => variant.media.nodes.map((media) => media.id)),
  );
  const oldMediaIds = new Set(
    product.variants.nodes
      .filter((variant) => replacementTitles.has(variant.title))
      .flatMap((variant) => variant.media.nodes.map((media) => media.id))
      .filter((id) => !retainedMediaIds.has(id)),
  );

  if (oldMediaIds.size === 0) {
    return;
  }
  const response = await client.query<{
    productDeleteMedia: {
      deletedMediaIds: string[];
      mediaUserErrors: UserError[];
    };
  }>(deleteMediaMutation, {
    mediaIds: [...oldMediaIds],
    productId: product.id,
  });
  assertNoErrors(
    `Delete superseded media from ${product.title}`,
    response.productDeleteMedia.mediaUserErrors,
  );
  if (response.productDeleteMedia.deletedMediaIds.length !== oldMediaIds.size) {
    throw new Error(
      `${product.title} deleted ${response.productDeleteMedia.deletedMediaIds.length} old media records; expected ${oldMediaIds.size}.`,
    );
  }
  console.log(`REMOVED OLD MEDIA\t${product.title}\t${oldMediaIds.size}`);
}

async function downloadExistingMedia(
  products: ProductNode[],
  backupDirectory: string,
) {
  for (const product of products) {
    const productDirectory = path.join(backupDirectory, product.handle);
    await mkdir(productDirectory, { recursive: true });
    for (const [index, media] of product.media.nodes.entries()) {
      if (!media.image?.url) {
        continue;
      }
      const extension = new URL(media.image.url).pathname.split(".").at(-1) || "jpg";
      const response = await fetch(media.image.url);
      if (!response.ok) {
        throw new Error(
          `Could not back up ${product.handle} media ${media.id}: HTTP ${response.status}.`,
        );
      }
      await writeFile(
        path.join(productDirectory, `${String(index + 1).padStart(2, "0")}-${media.id.split("/").at(-1)}.${extension}`),
        Buffer.from(await response.arrayBuffer()),
      );
    }
  }
}

async function waitForVerification(
  client: ShopifyAdminClient,
  plans: ProductPlan[],
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const products = await Promise.all(
      plans.map((plan) => loadProduct(client, plan.handle)),
    );
    const ready = products.every((product, index) => {
      if (!product) {
        return false;
      }
      const plan = plans[index];
      const expectedHero = `BGP correction 2026-08-08 | ${plan.handle} | ${plan.heroVariant}`;
      const variantMediaCorrect = Object.keys(plan.replacements).every((title) => {
        const variant = product.variants.nodes.find(
          (candidate) => candidate.title === title,
        );
        return variant?.media.nodes.some((media) =>
          product.media.nodes.some(
            (candidate) =>
              candidate.id === media.id &&
              candidate.alt === `BGP correction 2026-08-08 | ${plan.handle} | ${title}` &&
              candidate.preview.status === "READY",
          ),
        );
      });
      return product.featuredMedia?.alt === expectedHero && variantMediaCorrect;
    });
    if (ready) {
      return products as ProductNode[];
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  throw new Error("Shopify media processing or reordering did not finish within 60 seconds.");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const config = loadShopifyConfig(process.env);
  const client = new ShopifyAdminClient(config);
  const products = await Promise.all(
    productPlans.map((plan) => loadProduct(client, plan.handle)),
  );
  const deleteProduct = await loadProduct(client, deleteHandle);
  const exactProducts = products.map((product, index) => {
    if (!product) {
      throw new Error(`Missing ${productPlans[index].handle}.`);
    }
    validateProduct(product, productPlans[index]);
    return product;
  });

  for (const [index, product] of exactProducts.entries()) {
    const plan = productPlans[index];
    console.log(
      `MEDIA\t${product.title}\t${Object.keys(plan.replacements).join(", ")}\thero=${plan.heroVariant}`,
    );
  }
  console.log(`DELETE\t${deleteProduct!.title}\t${deleteProduct!.id}`);
  if (!apply) {
    console.log("DRY RUN: pass --apply to perform these exact corrections.");
    return;
  }

  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupDirectory = path.resolve(
    "data/backups",
    `shopify-owner-corrections-before-2026-08-08-${timestamp}`,
  );
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    path.join(backupDirectory, "products.json"),
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        deleteProduct,
        products: exactProducts,
      },
      null,
      2,
    )}\n`,
  );
  await downloadExistingMedia(
    [...exactProducts, deleteProduct!],
    path.join(backupDirectory, "media"),
  );
  console.log(`BACKUP\t${backupDirectory}`);

  const accessToken = await getAccessToken(config);
  for (const [index, product] of exactProducts.entries()) {
    const plan = productPlans[index];
    const uploaded = await addReplacementMedia(
      config,
      accessToken,
      product,
      plan,
    );
    await reorderHero(client, product, plan, uploaded);
  }

  const verified = await waitForVerification(client, productPlans);
  for (const product of verified) {
    console.log(
      `VERIFIED\t${product.title}\t${product.featuredMedia?.alt ?? "no hero"}`,
    );
  }

  for (const [index, product] of exactProducts.entries()) {
    await deleteSupersededMedia(
      client,
      product,
      productPlans[index],
    );
  }

  const deleted = await client.query<{
    productDelete: {
      deletedProductId: string | null;
      userErrors: UserError[];
    };
  }>(deleteMutation, { input: { id: deleteProduct!.id } });
  assertNoErrors(
    `Delete ${deleteProduct!.title}`,
    deleted.productDelete.userErrors,
  );
  if (deleted.productDelete.deletedProductId !== deleteProduct!.id) {
    throw new Error(`${deleteProduct!.title} was not deleted.`);
  }
  if (await loadProduct(client, deleteHandle, false)) {
    throw new Error(`${deleteProduct!.title} still exists after deletion.`);
  }
  console.log(`VERIFIED DELETE\t${deleteProduct!.title}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
