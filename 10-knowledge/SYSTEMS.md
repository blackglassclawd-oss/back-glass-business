# Systems

## Authority map

| Domain | Current authority | Migration posture |
| --- | --- | --- |
| Products, variants, inventory | Shopify Admin | Read-only export and staged diffs |
| Checkout, payments, tax | Shopify | Keep Shopify checkout during gradual migration |
| Orders, refunds, fulfillment | Shopify Admin | Do not duplicate before workflow interviews |
| Public storefront preview | Cloudflare Worker | Preview only; production cutover not approved |
| Domain registration | Porkbun | Registered; security setup partly documented |
| DNS | Porkbun authoritative, Cloudflare staged | Nameserver cutover pending |
| Local implementation | `01-software/backglass-ecommerce` | Active but uncommitted and without a remote |
| Product media masters | `02-assets/shopify-website` | Preserve originals and provenance |
| Project memory and decisions | `10-knowledge` plus repository docs | Buzz integration pending |

## Active software

The Cloudflare/React Router implementation supports a captured catalog,
product pages, quick order, Shopify cart handoff, migration reviews, public
status checks, and protected Shopify diagnostics. Its local preview still
returned HTTP 200 after consolidation.

Critical repository risk: the active repository has no commits and no Git
remote. The working tree is therefore the only version history for current
implementation work.

## Private data and secrets

- `.dev.vars` contains owner-only credentials and is ignored.
- `backups/admin/` contains products, inventory, and order exports and is
  ignored.
- Order/customer data, costs, margins, credentials, and correspondence must not
  enter public artifacts or logs.
- The August 6 product, inventory, and order export completed with hashes. The
  inventory and order hashes are unchanged across the available backups.

## Known operational gaps

- Remaining Shopify data/configuration exports are incomplete.
- Storefront API and Customer Account credentials are pending.
- B2B company/catalog/terms setup is pending.
- Webhooks, queues, reconciliation, write audit records, and rollback tests are
  pending.
- Installed-app consolidation is pending; five quick-order apps overlap.
- Buzz has not been installed, deployed, or connected.

## Source documents

- [`../01-software/backglass-ecommerce/README.md`](../01-software/backglass-ecommerce/README.md)
- [`../01-software/backglass-ecommerce/docs/MIGRATION_RUNBOOK.md`](../01-software/backglass-ecommerce/docs/MIGRATION_RUNBOOK.md)
- [`../01-software/backglass-ecommerce/docs/BACKEND_AND_PAYMENTS.md`](../01-software/backglass-ecommerce/docs/BACKEND_AND_PAYMENTS.md)
- [`../01-software/backglass-ecommerce/docs/APP_CONSOLIDATION.md`](../01-software/backglass-ecommerce/docs/APP_CONSOLIDATION.md)

