import { Search } from "lucide-react";
import { Form, Link } from "react-router";
import type { Route } from "./+types/store";
import { ProductCard } from "../components/product-card";
import { StoreShell } from "../components/store-shell";
import {
  catalog,
  customerVisibleProducts,
  filterProducts,
} from "../data/catalog.server";
import { catalogCategories } from "../data/catalog.shared";

const PAGE_SIZE = 16;

export function meta() {
  return [
    { title: "Back Glass Pros | Mobile Repair Parts" },
    {
      name: "description",
      content:
        "Replacement back glass and assemblies for professional mobile repair.",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category") ?? "all";
  const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const filteredProducts = filterProducts(query, category);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const page = Math.min(
    Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1),
    totalPages,
  );
  return {
    capturedAt: catalog.capturedAt,
    category,
    counts: {
      products: customerVisibleProducts.length,
      variants: customerVisibleProducts.reduce(
        (total, product) => total + product.variants.length,
        0,
      ),
    },
    page,
    products: filteredProducts.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE,
    ),
    query,
    totalProducts: filteredProducts.length,
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
            <h1>Back Glass Pros parts catalog</h1>
            <p>
              Search {loaderData.counts.products} products and{" "}
              {loaderData.counts.variants} captured variants. Orders continue
              through the restored Shopify store during migration.
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
              <dt>Snapshot</dt>
              <dd>{new Date(loaderData.capturedAt).toLocaleDateString("en-US")}</dd>
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
            <p>{loaderData.totalProducts} products</p>
          </div>
          {loaderData.products.length ? (
            <div className="product-grid">
              {loaderData.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
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
