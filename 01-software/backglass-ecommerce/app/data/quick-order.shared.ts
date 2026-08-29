import type { StorefrontProduct } from "./catalog.shared";

export interface QuickOrderLine {
  quantity: number;
  sku: string;
  variantId: number;
}

export interface ParsedQuickOrder {
  errors: string[];
  lines: QuickOrderLine[];
}

export function parseQuickOrder(
  value: string,
  products: StorefrontProduct[],
): ParsedQuickOrder {
  const variantsBySku = new Map(
    products.flatMap((product) =>
      product.variants.map((variant) => [variant.sku.toUpperCase(), variant]),
    ),
  );
  const quantities = new Map<number, QuickOrderLine>();
  const errors: string[] = [];

  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const match = line.match(/^(.+?)(?:\s*[,;\t]\s*|\s+)(\d+)$/);
      if (!match) {
        errors.push(`Line ${index + 1}: use SKU, quantity`);
        return;
      }

      const sku = match[1].trim().toUpperCase();
      const quantity = Number(match[2]);
      const variant = variantsBySku.get(sku);

      if (!variant) {
        errors.push(`Line ${index + 1}: SKU not found (${match[1].trim()})`);
        return;
      }
      if (!variant.available) {
        errors.push(`Line ${index + 1}: SKU is unavailable (${variant.sku})`);
        return;
      }
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        errors.push(`Line ${index + 1}: quantity must be at least 1`);
        return;
      }

      const existing = quantities.get(variant.id);
      quantities.set(variant.id, {
        quantity: (existing?.quantity ?? 0) + quantity,
        sku: variant.sku,
        variantId: variant.id,
      });
    });

  return { errors, lines: [...quantities.values()] };
}

export function buildShopifyCartUrl(
  origin: string,
  lines: QuickOrderLine[],
) {
  const cart = lines
    .filter((line) => line.quantity > 0)
    .map((line) => `${line.variantId}:${line.quantity}`)
    .join(",");

  return `${origin}/cart/${cart}`;
}
