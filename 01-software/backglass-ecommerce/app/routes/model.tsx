import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/model";
import { CoilDraftCard } from "../components/coil-draft-card";
import { ProductCard } from "../components/product-card";
import { StoreShell } from "../components/store-shell";
import { seoMeta } from "../data/seo";
import {
  findCatalogModel,
  getBackGlassProductsForModel,
  getCoilDraftsForModel,
} from "../data/catalog.server";

export function loader({ params }: Route.LoaderArgs) {
  const model = findCatalogModel(params.modelSlug);
  if (!model) throw new Response("Model not found", { status: 404 });
  return {
    backGlassProducts: getBackGlassProductsForModel(model.model),
    coilProducts: getCoilDraftsForModel(model.model),
    model,
  };
}

export function meta({ loaderData, params }: Route.MetaArgs) {
  const model = loaderData?.model.model ?? "iPhone";
  return seoMeta(`${model} Parts | Back Glass Pros`, `Browse ${model} Back Glass and standalone Wireless Charging Coil drafts. Model listings do not establish verified coil compatibility.`, `/models/${params.modelSlug}`);
}

export default function Model({ loaderData }: Route.ComponentProps) {
  return (
    <StoreShell>
      <main className="model-page-shell">
        <Link className="back-link" to="/models">
          <ArrowLeft aria-hidden="true" size={17} />
          Shop by Model
        </Link>
        <header className="model-page-heading">
          <p className="store-kicker">Shop by Model</p>
          <h1>{loaderData.model.model}</h1>
          <p>
            Back Glass and Wireless Charging Coils are separate product types.
          </p>
        </header>

        <section className="model-part-section" aria-labelledby="back-glass-heading">
          <div className="model-part-heading">
            <div>
              <p className="product-kind">Part type</p>
              <h2 id="back-glass-heading">Back Glass</h2>
            </div>
            <Link to="/collections/back-glass">View all Back Glass</Link>
          </div>
          {loaderData.backGlassProducts.length ? (
            <div className="product-grid">
              {loaderData.backGlassProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="model-empty-state">No active Back Glass product is available for this model.</p>
          )}
        </section>

        <section className="model-part-section" aria-labelledby="coil-heading">
          <div className="model-part-heading">
            <div>
              <p className="product-kind">Part type</p>
              <h2 id="coil-heading">Wireless Charging Coils</h2>
            </div>
            <Link to="/collections/wireless-charging-coils">
              View all Wireless Charging Coils
            </Link>
          </div>
          {loaderData.coilProducts.length ? (
            <>
              <p className="model-section-note">
                OEM and Aftermarket are staged separately and are not yet
                purchasable.
              </p>
              <div className="product-grid">
                {loaderData.coilProducts.map((product) => (
                  <CoilDraftCard
                    key={`${product.modelSlug}-${product.grade}`}
                    product={product}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="model-empty-state">
              No verified Wireless Charging Coil mapping exists for this model.
            </p>
          )}
        </section>
      </main>
    </StoreShell>
  );
}
