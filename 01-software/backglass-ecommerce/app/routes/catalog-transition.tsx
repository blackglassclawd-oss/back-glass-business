import {
  Archive,
  ArrowLeft,
  BatteryCharging,
  PanelsTopLeft,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/catalog-transition";
import { StoreShell } from "../components/store-shell";
import { customerVisibleProducts } from "../data/catalog.server";
import {
  blockedCoilModels,
  coilCatalogModels,
  coilDraftProducts,
} from "../data/product-taxonomy";

export function meta() {
  return [
    { title: "Catalog Transition Review | Back Glass Pros" },
    {
      name: "description",
      content:
        "Review-only transition from retired full assemblies to separate Back Glass and Wireless Charging Coil products.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export function loader() {
  return {
    blockedModels: blockedCoilModels,
    coilModels: coilCatalogModels.map((model) => ({
      ...model,
      products: coilDraftProducts.filter(
        (product) => product.model === model.model,
      ),
    })),
    counts: {
      activeBackGlass: customerVisibleProducts.length,
      activeFullAssemblies: 8,
      coilDrafts: coilDraftProducts.length,
      draftFullAssemblies: 20,
      historicalFullAssemblies: 28,
    },
    sourceDate: "2026-08-29",
  };
}

export default function CatalogTransition({
  loaderData,
}: Route.ComponentProps) {
  return (
    <StoreShell>
      <main className="review-shell">
        <Link className="back-link" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to All Products
        </Link>

        <header className="review-heading">
          <div>
            <p className="store-kicker">Authoritative direction · staged</p>
            <h1>Catalog transition</h1>
            <p>
              Retire Full Assembly products and keep Back Glass and standalone
              Wireless Charging Coils as separate product types.
            </p>
          </div>
          <div className="review-status transition-approved">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <strong>Local structure complete</strong>
              <span>Production Shopify changes still require approval.</span>
            </div>
          </div>
        </header>

        <section className="transition-summary" aria-label="Catalog change summary">
          <div>
            <Archive aria-hidden="true" size={22} />
            <strong>Full assemblies</strong>
            <span>
              {loaderData.counts.draftFullAssemblies} Draft ·{" "}
              {loaderData.counts.activeFullAssemblies} still Active
            </span>
            <p>Move all to Draft. Delete nothing.</p>
          </div>
          <div>
            <PanelsTopLeft aria-hidden="true" size={22} />
            <strong>Back Glass</strong>
            <span>{loaderData.counts.activeBackGlass} active snapshot products</span>
            <p>Retain as a separate part type.</p>
          </div>
          <div>
            <BatteryCharging aria-hidden="true" size={22} />
            <strong>Wireless Charging Coils</strong>
            <span>
              {loaderData.coilModels.length} models ·{" "}
              {loaderData.counts.coilDrafts} grade-specific drafts
            </span>
            <p>OEM and Aftermarket remain unavailable.</p>
          </div>
        </section>

        <section className="transition-workstream" aria-labelledby="retirement-heading">
          <div>
            <p className="store-kicker">Reversible retirement</p>
            <h2 id="retirement-heading">Preserve records, stop selling</h2>
          </div>
          <div className="transition-copy">
            <p>
              Historical Full Assembly records and URLs remain available for
              audit and redirect decisions, but the storefront exposes no cart
              action for them.
            </p>
            <p>
              A production-gated script moves the remaining active records to
              Draft and verifies that the Extend Commerce All Products
              collection is unchanged.
            </p>
          </div>
        </section>

        <section
          className="transition-workstream"
          aria-labelledby="charging-coils-heading"
        >
          <div>
            <p className="store-kicker">Separate product line</p>
            <h2 id="charging-coils-heading">Wireless Charging Coils</h2>
            <p className="transition-section-note">
              One standalone draft per model and grade. No SKU or price is
              invented.
            </p>
          </div>
          <div className="transition-table">
            <div className="transition-table-header" aria-hidden="true">
              <span>Model</span>
              <span>OEM</span>
              <span>Aftermarket</span>
              <span>Status</span>
            </div>
            {loaderData.coilModels.map((model) => (
              <article className="transition-table-row" key={model.slug}>
                <strong>{model.model}</strong>
                {model.products.map((product) => (
                  <div key={product.grade}>
                    <span>{product.grade}</span>
                    <small>Price · inventory · SKU · media pending</small>
                  </div>
                ))}
                <span className="transition-state transition-state-pending">
                  Draft · unavailable
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="transition-workstream" aria-labelledby="blocked-models-heading">
          <div>
            <p className="store-kicker">No listings created</p>
            <h2 id="blocked-models-heading">Blocked models</h2>
          </div>
          <div className="transition-copy">
            {loaderData.blockedModels.map((model) => (
              <p key={model.slug}>
                <strong>{model.model}:</strong> {model.reason}
              </p>
            ))}
          </div>
        </section>

        <footer className="transition-footer">
          <p>Direction recorded {loaderData.sourceDate}.</p>
          <p>Supplier reference media remains unpublished.</p>
        </footer>
      </main>
    </StoreShell>
  );
}
