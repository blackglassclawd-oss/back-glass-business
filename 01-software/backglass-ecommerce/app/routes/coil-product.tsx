import { ArrowLeft, BatteryCharging, CircleSlash2 } from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/coil-product";
import { StoreShell } from "../components/store-shell";
import { findCoilDraftProduct } from "../data/product-taxonomy";
import { getProductInformation, productFactRows } from "../data/product-information";
import { seoMeta } from "../data/seo";

const fieldLabels: Record<string, string> = {
  approvedProductMedia: "Approved product media",
  approvedSellingPrice: "Approved selling price",
  compatibilityDetails: "Compatibility details",
  gradeDefinition: "Grade definition",
  includedComponents: "Included components",
  sku: "SKU",
  startingInventory: "Starting inventory",
};

export function loader({ params }: Route.LoaderArgs) {
  const product = findCoilDraftProduct(params.modelSlug, params.grade);
  if (!product) throw new Response("Product draft not found", { status: 404 });
  const facts = getProductInformation({ handle: "", title: product.title, product_type: product.productType, tags: [], variants: [] }, undefined, "Existing coil draft matrix; compatibility pending");
  return { product, facts };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  return seoMeta(loaderData?.product ? `${loaderData.product.title} | Back Glass Pros` : "Wireless Charging Coil | Back Glass Pros", "Standalone wireless charging coil draft. Not available for purchase; compatibility and product details require verification.", `/products/wireless-charging-coils/${params.modelSlug}/${params.grade}`);
}

export default function CoilProduct({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;
  return (
    <StoreShell>
      <main className="product-detail-shell">
        <Link className="back-link" to={`/models/${product.modelSlug}`}>
          <ArrowLeft aria-hidden="true" size={17} />
          Back to {product.model}
        </Link>
        <div className="product-detail">
          <div className="product-gallery coil-detail-placeholder">
            <BatteryCharging aria-hidden="true" size={64} />
            <strong>Approved model-specific media pending</strong>
            <span>Reference-only supplier imagery is not published.</span>
          </div>
          <section className="product-purchase">
            <p className="store-kicker">{product.productType} · Draft</p>
            <h1>{product.title}</h1>
            <dl className="product-meta">{productFactRows(loaderData.facts).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <p>This is a standalone coil draft, not a back-glass assembly. The model mapping is recorded; compatibility and included components require verification.</p>
            <p><Link to="/pages/wireless-charging-coil-compatibility">Coil compatibility review by model</Link></p>
            <div className="product-discontinued draft-product-status" role="status">
              <CircleSlash2 aria-hidden="true" size={22} />
              <div>
                <h2>Not available for purchase</h2>
                <p>
                  This standalone product remains Draft until every required
                  catalog field is approved. It has no Shopify cart action.
                </p>
              </div>
            </div>
            <section className="missing-fields" aria-labelledby="missing-fields-heading">
              <h2 id="missing-fields-heading">Required before publication</h2>
              <ul>
                {product.blockers.map((field) => (
                  <li key={field}>{fieldLabels[field] ?? field}</li>
                ))}
              </ul>
            </section>
          </section>
        </div>
      </main>
    </StoreShell>
  );
}
