import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import pricingDraft from "../data/pricing/draft-price-sheet-2026-07-28.json";
import productStrategy from "../data/catalog/product-strategy-2026-07-29.json";
import shopifyCorrections from "../data/catalog/shopify-corrections-2026-08-03.json";
import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductNode {
  id: string;
  resourcePublicationsV2: {
    nodes: Array<{
      isPublished: boolean;
      publication: {
        name: string;
      };
    }>;
  };
  status: string;
  title: string;
  variants: {
    nodes: Array<{
      id: string;
      image: {
        id: string;
        url: string;
      } | null;
      sku: string;
      title: string;
    }>;
  };
  variantsCount: {
    count: number;
  };
}

interface ProductsQuery {
  products: {
    nodes: ProductNode[];
  };
}

const PRODUCTS_QUERY = `#graphql
  query CatalogTransitionProducts {
    products(first: 250) {
      nodes {
        id
        title
        status
        variantsCount {
          count
        }
        variants(first: 250) {
          nodes {
            id
            title
            sku
            image {
              id
              url
            }
          }
        }
        resourcePublicationsV2(first: 20) {
          nodes {
            isPublished
            publication {
              name
            }
          }
        }
      }
    }
  }
`;

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
const data = await client.query<ProductsQuery>(PRODUCTS_QUERY);
const fullAssemblies = data.products.nodes.filter((product) =>
  product.title.toLowerCase().includes("full assembly"),
);
const halfAssemblies = data.products.nodes.filter((product) =>
  product.title.toLowerCase().includes("half assembly"),
);
const existingChargingFlex = data.products.nodes.filter((product) =>
  /wireless|charging flex|flashlight/i.test(product.title),
);
const capturedAt = new Date().toISOString();
const halfAssemblyVariantMedia = halfAssemblies.flatMap((product) =>
  product.variants.nodes.map((variant) => ({
    action: "replaceVariantFeaturedImage",
    blockingReason:
      "Verified no-coil image for this exact model, grade, and color not supplied",
    currentImage: variant.image,
    productId: product.id,
    productTitle: product.title,
    sku: variant.sku,
    variantId: variant.id,
    variantTitle: variant.title,
  })),
);

const plan = {
  capturedAt,
  deleteActions: [],
  guardrails: {
    cloudflareBlockedUntilShopifyApproval:
      shopifyCorrections.cloudflareBlockedUntilShopifyApproval,
    dryRun: true,
    executionOrder: shopifyCorrections.executionOrder,
    ownerApprovalRequiredBeforeWrites: true,
    sourceDecision: productStrategy.source,
  },
  inventory: {
    existingChargingFlexProducts: existingChargingFlex.length,
    fullAssemblyProducts: fullAssemblies.length,
    halfAssemblyProducts: halfAssemblies.length,
    halfAssemblyVariantFeaturedImages: halfAssemblyVariantMedia.filter(
      ({ currentImage }) => currentImage !== null,
    ).length,
    halfAssemblyVariants: halfAssemblyVariantMedia.length,
  },
  plannedActions: {
    annotatedMediaCorrections: shopifyCorrections.mediaCorrections,
    chargingFlexCreates: pricingDraft.rows.map((row) => ({
      action: "productCreate",
      blockingReasons: [
        row.prices.aftermarket_nfc_charging_flex === null
          ? "Aftermarket price pending"
          : null,
        row.prices.original_nfc_charging_flex === null
          ? "OEM Pull price pending"
          : null,
        "Product photography pending",
        "Starting inventory pending",
      ].filter(Boolean),
      model: row.model,
      options: [
        {
          name: productStrategy.rules.chargingFlex.optionName,
          values: productStrategy.rules.chargingFlex.options,
        },
      ],
      status: "DRAFT",
      title: `${row.model} ${productStrategy.rules.chargingFlex.title}`,
      variants: [
        {
          option: "Aftermarket",
          price: row.prices.aftermarket_nfc_charging_flex,
          sku: buildSku(row.model, "AM"),
        },
        {
          option: "OEM Pull",
          price: row.prices.original_nfc_charging_flex,
          sku: buildSku(row.model, "OEM-PULL"),
        },
      ],
    })),
    fullAssemblyUpdates: fullAssemblies.map((product) => ({
      action: "productUpdate",
      currentStatus: product.status,
      id: product.id,
      publishedChannels: product.resourcePublicationsV2.nodes
        .filter(({ isPublished }) => isPublished)
        .map(({ publication }) => publication.name)
        .sort(),
      targetStatus: "DRAFT",
      title: product.title,
      variants: product.variantsCount.count,
    })),
    halfAssemblyVariantMedia,
    metadataUpdates: shopifyCorrections.metadataUpdates,
    supplementalStatusUpdates: shopifyCorrections.statusUpdates.filter(
      (update) => update.action === "productStatusUpdate",
    ),
  },
};

const outputDirectory = resolve("backups/plans");
const timestamp = capturedAt.replaceAll(":", "-");
const outputPath = resolve(
  outputDirectory,
  `catalog-transition-${timestamp}.json`,
);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});

console.log(`Catalog transition dry-run written to ${outputPath}`);
console.log(
  `${fullAssemblies.length} full assemblies -> DRAFT; ${halfAssemblies.length} half assemblies retained; ${halfAssemblyVariantMedia.length} variant thumbnails require verified replacements; ${pricingDraft.rows.length} charging-flex drafts planned; 0 deletes.`,
);

function buildSku(model: string, source: "AM" | "OEM-PULL") {
  return `SKU-${model
    .replace(/^iPhone\s+/i, "I")
    .replaceAll(" ", "-")
    .toUpperCase()}-NFC-FLEX-${source}`;
}
