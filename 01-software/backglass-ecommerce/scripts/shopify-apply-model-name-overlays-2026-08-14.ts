import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import {
  loadShopifyConfig,
  type ShopifyConfig,
} from "../app/services/shopify/config";

interface MediaNode {
  alt: string | null;
  id: string;
  image: { height: number; url: string; width: number } | null;
  preview: { status: string };
}

interface ProductNode {
  handle: string;
  id: string;
  legacyResourceId: string;
  media: { nodes: MediaNode[] };
  status: string;
  title: string;
  variants: {
    nodes: Array<{
      id: string;
      legacyResourceId: string;
      media: { nodes: Array<{ id: string }> };
      title: string;
    }>;
  };
}

interface RestImage {
  admin_graphql_api_id: string;
  alt: string | null;
  height: number | null;
  id: number;
  position: number;
  product_id: number;
  src: string;
  variant_ids: number[];
  width: number | null;
}

interface OverlayRecord {
  color: string;
  model: string;
  output: string;
  outputSha256: string;
}

interface ProductPlan {
  grade: "A Grade" | "Premium";
  handle: string;
  model: string;
}

const approvalRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval",
);
const overlayManifestPath = path.join(approvalRoot, "overlay-manifest.json");

const plans: ProductPlan[] = [
  { model: "iPhone 16", grade: "A Grade", handle: "iphone-16-half-assembly-no-coil-a-grade" },
  { model: "iPhone 16", grade: "Premium", handle: "iphone-16-half-assembly-no-coil-premium" },
  { model: "iPhone 16 Plus", grade: "A Grade", handle: "iphone-16-plus-half-assembly-no-coil-a-grade" },
  { model: "iPhone 16 Plus", grade: "Premium", handle: "iphone-16-plus-half-assembly-no-coil-premium" },
  { model: "iPhone 16 Pro", grade: "A Grade", handle: "iphone-16-pro-half-assembly-no-coil-a-grade" },
  { model: "iPhone 16 Pro", grade: "Premium", handle: "iphone-16-pro-half-assembly-no-coil-premium" },
  { model: "iPhone 16 Pro Max", grade: "A Grade", handle: "iphone-16-pro-max-half-assembly-no-coil-a-grade" },
  { model: "iPhone 16 Pro Max", grade: "Premium", handle: "iphone-16-pro-max-half-assembly-no-coil-premium" },
  { model: "iPhone 17 Pro", grade: "A Grade", handle: "iphone-17-pro-back-glass-full-assembly-with-coil-a-grade" },
  { model: "iPhone 17 Pro", grade: "Premium", handle: "iphone-17-pro-back-glass-full-assembly-with-coil-premium" },
  { model: "iPhone 17 Pro Max", grade: "A Grade", handle: "iphone-17-pro-max-back-glass-full-assembly-with-coil-a-grade" },
  { model: "iPhone 17 Pro Max", grade: "Premium", handle: "iphone-17-pro-max-back-glass-full-assembly-with-coil-premium" },
];

const productQuery = `#graphql
  query ModelOverlayProduct($query: String!) {
    products(first: 10, query: $query) {
      nodes {
        handle
        id
        legacyResourceId
        media(first: 100) {
          nodes {
            ... on MediaImage {
              alt
              id
              image { height url width }
              preview { status }
            }
          }
        }
        status
        title
        variants(first: 100) {
          nodes {
            id
            legacyResourceId
            media(first: 20) { nodes { id } }
            title
          }
        }
      }
    }
  }
`;

const sha256 = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

function altText(handle: string, color: string) {
  return `BGP owner-approved model-label v4 2026-08-14 | ${handle} | ${color}`;
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

async function restJson<T>(
  config: ShopifyConfig,
  token: string,
  pathname: string,
  init: RequestInit = {},
): Promise<T> {
  for (let attempt = 0; attempt < 7; attempt += 1) {
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
    if (response.status === 429 && attempt < 6) {
      const waitSeconds = Number(response.headers.get("retry-after") || "2");
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }
    const payload = (await response.json()) as T & { errors?: unknown };
    if (!response.ok) {
      throw new Error(
        `${init.method || "GET"} ${pathname} returned HTTP ${response.status}: ${JSON.stringify(payload)}`,
      );
    }
    return payload;
  }
  throw new Error(`Shopify REST retries exhausted for ${pathname}.`);
}

async function loadProduct(client: ShopifyAdminClient, handle: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await client.query<{ products: { nodes: ProductNode[] } }>(
        productQuery,
        { query: `handle:${handle}` },
      );
      const exact = response.products.nodes.filter(
        (product) => product.handle === handle,
      );
      if (exact.length !== 1) {
        throw new Error(`Expected one Shopify product for ${handle}; found ${exact.length}.`);
      }
      return exact[0];
    } catch (error) {
      const throttled =
        error instanceof Error && /throttled/i.test(error.message);
      if (!throttled || attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1_000));
    }
  }
  throw new Error(`Shopify Admin retries exhausted for ${handle}.`);
}

async function imageHash(bytes: Buffer) {
  const pixels = await sharp(bytes)
    .flatten({ background: "white" })
    .grayscale()
    .resize(17, 16, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = "";
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const offset = y * 17 + x;
      bits += pixels[offset] > pixels[offset + 1] ? "1" : "0";
    }
  }
  return bits;
}

function hamming(left: string, right: string) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

async function download(url: string) {
  const response = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (plans.some(({ model }) => model === "iPhone 17")) {
    throw new Error("Base iPhone 17 must remain excluded from this operation.");
  }
  const duplicateHandles = plans.filter(
    (plan, index) => plans.findIndex(({ handle }) => handle === plan.handle) !== index,
  );
  if (duplicateHandles.length > 0) {
    throw new Error(`Duplicate handles in plan: ${duplicateHandles.map(({ handle }) => handle).join(", ")}`);
  }

  const manifest = JSON.parse(
    await readFile(overlayManifestPath, "utf8"),
  ) as { records: OverlayRecord[] };
  const config = loadShopifyConfig(process.env);
  const client = new ShopifyAdminClient(config);
  const accessToken = await getAccessToken(config);
  const products: ProductNode[] = [];
  for (const { handle } of plans) {
    products.push(await loadProduct(client, handle));
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const mappings: Array<{
    alt: string;
    color: string;
    grade: string;
    handle: string;
    image: RestImage;
    localBytes: Buffer;
    localHash: string;
    localPath: string;
    model: string;
    product: ProductNode;
    variantId: string;
  }> = [];
  const restImagesByHandle: Record<string, RestImage[]> = {};

  for (const [index, product] of products.entries()) {
    const plan = plans[index];
    if (product.status !== "ACTIVE") {
      throw new Error(`${product.title} is ${product.status}; expected ACTIVE.`);
    }
    const records = manifest.records.filter(({ model }) => model === plan.model);
    const recordColors = new Set(records.map(({ color }) => color));
    const variantColors = new Set(product.variants.nodes.map(({ title }) => title));
    const missingRecords = [...variantColors].filter((color) => !recordColors.has(color));
    const unexpectedRecords = [...recordColors].filter((color) => !variantColors.has(color));
    if (missingRecords.length > 0 || unexpectedRecords.length > 0) {
      throw new Error(
        `${product.title} color mismatch; missing local: ${missingRecords.join(", ") || "none"}; unexpected local: ${unexpectedRecords.join(", ") || "none"}.`,
      );
    }

    const restPayload = await restJson<{ images: RestImage[] }>(
      config,
      accessToken,
      `/products/${product.legacyResourceId}/images.json`,
    );
    restImagesByHandle[product.handle] = restPayload.images;
    if (restPayload.images.length !== product.variants.nodes.length) {
      throw new Error(
        `${product.title} has ${restPayload.images.length} images for ${product.variants.nodes.length} variants; refusing an ambiguous in-place replacement.`,
      );
    }

    for (const variant of product.variants.nodes) {
      const record = records.find(({ color }) => color === variant.title)!;
      const imageMatches = restPayload.images.filter((image) =>
        image.variant_ids.includes(Number(variant.legacyResourceId)),
      );
      if (imageMatches.length !== 1) {
        throw new Error(
          `${product.title} / ${variant.title} maps to ${imageMatches.length} REST images; expected one.`,
        );
      }
      const localPath = path.join(approvalRoot, record.output);
      const localBytes = await readFile(localPath);
      const metadata = await sharp(localBytes).metadata();
      if (metadata.width !== 2000 || metadata.height !== 2500) {
        throw new Error(`${localPath} is ${metadata.width}x${metadata.height}; expected 2000x2500.`);
      }
      if (sha256(localBytes) !== record.outputSha256) {
        throw new Error(`${localPath} does not match the approved overlay manifest hash.`);
      }
      mappings.push({
        alt: altText(product.handle, variant.title),
        color: variant.title,
        grade: plan.grade,
        handle: product.handle,
        image: imageMatches[0],
        localBytes,
        localHash: await imageHash(localBytes),
        localPath,
        model: plan.model,
        product,
        variantId: variant.legacyResourceId,
      });
    }
  }

  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backupDirectory = path.resolve(
    "data/backups",
    `shopify-before-model-name-overlays-${timestamp}`,
  );
  const mediaDirectory = path.join(backupDirectory, "media");
  await mkdir(mediaDirectory, { recursive: true });
  await writeFile(
    path.join(backupDirectory, "products-and-plan.json"),
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        excludedModels: ["iPhone 17"],
        overlayManifestPath,
        plans,
        products,
        restImagesByHandle,
        uploads: mappings.map((mapping) => ({
          alt: mapping.alt,
          color: mapping.color,
          handle: mapping.handle,
          imageId: mapping.image.id,
          localPath: mapping.localPath,
          localSha256: sha256(mapping.localBytes),
          model: mapping.model,
          variantId: mapping.variantId,
        })),
      },
      null,
      2,
    )}\n`,
  );
  for (const product of products) {
    const productDirectory = path.join(mediaDirectory, product.handle);
    await mkdir(productDirectory, { recursive: true });
    for (const image of restImagesByHandle[product.handle]) {
      const bytes = await download(image.src);
      const extension = new URL(image.src).pathname.split(".").at(-1) || "jpg";
      await writeFile(
        path.join(
          productDirectory,
          `${String(image.position).padStart(2, "0")}-${image.id}.${extension}`,
        ),
        bytes,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        apply,
        backupDirectory,
        excludedModels: ["iPhone 17"],
        products: products.length,
        uploads: mappings.length,
      },
      null,
      2,
    ),
  );
  for (const mapping of mappings) {
    console.log(
      `PLAN\t${mapping.product.title}\t${mapping.color}\timage=${mapping.image.id}\tposition=${mapping.image.position}`,
    );
  }
  if (!apply) {
    console.log("DRY RUN: pass --apply to update these exact existing image records in place.");
    return;
  }

  const applied: Array<{
    color: string;
    handle: string;
    imageId: number;
    responseImageId: number;
  }> = [];
  for (const [index, mapping] of mappings.entries()) {
    const payload = await restJson<{ image: RestImage }>(
      config,
      accessToken,
      `/products/${mapping.product.legacyResourceId}/images/${mapping.image.id}.json`,
      {
        method: "PUT",
        body: JSON.stringify({
          image: {
            id: mapping.image.id,
            alt: mapping.alt,
            attachment: mapping.localBytes.toString("base64"),
            filename: path.basename(mapping.localPath),
          },
        }),
      },
    );
    applied.push({
      color: mapping.color,
      handle: mapping.handle,
      imageId: mapping.image.id,
      responseImageId: payload.image.id,
    });
    console.log(
      `UPDATED ${index + 1}/${mappings.length}\t${mapping.product.title}\t${mapping.color}\timage=${payload.image.id}`,
    );
  }

  const adminVerification: Array<Record<string, unknown>> = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    adminVerification.length = 0;
    let allReady = true;
    for (const [index, plan] of plans.entries()) {
      const product = await loadProduct(client, plan.handle);
      const expected = mappings.filter(({ handle }) => handle === plan.handle);
      for (const mapping of expected) {
        const variant = product.variants.nodes.find(
          ({ title }) => title === mapping.color,
        );
        const media = product.media.nodes.find(
          ({ alt }) => alt === mapping.alt,
        );
        const assigned =
          !!variant && !!media && variant.media.nodes.some(({ id }) => id === media.id);
        const ready =
          assigned &&
          media?.preview.status === "READY" &&
          media.image?.width === 2000 &&
          media.image?.height === 2500;
        adminVerification.push({
          assigned,
          color: mapping.color,
          handle: plan.handle,
          height: media?.image?.height ?? null,
          ready,
          status: media?.preview.status ?? "missing",
          width: media?.image?.width ?? null,
        });
        if (!ready) allReady = false;
      }
      if (product.status !== products[index].status) {
        throw new Error(`${product.title} status changed from ${products[index].status} to ${product.status}.`);
      }
    }
    if (allReady) break;
    if (attempt === 19) {
      throw new Error("Shopify media did not reach READY with correct variant assignments within 60 seconds.");
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }

  const storefrontVerification: Array<Record<string, unknown>> = [];
  for (const plan of plans) {
    const response = await fetch(
      `https://backglasspros.com/products/${plan.handle}.js?t=${Date.now()}`,
      { headers: { "Cache-Control": "no-cache" } },
    );
    if (!response.ok) {
      throw new Error(`Public product JSON failed for ${plan.handle}: HTTP ${response.status}.`);
    }
    const product = (await response.json()) as {
      available: boolean;
      handle: string;
      variants: Array<{
        featured_image?: { src?: string } | null;
        public_title?: string | null;
        title: string;
      }>;
    };
    for (const mapping of mappings.filter(({ handle }) => handle === plan.handle)) {
      const variant = product.variants.find(
        ({ title }) => title === mapping.color,
      );
      const src = variant?.featured_image?.src;
      if (!src) {
        throw new Error(`No public featured image for ${plan.handle} / ${mapping.color}.`);
      }
      const publicBytes = await download(src);
      const distance = hamming(mapping.localHash, await imageHash(publicBytes));
      const metadata = await sharp(publicBytes).metadata();
      if (distance > 8 || metadata.width !== 2000 || metadata.height !== 2500) {
        throw new Error(
          `Public mismatch for ${plan.handle} / ${mapping.color}: dHash=${distance}, ${metadata.width}x${metadata.height}.`,
        );
      }
      storefrontVerification.push({
        color: mapping.color,
        dHashDistance: distance,
        handle: plan.handle,
        height: metadata.height,
        src,
        width: metadata.width,
      });
    }
  }

  const result = {
    appliedAt: new Date().toISOString(),
    backupDirectory,
    excludedModels: ["iPhone 17"],
    shopifyProductsUpdated: plans.length,
    shopifyVariantImagesUpdated: mappings.length,
    adminVerification,
    storefrontVerification,
    applied,
  };
  const resultPath = path.join(
    approvalRoot,
    "shopify-apply-result-excluding-iphone-17.json",
  );
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(
      path.join(backupDirectory, "apply-result.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    ),
  ]);
  console.log(
    `APPLIED AND VERIFIED\tproducts=${plans.length}\tvariantImages=${mappings.length}\texcluded=iPhone 17\tresult=${resultPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
