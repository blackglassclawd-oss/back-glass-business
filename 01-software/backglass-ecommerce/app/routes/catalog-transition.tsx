import {
  Archive,
  ArrowLeft,
  Cable,
  ImageOff,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/catalog-transition";
import { StoreShell } from "../components/store-shell";
import pricingDraft from "../../data/pricing/draft-price-sheet-2026-07-28.json";
import productStrategy from "../../data/catalog/product-strategy-2026-07-29.json";

export function meta() {
  return [
    { title: "Catalog Transition Review | Back Glass Pros" },
    {
      name: "description",
      content:
        "Review-only transition from full assemblies to half assemblies and separate charging flex products.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export function loader() {
  return {
    chargingFlex: pricingDraft.rows.map((row) => ({
      aftermarket: row.prices.aftermarket_nfc_charging_flex,
      model: row.model,
      oemPull: row.prices.original_nfc_charging_flex,
      skus: {
        aftermarket: buildSku(row.model, "AM"),
        oemPull: buildSku(row.model, "OEM-PULL"),
      },
    })),
    rules: productStrategy.rules,
    sourceDate: productStrategy.capturedAt,
  };
}

function buildSku(model: string, source: "AM" | "OEM-PULL") {
  return `SKU-${model
    .replace(/^iPhone\s+/i, "I")
    .replaceAll(" ", "-")
    .toUpperCase()}-NFC-FLEX-${source}`;
}

function formatDraftPrice(value: number | null) {
  if (value === null) return "Pending";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

export default function CatalogTransition({
  loaderData,
}: Route.ComponentProps) {
  return (
    <StoreShell>
      <main className="review-shell">
        <Link className="back-link" to="/">
          <ArrowLeft aria-hidden="true" size={17} />
          Back to catalog
        </Link>

        <header className="review-heading">
          <div>
            <p className="store-kicker">Owner direction · staged</p>
            <h1>Catalog transition</h1>
            <p>
              Retain no-coil half assemblies, sell the charging flex separately,
              and move full assemblies out of the offered catalog.
            </p>
          </div>
          <div className="review-status transition-approved">
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <strong>Structure approved</strong>
              <span>Shopify writes remain draft-only and reversible.</span>
            </div>
          </div>
        </header>

        <section className="transition-summary" aria-label="Catalog change summary">
          <div>
            <Archive aria-hidden="true" size={22} />
            <strong>Full assembly</strong>
            <span>
              {loaderData.rules.fullAssembly.liveProducts} active ·{" "}
              {loaderData.rules.fullAssembly.publishedProducts} published
            </span>
            <p>Move to draft. Delete nothing.</p>
          </div>
          <div>
            <ImageOff aria-hidden="true" size={22} />
            <strong>Half assembly</strong>
            <span>
              {loaderData.rules.halfAssembly.liveProducts} products ·{" "}
              {loaderData.rules.halfAssembly.liveVariants} variants
            </span>
            <p>
              Keep active. Replace{" "}
              {loaderData.rules.halfAssembly.assignedVariantImages} assigned
              thumbnails.
            </p>
          </div>
          <div>
            <Cable aria-hidden="true" size={22} />
            <strong>Charging flex</strong>
            <span>
              {loaderData.rules.chargingFlex.draftProducts} products ·{" "}
              {loaderData.rules.chargingFlex.draftVariants} variants
            </span>
            <p>Create drafts with Aftermarket and OEM Pull options.</p>
          </div>
        </section>

        <section className="transition-workstream" aria-labelledby="half-assembly-heading">
          <div>
            <p className="store-kicker">Product photography</p>
            <h2 id="half-assembly-heading">Half assembly image correction</h2>
          </div>
          <div className="transition-copy">
            <p>
              The existing interior photos show a wireless charging coil and
              cannot represent a no-coil half assembly.
            </p>
            <p>
              Shopify's quick-order rows use each variant's assigned image, not
              only the product hero. All 96 color variants are now tracked
              separately for verified, color-matched replacement.
            </p>
            <p>
              The preview keeps the exterior color reference and masks the
              misleading interior. Existing assignments stay in place until
              accurate no-coil replacements are ready.
            </p>
            <Link to="/review/iphone-17-series">Review iPhone 17 colors</Link>
          </div>
        </section>

        <section
          className="transition-workstream"
          id="charging-flex"
          aria-labelledby="charging-flex-heading"
        >
          <div>
            <p className="store-kicker">Separate product line</p>
            <h2 id="charging-flex-heading">
              Wireless NFC charging flex with flashlight cable
            </h2>
            <p className="transition-section-note">
              One draft product per model with two source options.
            </p>
          </div>
          <div className="transition-table">
            <div className="transition-table-header" aria-hidden="true">
              <span>Model</span>
              <span>Aftermarket</span>
              <span>OEM Pull</span>
              <span>Status</span>
            </div>
            {loaderData.chargingFlex.map((product) => {
              const pending =
                product.aftermarket === null || product.oemPull === null;
              return (
                <article className="transition-table-row" key={product.model}>
                  <strong>{product.model}</strong>
                  <div>
                    <span>{formatDraftPrice(product.aftermarket)}</span>
                    <small>{product.skus.aftermarket}</small>
                  </div>
                  <div>
                    <span>{formatDraftPrice(product.oemPull)}</span>
                    <small>{product.skus.oemPull}</small>
                  </div>
                  <span
                    className={
                      pending
                        ? "transition-state transition-state-pending"
                        : "transition-state"
                    }
                  >
                    {pending ? "Draft · price pending" : "Draft · priced"}
                  </span>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="transition-footer">
          <p>Direction recorded {loaderData.sourceDate}.</p>
          <p>
            Prices remain staged until confirmed as wholesale selling prices.
          </p>
        </footer>
      </main>
    </StoreShell>
  );
}
