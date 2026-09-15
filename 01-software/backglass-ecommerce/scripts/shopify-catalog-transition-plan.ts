import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import coilCatalog from "../data/catalog/wireless-charging-coils-2026-08-29.json";
import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";

interface ProductNode {
  handle: string;
  id: string;
  resourcePublicationsV2: {
    nodes: Array<{
      isPublished: boolean;
      publication: { name: string };
    }>;
  };
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  title: string;
  variants: {
    nodes: Array<{ price: string }>;
  };
  variantsCount: { count: number };
}

interface CollectionNode {
  handle: string;
  id: string;
  productsCount: { count: number };
  ruleSet: {
    appliedDisjunctively: boolean;
    rules: Array<{ column: string; condition: string; relation: string }>;
  } | null;
  title: string;
}

interface CatalogTransitionQuery {
  collectionByHandle: CollectionNode | null;
  products: { nodes: ProductNode[] };
}

const EXTEND_COLLECTION_HANDLE =
  "do-not-delete-all-products-generated-by-extend-commerce";

const CATALOG_TRANSITION_QUERY = `#graphql
  query CatalogTransition($extendHandle: String!) {
    products(first: 250) {
      nodes {
        handle
        id
        status
        title
        variantsCount { count }
        variants(first: 250) { nodes { price } }
        resourcePublicationsV2(first: 20) {
          nodes {
            isPublished
            publication { name }
          }
        }
      }
    }
    collectionByHandle(handle: $extendHandle) {
      handle
      id
      title
      productsCount { count }
      ruleSet {
        appliedDisjunctively
        rules { column condition relation }
      }
    }
  }
`;

const client = new ShopifyAdminClient(loadShopifyConfig(process.env));
const data = await client.query<CatalogTransitionQuery>(
  CATALOG_TRANSITION_QUERY,
  { extendHandle: EXTEND_COLLECTION_HANDLE },
);
const fullAssemblies = data.products.nodes.filter((product) =>
  /full assembly|\(with coil\)/i.test(product.title),
);
const capturedAt = new Date().toISOString();

const plan = {
  capturedAt,
  deleteActions: [],
  dependencies: {
    extendCommerceAllProductsCollection: {
      action: "PRESERVE_UNCHANGED",
      exists: Boolean(data.collectionByHandle),
      handle: EXTEND_COLLECTION_HANDLE,
      id: data.collectionByHandle?.id ?? null,
      products: data.collectionByHandle?.productsCount.count ?? null,
      ruleSet: data.collectionByHandle?.ruleSet ?? null,
      title: data.collectionByHandle?.title ?? null,
    },
  },
  guardrails: {
    chargingCoilsRemainDraft: true,
    dryRun: true,
    fullAssemblyHistoryPreserved: true,
    ownerApprovalRequiredBeforeWrites: true,
    supplierReferenceMediaPublished: false,
  },
  inventory: {
    activeFullAssemblyProducts: fullAssemblies.filter(
      (product) => product.status === "ACTIVE",
    ).length,
    activeZeroDollarFullAssemblyProducts: fullAssemblies.filter(
      (product) =>
        product.status === "ACTIVE" &&
        product.variants.nodes.some((variant) => Number(variant.price) === 0),
    ).length,
    coilDraftProductsPlanned:
      coilCatalog.models.length * coilCatalog.grades.length,
    coilModelsBlocked: coilCatalog.blockedModels.length,
    fullAssemblyProducts: fullAssemblies.length,
  },
  plannedActions: {
    blockedCoilModels: coilCatalog.blockedModels,
    chargingCoilDraftCreates: coilCatalog.models.flatMap((model) =>
      coilCatalog.grades.map((grade) => ({
        action: "productCreate",
        blockers: coilCatalog.requiredBeforePublication,
        compatibility: null,
        grade,
        handle: null,
        includedComponents: null,
        inventory: null,
        media: null,
        model: model.model,
        price: null,
        productType: coilCatalog.productType,
        sku: null,
        status: "DRAFT",
        title: `${model.model} Wireless Charging Coil - ${grade}`,
      })),
    ),
    fullAssemblyStatusUpdates: fullAssemblies.map((product) => ({
      action: "productUpdate",
      actionRequired: product.status !== "DRAFT",
      currentStatus: product.status,
      handle: product.handle,
      id: product.id,
      publishedChannels: product.resourcePublicationsV2.nodes
        .filter(({ isPublished }) => isPublished)
        .map(({ publication }) => publication.name)
        .sort(),
      targetStatus: "DRAFT",
      title: product.title,
      variants: product.variantsCount.count,
    })),
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
  `${fullAssemblies.length} full assemblies -> DRAFT (${plan.inventory.activeFullAssemblyProducts} currently ACTIVE; ${plan.inventory.activeZeroDollarFullAssemblyProducts} ACTIVE with a zero-dollar variant); ${plan.inventory.coilDraftProductsPlanned} standalone coil drafts planned; ${plan.inventory.coilModelsBlocked} models blocked; Extend collection preserved; 0 deletes.`,
);
