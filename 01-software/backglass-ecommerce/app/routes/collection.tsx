import { Link } from "react-router";

import type { Route } from "./+types/collection";
import { CoilDraftCard } from "../components/coil-draft-card";
import { ProductCard } from "../components/product-card";
import { StoreShell } from "../components/store-shell";
import {
  catalogModels,
  shopifyCatalogEntries,
} from "../data/catalog.server";
import { coilDraftProducts } from "../data/product-taxonomy";
import { collectionDefinitions, belongsToCollection, isCollectionSlug } from "../data/collection-content";
import { seoMeta, breadcrumbSchema } from "../data/seo";
import { StructuredData } from "../components/structured-data";

export function loader({ params }: Route.LoaderArgs) {
  if (!isCollectionSlug(params.partType)) {
    throw new Response("Collection not found", { status: 404 });
  }

  const partType = params.partType;
  const models = catalogModels
    .map((model) => ({
      ...model,
      coilProducts:
        partType === "wireless-charging-coils"
          ? coilDraftProducts.filter((product) => product.model === model.model)
          : [],
      shopifyProducts:
        partType !== "wireless-charging-coils"
          ? shopifyCatalogEntries
              .filter((entry) => entry.model === model.model && belongsToCollection(entry.product, partType))
              .map((entry) => entry.product)
          : [],
    }))
    .filter(
      (model) => model.coilProducts.length || model.shopifyProducts.length,
    );
  const families = [...new Set(models.map((model) => model.family))].map(
    (family) => ({
      family,
      models: models.filter((model) => model.family === family),
    }),
  );

  return {
    definition: collectionDefinitions[partType],
    families,
    partType,
    totalProducts: models.reduce(
      (total, model) =>
        total + model.coilProducts.length + model.shopifyProducts.length,
      0,
    ),
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.definition.title ?? "Collection";
  return seoMeta(`${title} | Back Glass Pros`, loaderData?.definition.description ?? "Browse Back Glass Pros parts.", `/collections/${loaderData?.partType ?? "back-glass"}`);
}

export default function Collection({ loaderData }: Route.ComponentProps) {
  const isCoilCollection =
    loaderData.partType === "wireless-charging-coils";

  return (
    <StoreShell>
      <StructuredData value={breadcrumbSchema([{ name: "Home", path: "/" }, { name: loaderData.definition.title, path: `/collections/${loaderData.partType}` }])} />
      <main>
        <section className="catalog-intro collection-intro">
          <div>
            <p className="store-kicker">Shop by part type and grade</p>
            <h1>{loaderData.definition.title}</h1>
            <p>{loaderData.definition.description}</p>
            <nav aria-label="Related collections"><ul>{loaderData.definition.related.map(slug => <li key={slug}><Link to={`/collections/${slug}`}>{collectionDefinitions[slug].title}</Link></li>)}</ul></nav>
            <p><Link to={`/pages/${loaderData.definition.guide}`}>Selection guidance</Link></p>
          </div>
          <dl className="catalog-stats collection-stats">
            <div>
              <dt>Families</dt>
              <dd>{loaderData.families.length}</dd>
            </div>
            <div>
              <dt>Models</dt>
              <dd>
                {loaderData.families.reduce(
                  (total, family) => total + family.models.length,
                  0,
                )}
              </dd>
            </div>
            <div>
              <dt>{isCoilCollection ? "Drafts" : "Products"}</dt>
              <dd>{loaderData.totalProducts}</dd>
            </div>
          </dl>
        </section>

        {isCoilCollection && (
          <section className="catalog-safety-note" role="status">
            <strong>Catalog setup in progress</strong>
            <p>
              OEM and Aftermarket are separate draft products. Pricing,
              inventory, SKUs, compatibility details, included components, and
              approved model-specific media are still required. No draft has a
              purchase action.
            </p>
          </section>
        )}

        <div className="collection-results">
          {loaderData.families.map((family) => (
            <section className="family-section" key={family.family}>
              <div className="family-heading">
                <p className="store-kicker">Newest first</p>
                <h2>{family.family}</h2>
              </div>
              <div className="model-section-list">
                {family.models.map((model) => (
                  <section className="model-product-section" key={model.slug}>
                    <div className="model-product-heading">
                      <div>
                        <h3>{model.model}</h3>
                        <p>
                          {model.shopifyProducts.length +
                            model.coilProducts.length}{" "}
                          {model.shopifyProducts.length +
                            model.coilProducts.length ===
                          1
                            ? "product"
                            : "products"}
                        </p>
                      </div>
                      <Link to={`/models/${model.slug}`}>Shop this model</Link>
                    </div>
                    <div className="product-grid">
                      {model.shopifyProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                      {model.coilProducts.map((product) => (
                        <CoilDraftCard
                          key={`${product.modelSlug}-${product.grade}`}
                          product={product}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </StoreShell>
  );
}
