import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface MediaImageNode {
  id: string;
  image: {
    url: string;
  } | null;
}

interface ProductNode {
  handle: string;
  id: string;
  legacyResourceId: string;
  media: {
    nodes: MediaImageNode[];
  };
  status: string;
  title: string;
  variants: {
    nodes: Array<{
      id: string;
      media: {
        nodes: MediaImageNode[];
      };
      title: string;
    }>;
  };
}

interface ProductsQuery {
  products: {
    nodes: ProductNode[];
    pageInfo: {
      endCursor: string | null;
      hasNextPage: boolean;
    };
  };
}

const query = `#graphql
  query ProductModelMediaAudit($after: String) {
    products(first: 100, after: $after, sortKey: TITLE) {
      nodes {
        id
        legacyResourceId
        title
        handle
        status
        media(first: 100) {
          nodes {
            ... on MediaImage {
              id
              image {
                url
              }
            }
          }
        }
        variants(first: 100) {
          nodes {
            id
            title
            media(first: 1) {
              nodes {
                ... on MediaImage {
                  id
                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const models = [
  "17-pro-max",
  "17-pro",
  "17-air",
  "17",
  "16-pro-max",
  "16-pro",
  "16-plus",
  "16e",
  "16",
  "15-pro-max",
  "15-pro",
  "15-plus",
  "15",
  "14-pro-max",
  "14-pro",
  "14-plus",
  "14",
  "13-pro-max",
  "13-pro",
  "13-mini",
  "13",
  "12-pro-max",
  "12-pro",
  "12-mini",
  "12",
  "11-pro-max",
  "11-pro",
  "11",
  "xs-max",
  "xs",
  "xr",
  "x",
  "se-2nd-gen",
  "8-plus",
  "8",
] as const;

const filenameModelPatterns: Array<[string, RegExp]> = [
  ["17-pro-max", /(?:^|_)17_?pro_?max(?:_|$)/],
  ["17-pro", /(?:^|_)17_?pro(?:_|$)/],
  ["17-air", /(?:^|_)17_?air(?:_|$)/],
  ["17", /(?:^|_)17(?:_|$)/],
  ["16-pro-max", /(?:^|_)16_?pro_?max(?:_|$)/],
  ["16-pro", /(?:^|_)16_?pro(?:_|$)/],
  ["16-plus", /(?:^|_)16_?plus(?:_|$)/],
  ["16e", /(?:^|_)16e(?:_|$)/],
  ["16", /(?:^|_)16(?:_|$)/],
  ["15-pro-max", /(?:^|_)15_?pro_?max(?:_|$)/],
  ["15-pro", /(?:^|_)15_?pro(?:_|$)/],
  ["15-plus", /(?:^|_)15_?plus(?:_|$)/],
  ["15", /(?:^|_)15(?:_|$)/],
  ["14-pro-max", /(?:^|_)14_?pro_?max(?:_|$)/],
  ["14-pro", /(?:^|_)14_?pro(?:_|$)/],
  ["14-plus", /(?:^|_)14_?plus(?:_|$)/],
  ["14", /(?:^|_)14(?:_|$)/],
  ["13-pro-max", /(?:^|_)13_?pro_?max(?:_|$)/],
  ["13-pro", /(?:^|_)13_?pro(?:_|$)/],
  ["13-mini", /(?:^|_)13_?mini(?:_|$)/],
  ["13", /(?:^|_)13(?:_|$)/],
  ["12-pro-max", /(?:^|_)12_?pro_?max(?:_|$)/],
  ["12-pro", /(?:^|_)12_?pro(?:_|$)/],
  ["12-mini", /(?:^|_)12_?mini(?:_|$)/],
  ["12", /(?:^|_)12(?:_|$)/],
  ["11-pro-max", /(?:^|_)11_?pro_?max(?:_|$)/],
  ["11-pro", /(?:^|_)11_?pro(?:_|$)/],
  ["11", /(?:^|_)11(?:_|$)/],
  ["xs-max", /(?:^|_)xs_?max(?:_|$)/],
  ["xs", /(?:^|_)xs(?:_|$)/],
  ["xr", /(?:^|_)xr(?:_|$)/],
  ["8-se-combined", /(?:^|_)8_?se(?:_|$)/],
  ["se-2nd-gen", /(?:^|_)se_?2(?:_|$)/],
  ["8-plus", /(?:^|_)8_?plus(?:_|$)/],
  ["8", /(?:^|_)8(?:_|$)/],
];

function basename(url: string) {
  return decodeURIComponent(new URL(url).pathname.split("/").at(-1) ?? url);
}

function expectedModel(handle: string) {
  return models.find((model) => handle.startsWith(`iphone-${model}-`)) ?? null;
}

function detectedFilenameModel(url: string) {
  const normalized = basename(url)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "_");
  return filenameModelPatterns.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
const products: ProductNode[] = [];
let after: string | null = null;

do {
  const result: ProductsQuery = await client.query<ProductsQuery>(query, { after });
  products.push(...result.products.nodes);
  after = result.products.pageInfo.hasNextPage
    ? result.products.pageInfo.endCursor
    : null;
} while (after);

const findings = products.flatMap((product) => {
  const expected = expectedModel(product.handle);
  return product.media.nodes.flatMap((media, index) => {
    if (!media.image) return [];
    const detected = detectedFilenameModel(media.image.url);
    const assignedVariants = product.variants.nodes
      .filter((variant) => variant.media.nodes.some(({ id }) => id === media.id))
      .map(({ title }) => title);
    const mismatch = Boolean(
      expected &&
        detected &&
        (detected === "8-se-combined" || detected !== expected),
    );
    return mismatch
      ? [
          {
            assignedVariants,
            detected,
            expected,
            filename: basename(media.image.url),
            handle: product.handle,
            imagePosition: index + 1,
            productId: product.legacyResourceId,
            status: product.status,
            title: product.title,
            url: media.image.url,
          },
        ]
      : [];
  });
});

const report = {
  capturedAt: new Date().toISOString(),
  counts: {
    activeProducts: products.filter(({ status }) => status === "ACTIVE").length,
    assignedFindings: findings.filter(({ assignedVariants }) => assignedVariants.length > 0).length,
    draftProducts: products.filter(({ status }) => status === "DRAFT").length,
    findings: findings.length,
    images: products.reduce((sum, product) => sum + product.media.nodes.length, 0),
    products: products.length,
    variants: products.reduce((sum, product) => sum + product.variants.nodes.length, 0),
  },
  findings,
};

const outputDirectory = path.resolve("output/shopify-model-image-audit-2026-08-10");
await mkdir(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "admin-findings.json");
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report.counts, null, 2));
for (const finding of findings) {
  console.log(
    [
      finding.status,
      finding.title,
      `image ${finding.imagePosition}`,
      finding.filename,
      `expected=${finding.expected}`,
      `detected=${finding.detected}`,
      `assigned=${finding.assignedVariants.join(", ") || "none"}`,
    ].join("\t"),
  );
}
console.log(outputPath);
