# Automation Scope

## Initial read workflows

- Shop settings and domain inventory
- Product, variant, media, and collection export
- Inventory levels by location
- Order and fulfillment export
- Pages, blogs, policies, redirects, files, themes, and navigation inventory
- Installed app and integration inventory
- Daily operational report generation

## Initial event workflows

- Product create, update, and delete
- Inventory item and level changes
- Order creation, update, cancellation, and fulfillment
- Content and file changes where Shopify exposes supported events
- Bulk operation completion

## Planned Cloudflare resources

- Workers: storefront, webhook ingress, protected admin APIs
- R2: immutable export and media backups
- D1: resource mappings, sync checkpoints, job history, audit records
- Queues: webhook buffering, retries, batch processing
- Workflows or Cron Triggers: reconciliation, backups, reports
- Access: migration console and operational endpoints

Resource IDs and bindings are intentionally deferred until the Cloudflare
account exists.

## Management boundary

Shopify Admin remains the primary operating interface during the initial
migration. Cloudflare should not duplicate product, order, payment, refund, and
fulfillment screens that Shopify already provides.

Focused Back Glass Pros workflows should be added inside Shopify Admin through
an embedded app or admin extensions:

- compatibility and color matrix
- staged price approvals
- low-stock and inventory mismatch queue
- order and fulfillment exceptions
- wholesale saved lists and reorder
- operational reports and synchronization health

See `docs/BACKEND_AND_PAYMENTS.md` for the authority model and payment flow.

## Write controls

Write scopes are not part of the initial app version. Before enabling writes:

1. Capture a complete export.
2. Add dry-run and diff output.
3. Add idempotency keys and retry tests.
4. Define rollback for the resource.
5. Obtain owner approval for the workflow.
