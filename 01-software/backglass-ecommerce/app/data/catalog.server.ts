import catalogJson from "../../data/storefront/catalog.json";
import { belongsToCollection, isCollectionSlug } from "./collection-content";
import type {
  StorefrontCatalog,
  StorefrontProduct,
} from "./catalog.shared";
import {
  isFullAssemblyProduct,
  isSellableProduct,
} from "./catalog.shared";
import {
  coilCatalogModels,
  coilDraftProducts,
  compareCatalogModels,
  getModelFamily,
  getModelSlug,
  getProductModel,
  type CatalogModel,
  type CoilDraftProduct,
} from "./product-taxonomy";

export interface ShopifyCatalogEntry {
  family: string;
  kind: "shopify";
  model: string;
  modelSlug: string;
  product: StorefrontProduct;
  productType: "Back Glass";
  title: string;
}

export type CatalogEntry = ShopifyCatalogEntry | CoilDraftProduct;

export const catalog = catalogJson as unknown as StorefrontCatalog;
export const customerVisibleProducts = catalog.products.filter(
  isSellableProduct,
);

export const shopifyCatalogEntries: ShopifyCatalogEntry[] =
  customerVisibleProducts.flatMap((product) => {
    const model = getProductModel(product);
    if (!model) return [];
    return [
      {
        family: getModelFamily(model),
        kind: "shopify" as const,
        model,
        modelSlug: getModelSlug(model),
        product,
        productType: "Back Glass" as const,
        title: product.title,
      },
    ];
  });

export const catalogEntries: CatalogEntry[] = [
  ...shopifyCatalogEntries,
  ...coilDraftProducts,
].sort(compareCatalogEntries);

export const catalogModels: CatalogModel[] = [
  ...new Map(
    [
      ...shopifyCatalogEntries.map((entry) => ({
        family: entry.family,
        model: entry.model,
        slug: entry.modelSlug,
      })),
      ...coilCatalogModels,
    ].map((entry) => [
      entry.slug,
      {
        family: entry.family,
        model: entry.model,
        slug: entry.slug,
      },
    ]),
  ).values(),
].sort(compareCatalogModels);

export function findProduct(handle: string) {
  return catalog.products.find((product) => product.handle === handle) ?? null;
}

function matchesCategory(product: StorefrontProduct, category: string) {
  if (isCollectionSlug(category)) return belongsToCollection(product, category);
  const tags = product.tags.map((tag) => tag.toLowerCase());

  switch (category) {
    case "back-glass":
      return true;
    case "premium":
      return tags.includes("premium");
    case "a-grade":
      return tags.includes("a grade");
    case "full-assembly":
      return isFullAssemblyProduct(product);
    default:
      return true;
  }
}

export function filterProducts(query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return customerVisibleProducts.filter((product) => {
    const searchable = [
      product.title,
      product.vendor,
      product.product_type,
      ...product.tags,
      ...product.variants.map((variant) => variant.sku),
    ]
      .join(" ")
      .toLowerCase();
    return (
      matchesCategory(product, category) &&
      (!normalizedQuery || searchable.includes(normalizedQuery))
    );
  });
}

export function filterCatalogEntries(query: string, category: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return catalogEntries.filter((entry) => {
    if (entry.kind === "shopify") {
      if (category === "wireless-charging-coils" || category === "oem" || category === "aftermarket") {
        return false;
      }
      return (
        matchesCategory(entry.product, category) &&
        (!normalizedQuery || getShopifySearchText(entry.product).includes(normalizedQuery))
      );
    }

    if (
      category === "back-glass" ||
      category === "premium" ||
      category === "a-grade"
    ) {
      return false;
    }
    if (category === "oem" && entry.grade !== "OEM") return false;
    if (category === "aftermarket" && entry.grade !== "Aftermarket") return false;
    return (
      !normalizedQuery ||
      [entry.title, entry.model, entry.productType, entry.grade]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  });
}

export function findCatalogModel(slug: string) {
  return catalogModels.find((model) => model.slug === slug) ?? null;
}

export function getBackGlassProductsForModel(model: string) {
  return shopifyCatalogEntries
    .filter((entry) => entry.model === model)
    .map((entry) => entry.product);
}

export function getCoilDraftsForModel(model: string) {
  return coilDraftProducts.filter((entry) => entry.model === model);
}

function getShopifySearchText(product: StorefrontProduct) {
  return [
    product.title,
    product.vendor,
    product.product_type,
    ...product.tags,
    ...product.variants.map((variant) => variant.sku),
  ]
    .join(" ")
    .toLowerCase();
}

function compareCatalogEntries(left: CatalogEntry, right: CatalogEntry) {
  const modelOrder = compareCatalogModels(
    { family: left.family, model: left.model, slug: left.modelSlug },
    { family: right.family, model: right.model, slug: right.modelSlug },
  );
  if (modelOrder !== 0) return modelOrder;
  if (left.kind !== right.kind) return left.kind === "shopify" ? -1 : 1;
  if (left.kind === "coil-draft" && right.kind === "coil-draft") {
    return left.grade === "OEM" ? -1 : right.grade === "OEM" ? 1 : 0;
  }
  return left.title.localeCompare(right.title);
}
