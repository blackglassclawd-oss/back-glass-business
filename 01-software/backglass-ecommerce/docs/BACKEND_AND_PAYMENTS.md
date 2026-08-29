# Backend and Payments

## Decision

For the first migration milestone, Shopify remains the commerce and transaction
authority. Cloudflare owns the customer-facing storefront, synchronized data
projection, backups, reports, and focused wholesale workflows.

This keeps the existing Shopify Admin experience for store management and avoids
moving card data, tax, shipping, refunds, and order state into a new system
during the initial migration.

## Live baseline

Observed through the Shopify Admin API on July 28, 2026:

- Plan: Shopify Basic
- Products: 84
- Variants: 384
- Orders: 5
- Customers: 13
- B2B companies: 0
- Active inventory locations: 2
- Active markets: 1
- Installed migration-app access: read-only
- Checkout: enabled in USD
- Payment configuration: Shopify Payments, PayPal, Apple Pay, and Google Pay
- Not configured: Amazon Pay and third-party offsite gateways

The five captured orders are paid. Four are fulfilled and one is unfulfilled.
Operational snapshots contain no payment credentials or card data.

## System authority

| Workflow | Initial authority | Cloudflare responsibility |
| --- | --- | --- |
| Products and variants | Shopify Admin | Search projection, fitment model, media backup |
| Inventory | Shopify Admin | Low-stock views, reconciliation, alerts |
| B2B accounts and terms | Shopify Admin | Buyer context, saved lists, account reporting |
| Cart | Shopify Storefront API | Cart session and line validation |
| Checkout and payments | Shopify checkout | Redirect to the returned checkout URL |
| Orders and refunds | Shopify Admin | Read projection, exception alerts, reporting |
| Fulfillment | Shopify Admin | Pick-list and exception views |
| Content | Shopify Admin | Cloudflare delivery and asset backup |
| Reports | Shopify plus Cloudflare | Wholesale-focused operational summaries |

## Target architecture

```text
Repair-shop buyer
  -> Cloudflare Worker storefront and commerce BFF
      -> Shopify Storefront API for live products, price, availability, and cart
      -> Shopify Customer Account API for buyer and company-location context
      -> D1 for saved lists, synchronization state, jobs, and audit records
      -> R2 for immutable exports, media, and backup manifests
  -> Shopify hosted checkout and payment processing
  -> Shopify orders, refunds, inventory, and fulfillment

Shopify webhooks
  -> HMAC-verifying Worker
  -> Cloudflare Queue
  -> D1 projection and R2 event archive
  -> scheduled reconciliation and alerts
```

## Payment processing

The first release does not handle card details in Cloudflare code.

1. Cloudflare creates or updates a Shopify Storefront API cart.
2. Buyer identity and company-location context are attached when available.
3. Price, availability, discounts, shipping, and cart warnings are revalidated.
4. The Worker requests the cart's current `checkoutUrl`.
5. The browser redirects to Shopify's hosted checkout.
6. Shopify creates the order and remains responsible for authorization,
   capture, fraud checks, taxes, receipts, refunds, and disputes.

Direct `/cart/<variant>:<quantity>` links are a temporary fallback. They will be
replaced because they do not provide the same buyer identity, B2B context,
validation, and cart lifecycle as the Storefront Cart API.

Stripe or another direct processor is deferred until Shopify retirement is a
separate approved project. A replacement must cover tax, shipping, fraud,
refunds, disputes, saved payment methods, receipts, reconciliation, and PCI
scope before it can become the order authority.

## Familiar management workflow

The owner continues to use Shopify Admin for:

- products, variants, colors, prices, images, and publishing
- inventory quantities and transfers
- customers, companies, terms, tax exemptions, and addresses
- orders, draft orders, payment status, refunds, and returns
- fulfillment, tracking, and notifications
- discounts, pages, navigation, and reports

A focused embedded Shopify app can add Back Glass Pros-specific workflows
without creating a second admin system:

- model, grade, assembly, coil, and color matrix
- staged price changes with old/new values and approval
- low-stock and inventory-mismatch queue by location
- order and fulfillment exceptions
- saved wholesale order lists and buy-again
- daily sales, stock, fulfillment, and repeat-account report
- synchronization health, retries, and audit history

## B2B setup on Shopify Basic

Shopify Basic supports the initial company, company-location, catalog, quantity
rule, volume pricing, and net-term workflows. The current store has no company
records, so the 13 customer records must be reviewed before enabling B2B
context.

Use no more than three active B2B market catalogs on Basic. Direct catalogs for
individual companies, deposits, and partial payments require a later plan or
architecture decision.

Initial account model:

- Standard repair shop
- Volume repair shop
- Negotiated or pilot account

Do not assign a customer to a tier until pricing rules, tax status, terms, and
approval ownership are documented.

## Implementation order

1. Confirm settlement ownership, shipping workflow, refund procedure, and the
   owner's daily Shopify Admin tasks.
2. Install or configure Shopify's Headless channel and obtain Storefront and
   Customer Account API credentials.
3. Replace direct cart links with server-side Storefront Cart API operations and
   returned checkout URLs.
4. Create and pilot B2B companies, company locations, terms, and up to three
   wholesale catalogs.
5. Add HMAC-verified webhooks, Queue processing, D1 projection, R2 archives, and
   scheduled reconciliation.
6. Add the embedded operations surface inside Shopify Admin.
7. Pilot with repair shops and test rollback before routing the production
   domain to Cloudflare.

## Launch gates

- Price and stock parity is at least 99.5%.
- Fifty test carts have zero missing, duplicated, or substituted lines.
- A ten-line order can be completed in under three minutes.
- At least 20 pilot orders complete through Shopify checkout.
- Company pricing, terms, tax status, purchase order number, and location survive
  the checkout handoff.
- Webhook retries, idempotency, reconciliation, alerts, and rollback are tested.
- The owner can complete product lookup, inventory adjustment, draft order,
  fulfillment, refund, customer lookup, and reorder in the familiar Shopify
  Admin.
- Shopify remains available as the immediate storefront and checkout rollback.

## Current references

- [Shopify B2B features by plan](https://help.shopify.com/en/manual/b2b/getting-started/plan-features)
- [Shopify companies and customers](https://help.shopify.com/en/manual/b2b/companies-and-customers)
- [Shopify Storefront Cart API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
- [Shopify headless B2B](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b)
- [Shopify Admin app integration](https://shopify.dev/docs/apps/build/integrating-with-shopify)
