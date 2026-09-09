import { Search } from "lucide-react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/store";
import { CoilDraftCard } from "../components/coil-draft-card";
import { ProductCard } from "../components/product-card";
import { StoreShell } from "../components/store-shell";
import {
  customerVisibleProducts,
  filterCatalogEntries,
} from "../data/catalog.server";
import { catalogCategories } from "../data/catalog.shared";
import { coilDraftProducts } from "../data/product-taxonomy";
import { storefrontPositioning } from "../data/store-content";
import { collectionDefinitions } from "../data/collection-content";
import { seoMeta } from "../data/seo";

const PAGE_SIZE = 16;

export function meta() {
  return seoMeta(storefrontPositioning.title, storefrontPositioning.description, "/");
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? "all";
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const filteredEntries = filterCatalogEntries(query, category);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages,
  );
  return {
    category,
    counts: {
      coilDrafts: coilDraftProducts.length,
      products: customerVisibleProducts.length,
      variants: customerVisibleProducts.reduce(
        (total, product) => total + product.variants.length,
        0,
      ),
    },
    page,
    entries: filteredEntries.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE,
    ),
    query,
    totalEntries: filteredEntries.length,
    totalPages,
  };
}

export default function Store({ loaderData }: Route.ComponentProps) {
  const pageHref = (page: number) => {
    const search = new URLSearchParams();
    if (loaderData.category !== "all") {
      search.set("category", loaderData.category);
    }
    if (loaderData.query) {
      search.set("q", loaderData.query);
    }
    if (page > 1) {
      search.set("page", String(page));
    }
    return search.size ? `/?${search.toString()}` : "/";
  };

  return (
    <StoreShell>
      <main>
        <section className="catalog-intro">
          <div>
            <p className="store-kicker">Professional mobile repair supply</p>
            <h1>{storefrontPositioning.heading}</h1>
            <p>{storefrontPositioning.introduction}</p>
            <nav aria-label="Browse parts"><ul>{storefrontPositioning.importantCollections.map(slug => <li key={slug}><Link to={`/collections/${slug}`}>{collectionDefinitions[slug].title}</Link></li>)}</ul></nav>
            <p><Link to="/pages/buyer-guidance">Buyer guidance</Link></p>
            <p>
              Browse {loaderData.counts.products} active Back Glass products
              and {loaderData.counts.coilDrafts} standalone Wireless Charging
              Coil drafts. Draft items cannot be purchased.
            </p>
          </div>
          <dl className="catalog-stats">
            <div>
              <dt>Products</dt>
              <dd>{loaderData.counts.products}</dd>
            </div>
            <div>
              <dt>Variants</dt>
              <dd>
                {loaderData.counts.variants}
              </dd>
            </div>
            <div>
              <dt>Coil drafts</dt>
              <dd>{loaderData.counts.coilDrafts}</dd>
            </div>
          </dl>
        </section>

        <section className="catalog-controls" aria-label="Catalog controls">
          <Form className="catalog-search" method="get">
            {loaderData.category !== "all" && (
              <input
                name="category"
                type="hidden"
                value={loaderData.category}
              />
            )}
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Search products"
              defaultValue={loaderData.query}
              name="q"
              placeholder="Search model, grade, color, or SKU"
              type="search"
            />
            <button type="submit">Search</button>
          </Form>
          <nav aria-label="Product categories" className="category-tabs">
            {catalogCategories.map((category) => {
              const search = new URLSearchParams();
              if (category.value !== "all") {
                search.set("category", category.value);
              }
              if (loaderData.query) {
                search.set("q", loaderData.query);
              }
              const suffix = search.size ? `?${search.toString()}` : "";
              return (
                <Link
                  aria-current={
                    loaderData.category === category.value ? "page" : undefined
                  }
                  key={category.value}
                  to={`/${suffix}`}
                >
                  {category.label}
                </Link>
              );
            })}
          </nav>
        </section>

        <section className="catalog-results" aria-labelledby="catalog-heading">
          <div className="catalog-results-heading">
            <h2 id="catalog-heading">
              {loaderData.query ? `Results for "${loaderData.query}"` : "Catalog"}
            </h2>
            <p>{loaderData.totalEntries} records</p>
          </div>
          {loaderData.entries.length ? (
            <div className="product-grid">
              {loaderData.entries.map((entry) =>
                entry.kind === "shopify" ? (
                  <ProductCard key={entry.product.id} product={entry.product} />
                ) : (
                  <CoilDraftCard
                    key={`${entry.modelSlug}-${entry.grade}`}
                    product={entry}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No matching products</h2>
              <p>Try a model number, grade, color, or SKU.</p>
              <Link to="/">Clear filters</Link>
            </div>
          )}
          {loaderData.totalPages > 1 && (
            <nav aria-label="Catalog pages" className="catalog-pagination">
              {loaderData.page > 1 ? (
                <Link to={pageHref(loaderData.page - 1)}>Previous</Link>
              ) : (
                <span aria-disabled="true">Previous</span>
              )}
              <p>
                Page {loaderData.page} of {loaderData.totalPages}
              </p>
              {loaderData.page < loaderData.totalPages ? (
                <Link to={pageHref(loaderData.page + 1)}>Next</Link>
              ) : (
                <span aria-disabled="true">Next</span>
              )}
            </nav>
          )}
        </section>
      </main>
    </StoreShell>
  );
}
