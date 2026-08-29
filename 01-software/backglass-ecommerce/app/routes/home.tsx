import { ArrowUpRight } from "lucide-react";

import type { Route } from "./+types/home";
import { getRuntimeEnvironment } from "../services/runtime-env.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Commerce Operations | Back Glass Pros" },
    {
      name: "description",
      content: "Backend and migration status for Back Glass Pros.",
    },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export function loader() {
  const runtimeEnv = getRuntimeEnvironment();
  const storeDomain =
    runtimeEnv.SHOPIFY_STORE_DOMAIN ?? "kfczyu-kc.myshopify.com";

  return {
    apiVersion: runtimeEnv.SHOPIFY_API_VERSION ?? "2026-07",
    credentialsConfigured: Boolean(
      runtimeEnv.SHOPIFY_CLIENT_ID && runtimeEnv.SHOPIFY_CLIENT_SECRET,
    ),
    mode: runtimeEnv.MIGRATION_MODE ?? "read-only",
    shopifyAdminUrl: `https://admin.shopify.com/store/${storeDomain.replace(
      ".myshopify.com",
      "",
    )}`,
    storeDomain,
  };
}

const operatingModel = [
  {
    detail:
      "Products, variants, inventory, orders, customers, fulfillment, and content stay in the familiar Shopify Admin.",
    label: "Management backend",
    owner: "Shopify Admin",
    state: "current",
  },
  {
    detail:
      "The Cloudflare catalog is a fast customer-facing projection of Shopify data.",
    label: "Storefront",
    owner: "Cloudflare",
    state: "current",
  },
  {
    detail:
      "Cart, taxes, shipping rates, payment authorization, fraud checks, receipts, and refunds remain on Shopify.",
    label: "Checkout and payments",
    owner: "Shopify",
    state: "current",
  },
  {
    detail:
      "Authenticated exports are available. Webhooks, queues, and scheduled reconciliation are the next backend build.",
    label: "Data synchronization",
    owner: "Cloudflare + Shopify",
    state: "next",
  },
] as const;

const parityWorkstreams = [
  {
    current: "Shopify product and inventory screens",
    label: "Catalog and stock",
    next: "Model/color matrix, low-stock queue, controlled bulk edits",
  },
  {
    current: "Shopify order and fulfillment screens",
    label: "Orders and shipping",
    next: "Exception queue, pick list, tracking and reconciliation",
  },
  {
    current: "Shopify customer records",
    label: "B2B accounts",
    next: "Companies, terms, quantity rules and wholesale catalogs",
  },
  {
    current: "Shopify checkout and payment records",
    label: "Payments and refunds",
    next: "Storefront Cart API handoff with buyer identity preserved",
  },
  {
    current: "Shopify analytics plus exported snapshots",
    label: "Reports",
    next: "Daily sales, stock, fulfillment and repeat-account report",
  },
  {
    current: "Manual edits in Shopify",
    label: "Automation",
    next: "Dry-run diffs, approvals, idempotent writes and audit history",
  },
] as const;

const implementationSequence = [
  {
    detail:
      "Use Shopify's returned checkout URL instead of constructing cart permalinks.",
    label: "Storefront Cart API",
  },
  {
    detail:
      "Convert approved repair shops into companies and assign wholesale terms and catalogs.",
    label: "Native B2B setup",
  },
  {
    detail:
      "Verify signed webhooks, queue changes, and reconcile the Cloudflare projection on a schedule.",
    label: "Continuous synchronization",
  },
  {
    detail:
      "Add a focused operations app inside Shopify Admin for stock, pricing, order exceptions, and reports.",
    label: "Back Glass operations",
  },
] as const;

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main className="console-shell">
      <header className="console-header">
        <div>
          <p className="eyebrow">Commerce operations</p>
          <h1>Back Glass Pros</h1>
        </div>
        <span className="mode-badge">{loaderData.mode}</span>
      </header>

      <section className="status-band" aria-labelledby="platform-status">
        <div>
          <p className="section-label">Operating model</p>
          <h2 id="platform-status">Shopify remains the transaction authority</h2>
          <p className="section-copy">
            The customer storefront can move to Cloudflare without changing the
            screens used to manage products, orders, payments, refunds, and
            fulfillment.
          </p>
          <a
            className="console-primary-link"
            href={loaderData.shopifyAdminUrl}
            rel="noreferrer"
            target="_blank"
          >
            Open Shopify Admin
            <ArrowUpRight aria-hidden="true" size={17} />
          </a>
        </div>
        <dl className="status-facts">
          <div>
            <dt>Shop</dt>
            <dd>{loaderData.storeDomain}</dd>
          </div>
          <div>
            <dt>Admin API</dt>
            <dd>{loaderData.apiVersion}</dd>
          </div>
          <div>
            <dt>Connection</dt>
            <dd>
              {loaderData.credentialsConfigured ? "Connected" : "Not configured"}
            </dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>Shopify Basic</dd>
          </div>
        </dl>
      </section>

      <section className="workstream" aria-labelledby="ownership-workstream">
        <div className="section-heading">
          <p className="section-label">Backend ownership</p>
          <h2 id="ownership-workstream">One operating workflow</h2>
        </div>
        <ol className="milestone-list">
          {operatingModel.map((item) => (
            <li key={item.label}>
              <span
                aria-label={item.state}
                className={`state-indicator state-${item.state}`}
              />
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
              <span className={`state-text state-${item.state}`}>
                {item.owner}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="workstream" aria-labelledby="parity-workstream">
        <div className="section-heading">
          <p className="section-label">Management parity</p>
          <h2 id="parity-workstream">Current and upgraded</h2>
        </div>
        <div className="parity-table">
          <div className="parity-header" aria-hidden="true">
            <span>Workflow</span>
            <span>Current</span>
            <span>Upgrade</span>
          </div>
          {parityWorkstreams.map((item) => (
            <div className="parity-row" key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.current}</span>
              <span>{item.next}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="workstream" aria-labelledby="sequence-workstream">
        <div className="section-heading">
          <p className="section-label">Implementation sequence</p>
          <h2 id="sequence-workstream">Backend work</h2>
        </div>
        <ol className="numbered-worklist">
          {implementationSequence.map((item, index) => (
            <li key={item.label}>
              <span>{index + 1}</span>
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
