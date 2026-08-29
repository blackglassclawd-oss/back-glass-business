import { CircleUserRound, ShoppingBag } from "lucide-react";
import { Link, NavLink } from "react-router";
import { SHOPIFY_ORIGIN } from "../data/catalog.shared";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="store-page">
      <div className="announcement">
        Serving the mobile repair industry since 2015
      </div>
      <header className="store-header">
        <Link className="store-brand" to="/">
          Back Glass Pros
        </Link>
        <nav aria-label="Primary navigation">
          <NavLink to="/">Catalog</NavLink>
          <NavLink to="/quick-order">Quick order</NavLink>
        </nav>
        <div className="store-actions">
          <a
            aria-label="Shopify account"
            href={`${SHOPIFY_ORIGIN}/account`}
            title="Shopify account"
          >
            <CircleUserRound aria-hidden="true" size={20} />
          </a>
          <a
            aria-label="Shopify cart"
            href={`${SHOPIFY_ORIGIN}/cart`}
            title="Shopify cart"
          >
            <ShoppingBag aria-hidden="true" size={20} />
          </a>
        </div>
      </header>
      {children}
      <footer className="store-footer">
        <p>Back Glass Pros</p>
        <p>Checkout and order processing remain secured by Shopify.</p>
      </footer>
    </div>
  );
}
