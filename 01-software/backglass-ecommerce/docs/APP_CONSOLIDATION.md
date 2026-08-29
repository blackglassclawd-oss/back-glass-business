# Shopify App Consolidation

## Live inventory

Observed through the Shopify Admin API on July 28, 2026:

| Workflow | Installed apps |
| --- | --- |
| Migration | Back Glass Migration |
| Quick order and bulk cart | C: Bulk Add to Cart; Extend B2B Quick Order; InstaBuy Quick Order Forms; Prezen Wholesale Order; Webkul Quick Order |
| Shipping and labels | Labeler; UPS Shipping (Official); Veeqo |
| Reviews and trust | Judge.me Reviews; TrustedSite |
| Loyalty and messaging | BON Loyalty; Chatty; Messaging |
| Merchandising | Search & Discovery; TA Banner & Pop-up; TA Labels & Badges; Yodel |
| Other | Shogard |

The inventory confirms five overlapping quick-order apps. Subscription prices
and current billing cannot be read with the migration app's approved read
scopes and must be reviewed in Shopify Admin.

## Consolidation rules

- Do not uninstall an app until its configuration and owned data are exported.
- Identify theme blocks, scripts, webhooks, discounts, metafields, and checkout
  dependencies before disabling an app.
- Confirm which app the owner uses for each daily task.
- Test the replacement with real catalog variants and pilot orders.
- Keep a one-step rollback for at least one billing cycle.
- Remove an app only after the owner approves its replacement and data export.

## Proposed disposition

### Preserve during the first milestone

- Back Glass Migration for authenticated exports and diagnostics.
- Search & Discovery until Cloudflare search and merchandising are measured.
- Judge.me Reviews until review data, widgets, and SEO markup are exported.
- The shipping system used to buy labels and send tracking. Determine whether
  that is UPS Shipping, Veeqo, Shopify Shipping, or a combination.

### Consolidate after dependency review

- Select one temporary Shopify quick-order fallback while the Cloudflare quick
  order and Storefront Cart API are piloted.
- Replace the other four quick-order apps only after cart-line parity and saved
  list requirements pass.
- Determine whether Labeler is required for shipping, product labels, or both.
- Review BON Loyalty against the B2B company, pricing, and retention plan.

### Likely storefront-only replacements

- Chat, messaging, banners, badges, trust widgets, and merchandising scripts
  should not be copied automatically into the Cloudflare storefront.
- Each should be retained only when it has a measured customer or operational
  role and a compatible headless integration.

## Required workflow interview

Record the owner's current steps for:

1. Finding and editing a product, color, image, SKU, and price.
2. Adjusting inventory at each location.
3. Receiving, picking, labeling, shipping, and tracking an order.
4. Refunding or replacing an item.
5. Creating a phone, email, or wholesale draft order.
6. Managing repair-shop pricing, terms, tax status, and addresses.
7. Reviewing sales, stock, fulfillment, and customer reports.
8. Using quick order, loyalty, reviews, chat, labels, or banners.

The embedded Back Glass operations app should improve these steps without
moving the owner into a separate admin system.
