import { ClipboardPaste, PackageCheck, ShoppingCart, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/quick-order";
import { StoreShell } from "../components/store-shell";
import { filterProducts } from "../data/catalog.server";
import {
  formatMoney,
  getProductPrice,
  isPurchasableVariant,
  SHOPIFY_ORIGIN,
} from "../data/catalog.shared";
import { coilDraftProducts } from "../data/product-taxonomy";
import {
  buildShopifyCartUrl,
  parseQuickOrder,
  type QuickOrderLine,
} from "../data/quick-order.shared";

export function meta() {
  return [{ title: "Quick Order | Back Glass Pros" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const partType =
    url.searchParams.get("partType") === "wireless-charging-coils"
      ? "wireless-charging-coils"
      : "back-glass";
  const normalizedQuery = query.trim().toLowerCase();
  const matchingCoilDrafts = coilDraftProducts.filter(
    (product) =>
      !normalizedQuery ||
      [product.title, product.model, product.grade]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
  );
  return {
    matchingCoilDrafts: matchingCoilDrafts.length,
    partType,
    products:
      partType === "back-glass" ? filterProducts(query, "back-glass") : [],
    query,
  };
}

export default function QuickOrder({ loaderData }: Route.ComponentProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [pasteValue, setPasteValue] = useState("");
  const [pasteErrors, setPasteErrors] = useState<string[]>([]);

  const variants = useMemo(
    () =>
      loaderData.products.flatMap((product) =>
        product.variants.map((variant) => ({
          ...variant,
          productTitle: product.title,
        })),
      ),
    [loaderData.products],
  );
  const selectedLines = useMemo<QuickOrderLine[]>(
    () =>
      variants
        .filter((variant) => (quantities[variant.id] ?? 0) > 0)
        .map((variant) => ({
          quantity: quantities[variant.id],
          sku: variant.sku,
          variantId: variant.id,
        })),
    [quantities, variants],
  );
  const selectedUnits = selectedLines.reduce(
    (total, line) => total + line.quantity,
    0,
  );
  const estimatedSubtotal = variants.reduce(
    (total, variant) =>
      total + Number(variant.price) * (quantities[variant.id] ?? 0),
    0,
  );

  function updateQuantity(variantId: number, value: string) {
    const quantity = Math.max(0, Number.parseInt(value, 10) || 0);
    setQuantities((current) => ({ ...current, [variantId]: quantity }));
  }

  function applyPastedOrder() {
    const parsed = parseQuickOrder(pasteValue, loaderData.products);
    setPasteErrors(parsed.errors);
    if (!parsed.lines.length) return;

    setQuantities((current) => {
      const next = { ...current };
      parsed.lines.forEach((line) => {
        next[line.variantId] = (next[line.variantId] ?? 0) + line.quantity;
      });
      return next;
    });
    if (!parsed.errors.length) setPasteValue("");
  }

  function openShopifyCart() {
    if (!selectedLines.length) return;
    window.location.assign(buildShopifyCartUrl(SHOPIFY_ORIGIN, selectedLines));
  }

  return (
    <StoreShell>
      <main className="quick-order-shell">
        <section className="quick-order-heading">
          <div>
            <p className="store-kicker">High-volume ordering</p>
            <h1>Quick order</h1>
            <p>Build a multi-SKU order, then review it in Shopify checkout.</p>
          </div>
          <PackageCheck aria-hidden="true" size={36} />
        </section>
        <form className="quick-search" method="get">
          <input name="partType" type="hidden" value={loaderData.partType} />
          <input
            aria-label="Search quick order catalog"
            defaultValue={loaderData.query}
            name="q"
            placeholder="Search product or SKU"
            type="search"
          />
          <button type="submit">Find parts</button>
        </form>
        <nav aria-label="Quick Order part type" className="quick-part-tabs">
          <Link
            aria-current={loaderData.partType === "back-glass" ? "page" : undefined}
            to={loaderData.query ? `/quick-order?q=${encodeURIComponent(loaderData.query)}` : "/quick-order"}
          >
            Back Glass
          </Link>
          <Link
            aria-current={
              loaderData.partType === "wireless-charging-coils"
                ? "page"
                : undefined
            }
            to={`/quick-order?partType=wireless-charging-coils${
              loaderData.query
                ? `&q=${encodeURIComponent(loaderData.query)}`
                : ""
            }`}
          >
            Wireless Charging Coils
          </Link>
        </nav>
        {loaderData.partType === "wireless-charging-coils" && (
          <section className="quick-draft-notice" role="status">
            <h2>Wireless Charging Coils are not available in Quick Order yet</h2>
            <p>
              {loaderData.matchingCoilDrafts} matching OEM and Aftermarket
              drafts are waiting for approved price, inventory, SKU, and media.
            </p>
            <Link to="/collections/wireless-charging-coils">
              Review the coil catalog
            </Link>
          </section>
        )}
        {loaderData.partType === "back-glass" && (
          <section className="quick-paste" aria-labelledby="paste-order-title">
          <div>
            <ClipboardPaste aria-hidden="true" size={20} />
            <div>
              <h2 id="paste-order-title">Paste an order list</h2>
              <p>One line per item in the format SKU, quantity.</p>
            </div>
          </div>
          <textarea
            aria-label="SKU and quantity list"
            onChange={(event) => setPasteValue(event.target.value)}
            placeholder={"SKU-I15-PRO-PREMIUM-BLACK-HA, 4\nSKU-I14-A-GRADE-BLUE-HA, 2"}
            rows={4}
            value={pasteValue}
          />
          <button onClick={applyPastedOrder} type="button">
            Add list
          </button>
          {pasteErrors.length > 0 && (
            <ul className="quick-paste-errors" role="alert">
              {pasteErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          </section>
        )}
        {loaderData.partType === "back-glass" && (
          <div className="quick-order-list" aria-live="polite">
          {loaderData.products.map((product) => (
            <article key={product.id}>
              <div className="quick-product-heading">
                <p className="product-kind">{product.product_type}</p>
                <h2>{product.title}</h2>
                <p>
                  {product.variants.length} variants · {getProductPrice(product)}
                </p>
              </div>
              <div className="quick-variant-list">
                {product.variants.map((variant) => (
                  <div className="quick-variant-row" key={variant.id}>
                    <div>
                      <strong>{variant.title}</strong>
                      <span>{variant.sku}</span>
                    </div>
                    <span>{formatMoney(variant.price)}</span>
                    <label>
                      <span className="sr-only">Quantity for {variant.sku}</span>
                      <input
                        aria-label={`Quantity for ${variant.sku}`}
                        disabled={!isPurchasableVariant(variant)}
                        inputMode="numeric"
                        min="0"
                        onChange={(event) =>
                          updateQuantity(variant.id, event.target.value)
                        }
                        type="number"
                        value={quantities[variant.id] ?? 0}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </article>
          ))}
          </div>
        )}
        {loaderData.partType === "back-glass" && !loaderData.products.length && (
          <p className="quick-empty">No products match that model or SKU.</p>
        )}
        {loaderData.partType === "back-glass" && (
          <aside className="quick-cart-bar" aria-label="Quick order summary">
          <div>
            <strong>
              {selectedUnits} {selectedUnits === 1 ? "unit" : "units"}
            </strong>
            <span>Estimated subtotal {formatMoney(String(estimatedSubtotal))}</span>
          </div>
          <button
            aria-label="Clear quick order"
            disabled={!selectedLines.length}
            onClick={() => setQuantities({})}
            title="Clear order"
            type="button"
          >
            <Trash2 aria-hidden="true" size={18} />
          </button>
          <button
            disabled={!selectedLines.length}
            onClick={openShopifyCart}
            type="button"
          >
            <ShoppingCart aria-hidden="true" size={18} />
            Review on Shopify
          </button>
          </aside>
        )}
        <p className="quick-order-note">
          Final availability, shipping, taxes, and payment are confirmed on{" "}
          {new URL(SHOPIFY_ORIGIN).hostname}.
        </p>
      </main>
    </StoreShell>
  );
}
