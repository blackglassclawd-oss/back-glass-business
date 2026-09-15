import { BatteryCharging, PanelsTopLeft } from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/models";
import { StoreShell } from "../components/store-shell";
import { seoMeta } from "../data/seo";
import {
  catalogModels,
  getBackGlassProductsForModel,
  getCoilDraftsForModel,
} from "../data/catalog.server";

export function loader() {
  const models = catalogModels.map((model) => ({
    ...model,
    backGlassCount: getBackGlassProductsForModel(model.model).length,
    coilDraftCount: getCoilDraftsForModel(model.model).length,
  }));
  return {
    families: [...new Set(models.map((model) => model.family))].map(
      (family) => ({
        family,
        models: models.filter((model) => model.family === family),
      }),
    ),
  };
}

export function meta() {
  return seoMeta("Shop by Model | Back Glass Pros", "Find Back Glass and standalone Wireless Charging Coil drafts by iPhone model. Compatibility requires separate verification.", "/models");
}

export default function Models({ loaderData }: Route.ComponentProps) {
  return (
    <StoreShell>
      <main>
        <section className="catalog-intro model-index-intro">
          <div>
            <p className="store-kicker">Catalog navigation</p>
            <h1>Shop by Model</h1>
            <p>
              Choose an iPhone model to see Back Glass and Wireless Charging
              Coil products as separate part types.
            </p>
          </div>
        </section>
        <div className="collection-results model-index-results">
          {loaderData.families.map((family) => (
            <section className="family-section" key={family.family}>
              <div className="family-heading">
                <p className="store-kicker">iPhone family</p>
                <h2>{family.family}</h2>
              </div>
              <div className="model-link-grid">
                {family.models.map((model) => (
                  <Link
                    className="model-link-card"
                    key={model.slug}
                    to={`/models/${model.slug}`}
                  >
                    <h3>{model.model}</h3>
                    <div>
                      <span>
                        <PanelsTopLeft aria-hidden="true" size={16} />
                        {model.backGlassCount} Back Glass
                      </span>
                      {model.coilDraftCount > 0 && (
                        <span>
                          <BatteryCharging aria-hidden="true" size={16} />
                          {model.coilDraftCount} Coil drafts
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </StoreShell>
  );
}
