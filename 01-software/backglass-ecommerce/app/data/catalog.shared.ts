export interface StorefrontImage {
  height: number;
  id: number;
  position: number;
  src: string;
  variant_ids: number[];
  width: number;
}

export interface StorefrontVariant {
  available: boolean;
  compare_at_price: string | null;
  featured_image: StorefrontImage | null;
  id: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: string;
  sku: string;
  title: string;
}

export interface StorefrontProduct {
  body_html: string;
  handle: string;
  id: number;
  images: StorefrontImage[];
  product_type: string;
  published_at: string;
  tags: string[];
  title: string;
  updated_at: string;
  variants: StorefrontVariant[];
  vendor: string;
}

export interface StorefrontCatalog {
  capturedAt: string;
  currency: string;
  products: StorefrontProduct[];
  source: string;
}

export const SHOPIFY_ORIGIN = "https://kfczyu-kc.myshopify.com";
export const STORE_CURRENCY = "USD";

export const catalogCategories = [
  { label: "All products", value: "all" },
  { label: "Premium", value: "premium" },
  { label: "A Grade", value: "a-grade" },
  { label: "Half assembly", value: "half-assembly" },
  { label: "Glass only", value: "glass-only" },
] as const;

export function isHalfAssemblyProduct(product: StorefrontProduct) {
  return product.title.toLowerCase().includes("half assembly");
}

export function isFullAssemblyProduct(product: StorefrontProduct) {
  return product.title.toLowerCase().includes("full assembly");
}

export function isCustomerVisibleProduct(product: StorefrontProduct) {
  return !isFullAssemblyProduct(product);
}

export function formatMoney(value: string) {
  return new Intl.NumberFormat("en-US", {
    currency: STORE_CURRENCY,
    style: "currency",
  }).format(Number(value));
}

export function getProductPrice(product: StorefrontProduct) {
  const prices = product.variants.map((variant) => Number(variant.price));
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum
    ? formatMoney(String(minimum))
    : `${formatMoney(String(minimum))} - ${formatMoney(String(maximum))}`;
}

export function getProductImage(product: StorefrontProduct) {
  return product.images[0]?.src ?? null;
}
