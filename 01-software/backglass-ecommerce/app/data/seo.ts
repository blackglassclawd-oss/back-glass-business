import type { StorefrontProduct } from "./catalog.shared";
import { productDescription, type ProductInformation } from "./product-information";
export const PUBLIC_ORIGIN = "https://backglasspros.com";
export function canonicalUrl(path: string) {
  const url = new URL(path, PUBLIC_ORIGIN);
  if (url.origin !== PUBLIC_ORIGIN) throw new Error("Canonical must use the public storefront origin");
  url.search = ""; url.hash = "";
  return url.href;
}
export function seoMeta(title: string, description: string, path: string) {
  return [{ title }, { name: "description", content: description },
    { tagName: "link" as const, rel: "canonical", href: canonicalUrl(path) },
    // This application is preview-only; Shopify owns public indexability.
    { name: "robots", content: "noindex, nofollow" }];
}
export function organizationSchema() {
  return { "@context": "https://schema.org", "@type": "Organization", "@id": `${PUBLIC_ORIGIN}/#organization`, name: "Back Glass Pros", url: `${PUBLIC_ORIGIN}/` };
}
export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: canonicalUrl(item.path) })) };
}
export function productSchema(product: StorefrontProduct, facts: ProductInformation) {
  if (!facts.partType || facts.partType === "retired-full-assembly") return null;
  const url = canonicalUrl(`/products/${product.handle}`);
  return { "@context": "https://schema.org", "@type": "ProductGroup", "@id": `${url}#product`, url,
    name: product.title, description: productDescription(facts), productGroupID: String(product.id),
    hasVariant: product.variants.map(v => ({ "@type": "Product", "@id": `${url}?variant=${v.id}#variant`,
      name: `${product.title} — ${v.title}`, url: `${url}?variant=${v.id}`, ...(v.sku?.trim() ? { sku: v.sku.trim() } : {}),
      isVariantOf: { "@id": `${url}#product` },
    })),
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
