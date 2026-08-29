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
  height: number;
  model: string;
  output: string;
  outputSha256: string;
  shopifyUploaded: boolean;
  width: number;
}

const approvalRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17-separate-search/2026-08-15/approved-model-name-overlay",
);
const manifestPath = path.join(
  approvalRoot,
  "approved-iphone17-overlay-manifest.json",
);
const plans = [
  {
    grade: "A Grade",
    handle: "iphone-17-back-glass-full-assembly-with-coil-a-grade",
  },
  {
    grade: "Premium",
    handle: "iphone-17-back-glass-full-assembly-with-coil-premium",
  },
] as const;

const productQuery = `#graphql
  query ApprovedIphone17OverlayProduct($query: String!) {
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

function altText(color: string) {
  return `BGP owner-approved iPhone 17 model-label v5 2026-08-15 | ${color}`;
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
      const throttled = error instanceof Error && /throttled/i.test(error.message);
      if (!throttled || attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
    }
  }
  throw new Error(`Shopify Admin retries exhausted for ${handle}.`);
}

async function download(url: string) {
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
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

async function main() {
  const apply = process.argv.includes("--apply");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    model: string;
    records: OverlayRecord[];
    rules: {
      aiGenerated: boolean;
      crossModelReuse: boolean;
      ownerApprovedBaseline: boolean;
      recolored: boolean;
      shopifyUploaded: boolean;
    };
    status: string;
  };
  if (
    manifest.model !== "iPhone 17" ||
    manifest.status !== "owner-approved-ready-for-shopify" ||
    !manifest.rules.ownerApprovedBaseline ||
    manifest.rules.aiGenerated ||
    manifest.rules.recolored ||
    manifest.rules.crossModelReuse
  ) {
    throw new Error("The local iPhone 17 manifest does not satisfy the owner-approved publishing gate.");
  }
  if (manifest.records.length !== 5) {
    throw new Error(`Expected five approved iPhone 17 colors; found ${manifest.records.length}.`);
  }

  const localByColor = new Map<
    string,
    OverlayRecord & { bytes: Buffer; dHash: string; localPath: string }
  >();
  for (const record of manifest.records) {
    const localPath = path.join(approvalRoot, record.output);
    const bytes = await readFile(localPath);
    const metadata = await sharp(bytes).metadata();
    if (
      sha256(bytes) !== record.outputSha256 ||
      metadata.width !== 2000 ||
      metadata.height !== 2500
    ) {
      throw new Error(`Approved local image validation failed for ${record.color}: ${localPath}`);
    }
    localByColor.set(record.color, {
      ...record,
      bytes,
      dHash: await imageHash(bytes),
      localPath,
    });
  }

  const config = loadShopifyConfig(process.env);
  const client = new ShopifyAdminClient(config);
  const token = await getAccessToken(config);
  const products: ProductNode[] = [];
  const restImagesByHandle: Record<string, RestImage[]> = {};
  for (const plan of plans) {
    const product = await loadProduct(client, plan.handle);
    if (product.status !== "ACTIVE") {
      throw new Error(`${product.title} is ${product.status}; expected ACTIVE.`);
    }
    if (product.variants.nodes.length !== 5 || product.media.nodes.length !== 5) {
      throw new Error(
        `${product.title} has ${product.variants.nodes.length} variants and ${product.media.nodes.length} media; expected five of each.`,
      );
    }
    const variantColors = new Set(product.variants.nodes.map(({ title }) => title));
    const missing = [...variantColors].filter((color) => !localByColor.has(color));
    const unexpected = [...localByColor.keys()].filter((color) => !variantColors.has(color));
    if (missing.length > 0 || unexpected.length > 0) {
      throw new Error(
        `${product.title} color mismatch; missing=${missing.join(",") || "none"}; unexpected=${unexpected.join(",") || "none"}.`,
      );
    }
    const restPayload = await restJson<{ images: RestImage[] }>(
      config,
      token,
      `/products/${product.legacyResourceId}/images.json`,
    );
    if (restPayload.images.length !== 5) {
      throw new Error(`${product.title} REST media count is ${restPayload.images.length}; expected five.`);
    }
    products.push(product);
    restImagesByHandle[product.handle] = restPayload.images;
  }

  const mappings = products.flatMap((product) =>
    product.variants.nodes.map((variant) => {
      const assignedIds = variant.media.nodes.map(({ id }) => id);
      if (assignedIds.length !== 1) {
        throw new Error(`${product.title} / ${variant.title} has ${assignedIds.length} assigned media.`);
      }
      const restMatches = restImagesByHandle[product.handle].filter(
        (image) =>
          image.variant_ids.includes(Number(variant.legacyResourceId)) &&
          image.admin_graphql_api_id === assignedIds[0],
      );
      if (restMatches.length !== 1) {
        throw new Error(
          `${product.title} / ${variant.title} maps to ${restMatches.length} exact REST media records.`,
        );
      }
      const local = localByColor.get(variant.title)!;
      return {
        color: variant.title,
        graphqlMediaId: assignedIds[0],
        local,
        product,
        restImage: restMatches[0],
        variantId: variant.legacyResourceId,
      };
    }),
  );

  const updateByGraphqlMediaId = new Map<string, (typeof mappings)[number]>();
  for (const mapping of mappings) {
    const existing = updateByGraphqlMediaId.get(mapping.graphqlMediaId);
    if (existing && existing.color !== mapping.color) {
      throw new Error(
        `Shared media ${mapping.graphqlMediaId} is assigned to conflicting colors: ${existing.color} and ${mapping.color}.`,
      );
    }
    updateByGraphqlMediaId.set(mapping.graphqlMediaId, existing ?? mapping);
  }
  if (updateByGraphqlMediaId.size !== 5) {
    throw new Error(
      `Expected the two grade products to share five exact color media records; found ${updateByGraphqlMediaId.size}.`,
    );
  }

  const capturedAt = new Date().toISOString();
  const backupDirectory = path.resolve(
    "data/backups",
    `shopify-before-approved-iphone17-overlays-${capturedAt.replaceAll(":", "-")}`,
  );
  const mediaDirectory = path.join(backupDirectory, "media");
  await mkdir(mediaDirectory, { recursive: true });
  await writeFile(
    path.join(backupDirectory, "products-plan-and-rest-images.json"),
    `${JSON.stringify(
      {
        capturedAt,
        manifestPath,
        plans,
        products,
        restImagesByHandle,
        uniqueUpdates: [...updateByGraphqlMediaId.values()].map((mapping) => ({
          color: mapping.color,
          graphqlMediaId: mapping.graphqlMediaId,
          localPath: mapping.local.localPath,
          localSha256: mapping.local.outputSha256,
          productHandleUsedForUpdate: mapping.product.handle,
          restImageId: mapping.restImage.id,
        })),
      },
      null,
      2,
    )}\n`,
  );
  for (const [graphqlMediaId, mapping] of updateByGraphqlMediaId) {
    const bytes = await download(mapping.restImage.src);
    const extension = new URL(mapping.restImage.src).pathname.split(".").at(-1) || "jpg";
    await writeFile(
      path.join(mediaDirectory, `${mapping.color.replaceAll(" ", "-")}-${graphqlMediaId.split("/").at(-1)}.${extension}`),
      bytes,
    );
  }

  console.log(
    JSON.stringify(
      {
        apply,
        backupDirectory,
        products: products.length,
        uniqueSharedMediaUpdates: updateByGraphqlMediaId.size,
        variantAssignmentsCovered: mappings.length,
      },
      null,
      2,
    ),
  );
  for (const mapping of updateByGraphqlMediaId.values()) {
    console.log(
      `PLAN\t${mapping.color}\tmedia=${mapping.graphqlMediaId}\tREST=${mapping.restImage.id}\tvia=${mapping.product.handle}`,
    );
  }
  if (!apply) {
    console.log("DRY RUN: pass --apply to replace these five exact shared media files in place.");
    return;
  }

  const applied: Array<Record<string, unknown>> = [];
  let completed = 0;
  for (const mapping of updateByGraphqlMediaId.values()) {
    const payload = await restJson<{ image: RestImage }>(
      config,
      token,
      `/products/${mapping.product.legacyResourceId}/images/${mapping.restImage.id}.json`,
      {
        method: "PUT",
        body: JSON.stringify({
          image: {
            id: mapping.restImage.id,
            alt: altText(mapping.color),
            attachment: mapping.local.bytes.toString("base64"),
            filename: path.basename(mapping.local.localPath),
          },
        }),
      },
    );
    completed += 1;
    applied.push({
      color: mapping.color,
      graphqlMediaId: mapping.graphqlMediaId,
      requestImageId: mapping.restImage.id,
      responseImageId: payload.image.id,
    });
    console.log(`UPDATED ${completed}/${updateByGraphqlMediaId.size}\t${mapping.color}\timage=${payload.image.id}`);
  }

  const adminVerification: Array<Record<string, unknown>> = [];
  let verifiedProducts: ProductNode[] = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    adminVerification.length = 0;
    verifiedProducts = [];
    let allReady = true;
    for (const plan of plans) {
      const product = await loadProduct(client, plan.handle);
      verifiedProducts.push(product);
      for (const variant of product.variants.nodes) {
        const assignedIds = variant.media.nodes.map(({ id }) => id);
        const media = product.media.nodes.find(({ id }) => assignedIds.includes(id));
        const passed =
          assignedIds.length === 1 &&
          media?.alt === altText(variant.title) &&
          media.preview.status === "READY" &&
          media.image?.width === 2000 &&
          media.image?.height === 2500;
        adminVerification.push({
          assignedMediaIds: assignedIds,
          color: variant.title,
          handle: product.handle,
          height: media?.image?.height ?? null,
          passed,
          status: media?.preview.status ?? "missing",
          width: media?.image?.width ?? null,
        });
        if (!passed) allReady = false;
      }
    }
    if (allReady) break;
    if (attempt === 19) {
      throw new Error("Shopify iPhone 17 media did not reach the verified READY state within 60 seconds.");
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const storefrontVerification: Array<Record<string, unknown>> = [];
  for (const plan of plans) {
    const response = await fetch(
      `https://backglasspros.com/products/${plan.handle}.js?t=${Date.now()}`,
      { headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(30_000) },
    );
    if (!response.ok) {
      throw new Error(`Public product JSON failed for ${plan.handle}: HTTP ${response.status}.`);
    }
    const product = (await response.json()) as {
      available: boolean;
      variants: Array<{
        featured_image?: { alt?: string | null; height?: number; src?: string; width?: number } | null;
        title: string;
      }>;
    };
    for (const variant of product.variants) {
      const local = localByColor.get(variant.title);
      const image = variant.featured_image;
      if (!local || !image?.src) {
        throw new Error(`Missing public iPhone 17 media for ${plan.handle} / ${variant.title}.`);
      }
      const publicBytes = await download(image.src);
      const metadata = await sharp(publicBytes).metadata();
      const distance = hamming(local.dHash, await imageHash(publicBytes));
      const passed =
        image.alt === altText(variant.title) &&
        metadata.width === 2000 &&
        metadata.height === 2500 &&
        distance <= 8;
      storefrontVerification.push({
        alt: image.alt ?? null,
        color: variant.title,
        dHashDistance: distance,
        handle: plan.handle,
        height: metadata.height,
        passed,
        src: image.src,
        width: metadata.width,
      });
      if (!passed) {
        throw new Error(
          `Public verification failed for ${plan.handle} / ${variant.title}: dHash=${distance}, ${metadata.width}x${metadata.height}, alt=${image.alt}.`,
        );
      }
    }
  }

  const completedAt = new Date().toISOString();
  const result = {
    appliedAt: completedAt,
    backupDirectory,
    productsUpdated: plans.length,
    uniqueSharedMediaUpdated: updateByGraphqlMediaId.size,
    variantAssignmentsVerified: mappings.length,
    applied,
    adminVerification,
    storefrontVerification,
  };
  const resultPath = path.join(approvalRoot, "shopify-publish-verification-result.json");
  manifest.status = "owner-approved-published-and-verified";
  manifest.rules.shopifyUploaded = true;
  for (const record of manifest.records) record.shopifyUploaded = true;
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(path.join(backupDirectory, "apply-result.json"), `${JSON.stringify(result, null, 2)}\n`),
    writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`),
  ]);
  console.log(
    `APPLIED AND VERIFIED\tproducts=${plans.length}\tsharedMedia=${updateByGraphqlMediaId.size}\tvariantAssignments=${mappings.length}\tresult=${resultPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
