import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import * as cheerio from "cheerio";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import {
  loadShopifyConfig,
  type ShopifyConfig,
} from "../app/services/shopify/config";

interface ProductNode {
  handle: string;
  id: string;
  legacyResourceId: string;
  status: string;
  title: string;
}

interface RestProduct {
  handle: string;
  id: number;
  product_type: string;
  published_at: string | null;
  status: string;
  tags: string;
  template_suffix: string | null;
  title: string;
  updated_at: string;
  vendor: string;
}

const allTargets = [
  ["iphone-16-half-assembly-no-coil-a-grade", 5],
  ["iphone-16-half-assembly-no-coil-premium", 5],
  ["iphone-16-plus-half-assembly-no-coil-a-grade", 5],
  ["iphone-16-plus-half-assembly-no-coil-premium", 5],
  ["iphone-16-pro-half-assembly-no-coil-a-grade", 4],
  ["iphone-16-pro-half-assembly-no-coil-premium", 4],
  ["iphone-16-pro-max-half-assembly-no-coil-a-grade", 4],
  ["iphone-16-pro-max-half-assembly-no-coil-premium", 4],
  ["iphone-17-back-glass-full-assembly-with-coil-a-grade", 5],
  ["iphone-17-back-glass-full-assembly-with-coil-premium", 5],
  ["iphone-17-pro-back-glass-full-assembly-with-coil-a-grade", 3],
  ["iphone-17-pro-back-glass-full-assembly-with-coil-premium", 3],
  ["iphone-17-pro-max-back-glass-full-assembly-with-coil-a-grade", 3],
  ["iphone-17-pro-max-back-glass-full-assembly-with-coil-premium", 3],
  ["iphone-air-back-glass-full-assembly-with-coil-a-grade", 4],
  ["iphone-air-back-glass-full-assembly-with-coil-premium", 4],
] as const;

const productQuery = `#graphql
  query GalleryCacheRefreshProduct($query: String!) {
    products(first: 10, query: $query) {
      nodes { handle id legacyResourceId status title }
    }
  }
`;

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

async function restJson<T>(
  config: ShopifyConfig,
  token: string,
  pathname: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `https://${config.storeDomain}/admin/api/${config.apiVersion}${pathname}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
        ...init.headers,
      },
    },
  );
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(
      `${init.method || "GET"} ${pathname} returned HTTP ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload as T;
}

async function loadProduct(client: ShopifyAdminClient, handle: string) {
  const response = await client.query<{ products: { nodes: ProductNode[] } }>(
    productQuery,
    { query: `handle:${handle}` },
  );
  const exact = response.products.nodes.filter((product) => product.handle === handle);
  if (exact.length !== 1) {
    throw new Error(`Expected one Shopify product for ${handle}; found ${exact.length}.`);
  }
  return exact[0];
}

async function galleryCount(handle: string) {
  const response = await fetch(
    `https://backglasspros.com/products/${handle}?canonical-gallery-cache-check=${Date.now()}`,
    {
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error(`Storefront failed for ${handle}: HTTP ${response.status}.`);
  const $ = cheerio.load(await response.text());
  return $("ul.product__media-list li.product__media-item").length;
}

function stableProduct(product: RestProduct) {
  return {
    handle: product.handle,
    id: product.id,
    product_type: product.product_type,
    published_at: product.published_at,
    status: product.status,
    tags: product.tags,
    template_suffix: product.template_suffix,
    title: product.title,
    vendor: product.vendor,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const forceTagRefresh = process.argv.includes("--force-tag-refresh");
  const onlyArgument = process.argv.find((argument) => argument.startsWith("--only="));
  const onlyHandle = onlyArgument?.slice("--only=".length);
  const targets = onlyHandle
    ? allTargets.filter(([handle]) => handle === onlyHandle)
    : [...allTargets];
  if (targets.length === 0) throw new Error(`Unknown --only target: ${onlyHandle}`);

  const config = loadShopifyConfig(process.env);
  const client = new ShopifyAdminClient(config);
  const token = await getAccessToken(config);
  const records = [];
  for (const [handle, expectedGalleryItems] of targets) {
    const product = await loadProduct(client, handle);
    const { product: restProduct } = await restJson<{ product: RestProduct }>(
      config,
      token,
      `/products/${product.legacyResourceId}.json`,
    );
    records.push({
      beforeGalleryItems: await galleryCount(handle),
      expectedGalleryItems,
      product,
      restProduct,
    });
  }

  const capturedAt = new Date().toISOString();
  const backupDirectory = path.resolve(
    "data/backups",
    `shopify-before-gallery-page-cache-refresh-${capturedAt.replaceAll(":", "-")}`,
  );
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    path.join(backupDirectory, "preflight-products.json"),
    `${JSON.stringify({ apply, capturedAt, records }, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        apply,
        backupDirectory,
        collapsedProducts: records.filter(({ beforeGalleryItems }) => beforeGalleryItems === 1).length,
        forceTagRefresh,
        targets: records.length,
      },
      null,
      2,
    ),
  );
  if (!apply) {
    console.log("DRY RUN: pass --apply to write each product's existing title back unchanged and refresh its page cache.");
    return;
  }

  const updates: Array<Record<string, unknown>> = [];
  for (const record of records) {
    if (record.beforeGalleryItems === record.expectedGalleryItems) continue;
    if (record.beforeGalleryItems !== 1) {
      throw new Error(
        `${record.product.handle} has ${record.beforeGalleryItems} gallery items; expected one or ${record.expectedGalleryItems}.`,
      );
    }
    let updated: RestProduct;
    if (forceTagRefresh) {
      const marker = "gallery-cache-refresh-2026-08-15";
      if (record.restProduct.tags.split(",").map((tag) => tag.trim()).includes(marker)) {
        throw new Error(`${record.product.handle} already has the temporary cache-refresh tag.`);
      }
      const transientTags = record.restProduct.tags
        ? `${record.restProduct.tags}, ${marker}`
        : marker;
      await restJson<{ product: RestProduct }>(
        config,
        token,
        `/products/${record.product.legacyResourceId}.json`,
        {
          method: "PUT",
          body: JSON.stringify({
            product: {
              id: Number(record.product.legacyResourceId),
              tags: transientTags,
            },
          }),
        },
      );
      ({ product: updated } = await restJson<{ product: RestProduct }>(
        config,
        token,
        `/products/${record.product.legacyResourceId}.json`,
        {
          method: "PUT",
          body: JSON.stringify({
            product: {
              id: Number(record.product.legacyResourceId),
              tags: record.restProduct.tags,
            },
          }),
        },
      ));
    } else {
      ({ product: updated } = await restJson<{ product: RestProduct }>(
        config,
        token,
        `/products/${record.product.legacyResourceId}.json`,
        {
          method: "PUT",
          body: JSON.stringify({
            product: {
              id: Number(record.product.legacyResourceId),
              title: record.restProduct.title,
            },
          }),
        },
      ));
    }
    if (JSON.stringify(stableProduct(record.restProduct)) !== JSON.stringify(stableProduct(updated))) {
      throw new Error(`Stable product fields changed for ${record.product.handle}.`);
    }
    updates.push({
      afterUpdatedAt: updated.updated_at,
      beforeUpdatedAt: record.restProduct.updated_at,
      refreshMethod: forceTagRefresh
        ? "temporary tag added and exact original tag string restored"
        : "existing title written back unchanged",
      handle: record.product.handle,
      titleUnchanged: updated.title === record.restProduct.title,
    });
  }

  let verification: Array<Record<string, unknown>> = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    verification = [];
    let allPassed = true;
    for (const record of records) {
      const actualGalleryItems = await galleryCount(record.product.handle);
      const passed = actualGalleryItems === record.expectedGalleryItems;
      verification.push({
        actualGalleryItems,
        expectedGalleryItems: record.expectedGalleryItems,
        handle: record.product.handle,
        passed,
      });
      if (!passed) allPassed = false;
    }
    if (allPassed) break;
    if (attempt === 11) {
      throw new Error(`Canonical gallery cache refresh did not propagate: ${JSON.stringify(verification)}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const result = {
    appliedAt: new Date().toISOString(),
    backupDirectory,
    productsTouchedWithIdenticalTitle: updates.length,
    updates,
    verification,
  };
  const resultPath = path.join(backupDirectory, "apply-and-verification-result.json");
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(
      path.resolve("data", "shopify-canonical-gallery-verification-2026-08-15.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    ),
  ]);
  console.log(
    `APPLIED AND VERIFIED\tproducts=${updates.length}\tresult=${resultPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
