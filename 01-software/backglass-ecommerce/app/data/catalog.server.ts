import catalogJson from "../../data/storefront/catalog.json";
import type {
  StorefrontCatalog,
  StorefrontProduct,
} from "./catalog.shared";
import {
  isCustomerVisibleProduct,
  isFullAssemblyProduct,
  isHalfAssemblyProduct,
} from "./catalog.shared";

export const catalog = catalogJson as unknown as StorefrontCatalog;
export const customerVisibleProducts = catalog.products.filter(
  isCustomerVisibleProduct,
);

export function findProduct(handle: string) {
  return catalog.products.find((product) => product.handle === handle) ?? null;
}

function matchesCategory(product: StorefrontProduct, category: string) {
  const title = product.title.toLowerCase();
  const tags = product.tags.map((tag) => tag.toLowerCase());

  switch (category) {
    case "premium":
      return tags.includes("premium");
    case "a-grade":
      return tags.includes("a grade");
    case "half-assembly":
      return isHalfAssemblyProduct(product);
    case "full-assembly":
      return isFullAssemblyProduct(product);
    case "glass-only":
      return title.includes("large hole back glass");
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
