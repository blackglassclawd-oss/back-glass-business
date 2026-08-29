import { ArrowLeft, Check, CircleSlash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/product";
import { HalfAssemblyMedia } from "../components/half-assembly-media";
import { StoreShell } from "../components/store-shell";
import { findProduct } from "../data/catalog.server";
import {
  formatMoney,
  getProductImage,
  isFullAssemblyProduct,
  isHalfAssemblyProduct,
  SHOPIFY_ORIGIN,
} from "../data/catalog.shared";

export function loader({ params }: Route.LoaderArgs) {
  const product = findProduct(params.handle);
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  return { product };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const product = loaderData?.product;
  return [
    {
      title: product
        ? `${product.title} | Back Glass Pros`
        : "Product | Back Glass Pros",
    },
    ...(product && isFullAssemblyProduct(product)
      ? [{ name: "robots", content: "noindex, nofollow" }]
      : []),
  ];
}

export default function Product({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;
  const image = getProductImage(product);
  const isDiscontinued = isFullAssemblyProduct(product);
  const isHalfAssembly = isHalfAssemblyProduct(product);
  const availableVariants = product.variants.filter(
    (variant) => variant.available,
  );

  return (
    <StoreShell>
      <main className="product-detail-shell">
        <Link className="back-link" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to catalog
        </Link>
        <div className="product-detail">
          <div className="product-gallery">
            {image && isHalfAssembly ? (
              <HalfAssemblyMedia
                alt={`${product.title} exterior color reference`}
                loading="eager"
                src={image}
              />
            ) : image ? (
              <img alt={product.title} src={image} />
            ) : (
              <span className="image-placeholder">Image unavailable</span>
            )}
            {!isHalfAssembly && !isDiscontinued && product.images.length > 1 && (
              <div className="product-thumbnails">
                {product.images.slice(0, 6).map((item) => (
                  <img alt="" key={item.id} loading="lazy" src={item.src} />
                ))}
              </div>
            )}
          </div>
          <section className="product-purchase">
            <p className="store-kicker">{product.product_type}</p>
            <h1>{product.title}</h1>
            <p className="product-vendor">{product.vendor}</p>
            {isDiscontinued ? (
              <div className="product-discontinued" role="status">
                <CircleSlash2 aria-hidden="true" size={22} />
                <div>
                  <h2>No longer offered</h2>
                  <p>
                    Build this configuration with a Premium or A Grade half
                    assembly and a separate Aftermarket or OEM Pull charging flex.
                  </p>
                  <div>
                    <Link to="/?category=half-assembly">
                      Browse half assemblies
                    </Link>
                    <Link to="/review/catalog-transition#charging-flex">
                      Review charging flex
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <ul className="product-assurances">
                  {isHalfAssembly && (
                    <li>
                      <Check aria-hidden="true" size={16} />
                      Half assembly without wireless charging coil
                    </li>
                  )}
                  <li>
                    <Check aria-hidden="true" size={16} />
                    Checkout, tax, and shipping remain on Shopify
                  </li>
                </ul>
                <form
                  action={`${SHOPIFY_ORIGIN}/cart/add`}
                  className="purchase-form"
                  method="post"
                >
                  <label htmlFor="variant">Color and variant</label>
                  <select id="variant" name="id" required>
                    {product.variants.map((variant) => (
                      <option
                        disabled={!variant.available}
                        key={variant.id}
                        value={variant.id}
                      >
                        {variant.title} - {formatMoney(variant.price)}
                        {!variant.available ? " - Sold out" : ""}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="quantity">Quantity</label>
                  <input
                    defaultValue="1"
                    id="quantity"
                    min="1"
                    name="quantity"
                    type="number"
                  />
                  <button disabled={!availableVariants.length} type="submit">
                    <ShoppingBag aria-hidden="true" size={18} />
                    {availableVariants.length ? "Add on Shopify" : "Sold out"}
                  </button>
                </form>
              </>
            )}
            <dl className="product-meta">
              <div>
                <dt>Variants</dt>
                <dd>{product.variants.length}</dd>
              </div>
              <div>
                <dt>Available</dt>
                <dd>{availableVariants.length}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  {new Date(product.updated_at).toLocaleDateString("en-US")}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </StoreShell>
  );
}
