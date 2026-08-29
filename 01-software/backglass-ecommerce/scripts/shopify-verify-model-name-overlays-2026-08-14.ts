import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

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

interface OverlayRecord {
  color: string;
  model: string;
  output: string;
  outputSha256: string;
}

const approvalRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval",
);
const overlayManifestPath = path.join(approvalRoot, "overlay-manifest.json");
const preflightProductsPath = path.resolve(
  "data/backups/shopify-iphone16-17-model-media-audit-2026-08-14T14-07-15.191Z/products.json",
);
const resultPath = path.join(
  approvalRoot,
  "shopify-verification-result-excluding-iphone-17.json",
);

const targets = [
  ["iPhone 16", "iphone-16-half-assembly-no-coil-a-grade"],
  ["iPhone 16", "iphone-16-half-assembly-no-coil-premium"],
  ["iPhone 16 Plus", "iphone-16-plus-half-assembly-no-coil-a-grade"],
  ["iPhone 16 Plus", "iphone-16-plus-half-assembly-no-coil-premium"],
  ["iPhone 16 Pro", "iphone-16-pro-half-assembly-no-coil-a-grade"],
  ["iPhone 16 Pro", "iphone-16-pro-half-assembly-no-coil-premium"],
  ["iPhone 16 Pro Max", "iphone-16-pro-max-half-assembly-no-coil-a-grade"],
  ["iPhone 16 Pro Max", "iphone-16-pro-max-half-assembly-no-coil-premium"],
  ["iPhone 17 Pro", "iphone-17-pro-back-glass-full-assembly-with-coil-a-grade"],
  ["iPhone 17 Pro", "iphone-17-pro-back-glass-full-assembly-with-coil-premium"],
  ["iPhone 17 Pro Max", "iphone-17-pro-max-back-glass-full-assembly-with-coil-a-grade"],
  ["iPhone 17 Pro Max", "iphone-17-pro-max-back-glass-full-assembly-with-coil-premium"],
] as const;

const excludedBaseHandles = [
  "iphone-17-back-glass-full-assembly-with-coil-a-grade",
  "iphone-17-back-glass-full-assembly-with-coil-premium",
] as const;

const productQuery = `#graphql
  query ModelOverlayVerificationProduct($query: String!) {
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

function expectedAlt(handle: string, color: string) {
  return `BGP owner-approved model-label v4 2026-08-14 | ${handle} | ${color}`;
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
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1_000));
    }
  }
  throw new Error(`Shopify Admin retries exhausted for ${handle}.`);
}

async function download(url: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error(`Download retries exhausted: ${url}`);
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
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) distance += 1;
  }
  return distance;
}

function stableMedia(product: ProductNode) {
  return product.media.nodes
    .map((media) => ({
      alt: media.alt,
      height: media.image?.height ?? null,
      id: media.id,
      status: media.preview.status,
      url: media.image?.url ?? null,
      width: media.image?.width ?? null,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function stableAssignments(product: ProductNode) {
  return product.variants.nodes
    .map((variant) => ({
      mediaIds: variant.media.nodes.map(({ id }) => id).sort(),
      title: variant.title,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));
}

async function main() {
  if (targets.map(([model]) => String(model)).includes("iPhone 17")) {
    throw new Error("Base iPhone 17 must remain excluded from verification targets.");
  }

  const manifest = JSON.parse(await readFile(overlayManifestPath, "utf8")) as {
    records: OverlayRecord[];
  };
  const preflight = JSON.parse(await readFile(preflightProductsPath, "utf8")) as {
    capturedAt: string;
    products: ProductNode[];
  };
  const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
  const adminVerification: Array<Record<string, unknown>> = [];
  const storefrontJobs: Array<() => Promise<Record<string, unknown>>> = [];

  for (const [model, handle] of targets) {
    const product = await loadProduct(client, handle);
    if (product.status !== "ACTIVE") {
      throw new Error(`${handle} is ${product.status}; expected ACTIVE.`);
    }
    const records = manifest.records.filter((record) => record.model === model);
    for (const variant of product.variants.nodes) {
      const record = records.find(({ color }) => color === variant.title);
      if (!record) throw new Error(`No approved local record for ${handle} / ${variant.title}.`);
      const alt = expectedAlt(handle, variant.title);
      const assignedMediaIds = variant.media.nodes.map(({ id }) => id);
      const media = product.media.nodes.find((node) => assignedMediaIds.includes(node.id));
      const ownerApprovedAlt =
        media?.alt?.startsWith("BGP owner-approved model-label v4 2026-08-14 |") === true &&
        media.alt.endsWith(`| ${variant.title}`);
      const assigned = !!media && assignedMediaIds.length === 1;
      const passed =
        assigned &&
        ownerApprovedAlt &&
        media?.preview.status === "READY" &&
        media.image?.width === 2000 &&
        media.image?.height === 2500;
      adminVerification.push({
        assigned,
        actualAlt: media?.alt ?? null,
        color: variant.title,
        handle,
        height: media?.image?.height ?? null,
        passed,
        ownerApprovedAlt,
        status: media?.preview.status ?? "missing",
        width: media?.image?.width ?? null,
      });
      if (!passed) {
        throw new Error(
          `Admin verification failed for ${handle} / ${variant.title}: ${JSON.stringify({
            availableAlts: product.media.nodes.map(({ alt, id, image, preview }) => ({
              alt,
              height: image?.height ?? null,
              id,
              status: preview.status,
              width: image?.width ?? null,
            })),
            expectedAlt: alt,
            variantMediaIds: assignedMediaIds,
          })}`,
        );
      }

      storefrontJobs.push(
        async () => {
          const response = await fetch(
            `https://backglasspros.com/products/${handle}.js?t=${Date.now()}`,
            { headers: { "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(30_000) },
          );
          if (!response.ok) {
            throw new Error(`Public product JSON failed for ${handle}: HTTP ${response.status}.`);
          }
          const publicProduct = (await response.json()) as {
            variants: Array<{
              featured_image?: {
                alt?: string | null;
                height?: number;
                src?: string;
                width?: number;
              } | null;
              featured_media?: { id?: number } | null;
              title: string;
            }>;
          };
          const publicVariant = publicProduct.variants.find(({ title }) => title === variant.title);
          const publicImage = publicVariant?.featured_image;
          const src = publicImage?.src;
          if (!src) throw new Error(`No public featured image for ${handle} / ${variant.title}.`);
          const publicMediaMatchesAdmin =
            String(publicVariant?.featured_media?.id ?? "") === media.id.split("/").at(-1);
          const thumbnailUrl = new URL(src);
          thumbnailUrl.searchParams.set("width", "800");
          const [localBytes, publicBytes] = await Promise.all([
            readFile(path.join(approvalRoot, record.output)),
            download(thumbnailUrl.toString()),
          ]);
          const [localHash, publicHash] = await Promise.all([
            imageHash(localBytes),
            imageHash(publicBytes),
          ]);
          const distance = hamming(localHash, publicHash);
          const passed =
            distance <= 24 &&
            publicImage?.width === 2000 &&
            publicImage.height === 2500 &&
            publicMediaMatchesAdmin;
          if (!passed) {
            throw new Error(
              `Public mismatch for ${handle} / ${variant.title}: dHash=${distance}, ${publicImage?.width}x${publicImage?.height}.`,
            );
          }
          return {
            color: variant.title,
            dHashDistance: distance,
            handle,
            height: publicImage.height,
            passed,
            publicMediaMatchesAdmin,
            publicMediaId: publicVariant?.featured_media?.id ?? null,
            src,
            width: publicImage.width,
          };
        },
      );
    }
  }

  const storefrontVerification: Array<Record<string, unknown>> = [];
  for (let index = 0; index < storefrontJobs.length; index += 6) {
    storefrontVerification.push(
      ...(await Promise.all(
        storefrontJobs.slice(index, index + 6).map((job) => job()),
      )),
    );
  }

  const excludedBaseVerification: Array<Record<string, unknown>> = [];
  for (const handle of excludedBaseHandles) {
    const before = preflight.products.find((product) => product.handle === handle);
    if (!before) throw new Error(`Preflight snapshot is missing excluded ${handle}.`);
    const live = await loadProduct(client, handle);
    const mediaUnchanged =
      JSON.stringify(stableMedia(live)) === JSON.stringify(stableMedia(before));
    const assignmentsUnchanged =
      JSON.stringify(stableAssignments(live)) === JSON.stringify(stableAssignments(before));
    const identityUnchanged =
      live.id === before.id && live.status === before.status && live.title === before.title;
    const hasApprovedOverlayAlt = live.media.nodes.some(({ alt }) =>
      alt?.startsWith("BGP owner-approved model-label v4 2026-08-14"),
    );
    const passed =
      mediaUnchanged && assignmentsUnchanged && identityUnchanged && !hasApprovedOverlayAlt;
    excludedBaseVerification.push({
      assignmentsUnchanged,
      handle,
      hasApprovedOverlayAlt,
      identityUnchanged,
      mediaUnchanged,
      passed,
      preflightCapturedAt: preflight.capturedAt,
    });
    if (!passed) throw new Error(`Excluded base iPhone 17 changed unexpectedly: ${handle}.`);
  }

  const result = {
    excludedBaseVerification,
    excludedModels: ["iPhone 17"],
    finalResult: "passed",
    shopifyProductsVerified: targets.length,
    shopifyVariantImagesVerified: adminVerification.length,
    verifiedAt: new Date().toISOString(),
    adminVerification,
    storefrontVerification,
  };
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `VERIFIED\tproducts=${targets.length}\tvariantImages=${adminVerification.length}\tstorefront=${storefrontVerification.length}\texcludedBase=${excludedBaseVerification.length}\tresult=${resultPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
