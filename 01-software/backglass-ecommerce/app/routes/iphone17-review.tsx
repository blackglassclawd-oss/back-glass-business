import {
  ArrowLeft,
  CircleDollarSign,
  Clock3,
  PackageSearch,
} from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/iphone17-review";
import { HalfAssemblyMedia } from "../components/half-assembly-media";
import { StoreShell } from "../components/store-shell";
import pricingDraft from "../../data/pricing/draft-price-sheet-2026-07-28.json";

const priceFields = [
  {
    key: "a_grade_half_assembly_no_coil",
    label: "A Grade half assembly",
  },
  {
    key: "premium_half_assembly_no_coil",
    label: "Premium half assembly",
  },
  {
    key: "aftermarket_nfc_charging_flex",
    label: "AM charging flex",
  },
  {
    key: "original_nfc_charging_flex",
    label: "OEM Pull charging flex",
  },
] as const;

interface ColorReference {
  color: string;
  src: string;
  swatchClass: string;
}

const colorReferences: Record<string, ColorReference[]> = {
  "iPhone 17": [
    {
      color: "Black",
      src: "/product-media/iphone-17-black-full-assembly.jpg",
      swatchClass: "swatch-black",
    },
    {
      color: "Sage",
      src: "/product-media/iphone-17-sage-full-assembly.jpg",
      swatchClass: "swatch-sage",
    },
    {
      color: "Lavender",
      src: "/product-media/iphone-17-lavender-full-assembly.jpg",
      swatchClass: "swatch-lavender",
    },
    {
      color: "White",
      src: "/product-media/iphone-17-white-full-assembly.jpg",
      swatchClass: "swatch-white",
    },
    {
      color: "Mist Blue",
      src: "/product-media/iphone-17-mist-blue-full-assembly.jpg",
      swatchClass: "swatch-mist-blue",
    },
  ],
  "iPhone 17 Air": [
    {
      color: "Sky Blue",
      src: "/product-media/iphone-air-sky-blue-full-assembly.jpg",
      swatchClass: "swatch-sky-blue",
    },
    {
      color: "Cloud White",
      src: "/product-media/iphone-air-cloud-white-full-assembly.jpg",
      swatchClass: "swatch-cloud-white",
    },
    {
      color: "Light Gold",
      src: "/product-media/iphone-air-light-gold-full-assembly.jpg",
      swatchClass: "swatch-light-gold",
    },
    {
      color: "Space Black",
      src: "/product-media/iphone-air-space-black-full-assembly.jpg",
      swatchClass: "swatch-space-black",
    },
  ],
  "iPhone 17 Pro": [
    {
      color: "Silver",
      src: "/product-media/iphone-17-pro-silver-full-assembly.jpg",
      swatchClass: "swatch-silver",
    },
    {
      color: "Deep Blue",
      src: "/product-media/iphone-17-pro-deep-blue-full-assembly.jpg",
      swatchClass: "swatch-deep-blue",
    },
    {
      color: "Cosmic Orange",
      src: "/product-media/iphone-17-pro-cosmic-orange-full-assembly.jpg",
      swatchClass: "swatch-cosmic-orange",
    },
  ],
  "iPhone 17 Pro Max": [
    {
      color: "Silver",
      src: "/product-media/iphone-17-pro-max-silver-full-assembly.jpg",
      swatchClass: "swatch-silver",
    },
    {
      color: "Deep Blue",
      src: "/product-media/iphone-17-pro-max-deep-blue-full-assembly.jpg",
      swatchClass: "swatch-deep-blue",
    },
    {
      color: "Cosmic Orange",
      src: "/product-media/iphone-17-pro-max-cosmic-orange-full-assembly.jpg",
      swatchClass: "swatch-cosmic-orange",
    },
  ],
};

export function loader() {
  return {
    models: pricingDraft.rows
      .filter(
        (row) =>
          row.catalogStatus === "draft-model" &&
          row.model.startsWith("iPhone 17"),
      )
      .map((row) => ({
        colors: colorReferences[row.model] ?? [],
        model: row.model,
        prices: priceFields.map((field) => ({
          label: field.label,
          value: row.prices[field.key],
        })),
      })),
    sourceDate: pricingDraft.source.capturedAt,
  };
}

export function meta() {
  return [
    { title: "iPhone 17 Series Review | Back Glass Pros" },
    {
      name: "description",
      content:
        "Review-only draft pricing for proposed Back Glass Pros iPhone 17 series products.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

function formatDraftPrice(value: number | null) {
  if (value === null) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

export default function Iphone17Review({
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
            <p className="store-kicker">Owner review draft</p>
            <h1>iPhone 17 series review</h1>
            <p>
              Proposed no-coil half assemblies and separate charging-flex prices
              transcribed from the July 28 sheet.
            </p>
          </div>
          <div className="review-status">
            <Clock3 aria-hidden="true" size={22} />
            <div>
              <strong>Not currently offered</strong>
              <span>Pricing and product details require approval.</span>
            </div>
          </div>
        </header>

        <section className="review-guardrail" aria-label="Draft status">
          <CircleDollarSign aria-hidden="true" size={22} />
          <div>
            <h2>Review pricing only</h2>
            <p>
              These products are excluded from Shopify checkout. Blank sheet
              cells remain pending, and coil-bearing interior photos are hidden.
            </p>
          </div>
          <p>Source: {loaderData.sourceDate}</p>
        </section>

        <section aria-labelledby="review-products-heading">
          <div className="review-section-heading">
            <h2 id="review-products-heading">Proposed products</h2>
            <p>
              {loaderData.models.length} models ·{" "}
              {loaderData.models.reduce(
                (total, item) => total + item.colors.length,
                0,
              )}{" "}
              separate colors
            </p>
          </div>
          <div className="review-model-list">
            {loaderData.models.map((item) => (
              <section className="review-model-section" key={item.model}>
                <div className="review-model-heading">
                  <div>
                    <p className="product-kind">Half Assembly · No Coil</p>
                    <h2>{item.model}</h2>
                    <p>
                      {item.colors.length} color-specific drafts. SKUs and
                      inventory remain separate.
                    </p>
                  </div>
                  <div className="review-model-pricing">
                    <p>Model-level sheet pricing</p>
                    <span>Not assigned to colors until approved</span>
                  </div>
                  <dl className="review-price-list">
                    {item.prices.map((price) => (
                      <div key={price.label}>
                        <dt>{price.label}</dt>
                        <dd
                          className={
                            price.value === null ? "price-pending" : undefined
                          }
                        >
                          {formatDraftPrice(price.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="review-color-grid">
                  {item.colors.map((color) => (
                    <article className="review-color-card" key={color.color}>
                      <HalfAssemblyMedia
                        alt={`${item.model} ${color.color} exterior color reference`}
                        src={color.src}
                      />
                      <div className="review-color-body">
                        <div className="review-color-name">
                          <span
                            aria-hidden="true"
                            className={`review-color-swatch ${color.swatchClass}`}
                          />
                          <h3>{color.color}</h3>
                        </div>
                        <p>Exterior color reference</p>
                        <div className="review-color-status">
                          <PackageSearch aria-hidden="true" size={16} />
                          <span>No-coil interior photo, SKU, and stock pending</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="review-decisions">
          <div>
            <p className="store-kicker">Approval needed</p>
            <h2>Product decisions</h2>
          </div>
          <ol>
            <li>Confirm these are wholesale customer prices.</li>
            <li>Confirm whether each model price applies to every color.</li>
            <li>Provide a separate SKU and starting stock for each color.</li>
            <li>Supply accurate no-coil interior photos before publication.</li>
          </ol>
        </section>
      </main>
    </StoreShell>
  );
}
