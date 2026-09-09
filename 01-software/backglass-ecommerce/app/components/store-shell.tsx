import { CircleUserRound, ShoppingBag } from "lucide-react";
import { Link, NavLink } from "react-router";
import { SHOPIFY_ORIGIN } from "../data/catalog.shared";
import { organizationSchema } from "../data/seo";
import { StructuredData } from "./structured-data";

export function StoreShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="store-page">
      <StructuredData value={organizationSchema()} />
      <div className="announcement">
        Replacement parts for mobile-device repair professionals
      </div>
      <header className="store-header">
        <Link className="store-brand" to="/">
          Back Glass Pros
        </Link>
        <nav aria-label="Primary navigation">
          <NavLink to="/" end>All Products</NavLink>
          <NavLink to="/collections/back-glass">Back Glass</NavLink>
          <NavLink to="/collections/wireless-charging-coils">
            Wireless Charging Coils
          </NavLink>
          <NavLink to="/models">Shop by Model</NavLink>
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
        <nav aria-label="Support and guidance"><a href="https://backglasspros.com/pages/contact">Contact</a>{" · "}<Link to="/pages/buyer-guidance">Buyer guidance</Link>{import.meta.env.DEV && <>{" · "}<Link to="/pages/support-review">Support information review</Link></>}{" · "}<a href="https://backglasspros.com/policies/privacy-policy">Privacy policy</a></nav>
        <p>Checkout and order processing remain secured by Shopify.</p>
      </footer>
    </div>
  );
}
