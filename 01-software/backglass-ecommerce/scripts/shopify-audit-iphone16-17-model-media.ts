import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface MediaNode {
  alt: string | null;
  id: string;
  image: {
    height: number;
    url: string;
    width: number;
  } | null;
  preview: { status: string };
}

interface ProductNode {
  featuredMedia: { id: string } | null;
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
      sku: string;
      title: string;
    }>;
  };
}

interface AuditedImage {
  alt: string | null;
  averageHash: string;
  downloadedFile: string;
  height: number;
  mediaId: string;
  model: string;
  perceptualHash: string;
  position: number;
  productHandle: string;
  productTitle: string;
  sha256: string;
  url: string;
  variantTitles: string[];
  width: number;
}

const query = `#graphql
  query IphoneModelMediaAudit($after: String) {
    products(first: 100, after: $after, sortKey: TITLE) {
      pageInfo { endCursor hasNextPage }
      nodes {
        featuredMedia { id }
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
            sku
            title
          }
        }
      }
    }
  }
`;

function modelFromTitle(title: string) {
  if (/iPhone 17 Pro Max/i.test(title)) return "iPhone 17 Pro Max";
  if (/iPhone 17 Pro/i.test(title)) return "iPhone 17 Pro";
  if (/iPhone 17\b/i.test(title)) return "iPhone 17";
  if (/iPhone Air/i.test(title)) return "iPhone Air";
  if (/iPhone 16 Pro Max/i.test(title)) return "iPhone 16 Pro Max";
  if (/iPhone 16 Pro/i.test(title)) return "iPhone 16 Pro";
  if (/iPhone 16 Plus/i.test(title)) return "iPhone 16 Plus";
  if (/iPhone 16\b/i.test(title)) return "iPhone 16";
  return "Other";
}

function bitStringToHex(bits: string) {
  return bits
    .match(/.{1,4}/g)!
    .map((nibble) => Number.parseInt(nibble.padEnd(4, "0"), 2).toString(16))
    .join("");
}

async function hashes(bytes: Buffer) {
  const normalized = await sharp(bytes)
    .flatten({ background: "white" })
    .grayscale()
    .resize(17, 16, { fit: "fill" })
    .raw()
    .toBuffer();
  let dHashBits = "";
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const offset = y * 17 + x;
      dHashBits += normalized[offset] > normalized[offset + 1] ? "1" : "0";
    }
  }

  const averagePixels = await sharp(bytes)
    .flatten({ background: "white" })
    .grayscale()
    .resize(16, 16, { fit: "fill" })
    .raw()
    .toBuffer();
  const mean = averagePixels.reduce((sum, value) => sum + value, 0) / averagePixels.length;
  const averageHashBits = [...averagePixels]
    .map((value) => (value >= mean ? "1" : "0"))
    .join("");

  return {
    averageHash: bitStringToHex(averageHashBits),
    perceptualHash: bitStringToHex(dHashBits),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function hammingHex(left: string, right: string) {
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let value = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (value > 0) {
      distance += value & 1;
      value >>= 1;
    }
  }
  return distance;
}

async function loadProducts(client: ShopifyAdminClient) {
  const products: ProductNode[] = [];
  let after: string | null = null;
  do {
    const response: {
      products: {
        nodes: ProductNode[];
        pageInfo: { endCursor: string | null; hasNextPage: boolean };
      };
    } = await client.query(query, { after });
    products.push(...response.products.nodes);
    after = response.products.pageInfo.hasNextPage
      ? response.products.pageInfo.endCursor
      : null;
  } while (after);

  return products.filter((product) => modelFromTitle(product.title) !== "Other");
}

async function main() {
  const config = loadShopifyConfig(process.env);
  const client = new ShopifyAdminClient(config);
  const products = await loadProducts(client);
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const auditDirectory = path.resolve(
    "data/backups",
    `shopify-iphone16-17-model-media-audit-${timestamp}`,
  );
  const mediaDirectory = path.join(auditDirectory, "media");
  await mkdir(mediaDirectory, { recursive: true });
  await writeFile(
    path.join(auditDirectory, "products.json"),
    `${JSON.stringify({ capturedAt: new Date().toISOString(), products }, null, 2)}\n`,
  );

  const images: AuditedImage[] = [];
  for (const product of products) {
    const productDirectory = path.join(mediaDirectory, product.handle);
    await mkdir(productDirectory, { recursive: true });
    for (const [index, media] of product.media.nodes.entries()) {
      if (!media.image?.url) continue;
      const response = await fetch(media.image.url);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status}): ${media.image.url}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      const extension = new URL(media.image.url).pathname.split(".").at(-1) || "jpg";
      const file = path.join(
        productDirectory,
        `${String(index + 1).padStart(2, "0")}-${media.id.split("/").at(-1)}.${extension}`,
      );
      await writeFile(file, bytes);
      images.push({
        alt: media.alt,
        ...(await hashes(bytes)),
        downloadedFile: path.relative(auditDirectory, file),
        height: media.image.height,
        mediaId: media.id,
        model: modelFromTitle(product.title),
        position: index + 1,
        productHandle: product.handle,
        productTitle: product.title,
        url: media.image.url,
        variantTitles: product.variants.nodes
          .filter((variant) => variant.media.nodes.some(({ id }) => id === media.id))
          .map((variant) => variant.title),
        width: media.image.width,
      });
    }
  }

  const comparisons: Array<{
    averageHashDistance: number;
    exact: boolean;
    left: AuditedImage;
    perceptualHashDistance: number;
    right: AuditedImage;
  }> = [];
  for (let leftIndex = 0; leftIndex < images.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < images.length; rightIndex += 1) {
      const left = images[leftIndex];
      const right = images[rightIndex];
      if (left.model === right.model) continue;
      const exact = left.sha256 === right.sha256;
      const perceptualHashDistance = hammingHex(left.perceptualHash, right.perceptualHash);
      const averageHashDistance = hammingHex(left.averageHash, right.averageHash);
      if (exact || perceptualHashDistance <= 18 || averageHashDistance <= 18) {
        comparisons.push({
          averageHashDistance,
          exact,
          left,
          perceptualHashDistance,
          right,
        });
      }
    }
  }
  comparisons.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      a.perceptualHashDistance - b.perceptualHashDistance ||
      a.averageHashDistance - b.averageHashDistance,
  );

  const report = {
    capturedAt: new Date().toISOString(),
    counts: {
      crossModelExactDuplicates: comparisons.filter(({ exact }) => exact).length,
      crossModelSimilarityFlags: comparisons.length,
      images: images.length,
      products: products.length,
      variants: products.reduce((sum, product) => sum + product.variants.nodes.length, 0),
    },
    comparisons,
    images,
    products,
  };
  await writeFile(
    path.join(auditDirectory, "audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(JSON.stringify({ auditDirectory, ...report.counts }, null, 2));
  for (const comparison of comparisons.slice(0, 80)) {
    console.log(
      [
        comparison.exact ? "EXACT" : "SIMILAR",
        `d=${comparison.perceptualHashDistance}`,
        `a=${comparison.averageHashDistance}`,
        comparison.left.model,
        comparison.left.productHandle,
        comparison.left.variantTitles.join("|") || `position-${comparison.left.position}`,
        comparison.right.model,
        comparison.right.productHandle,
        comparison.right.variantTitles.join("|") || `position-${comparison.right.position}`,
      ].join("\t"),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
