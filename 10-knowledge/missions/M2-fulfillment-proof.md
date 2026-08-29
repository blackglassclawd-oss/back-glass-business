# M2 — Prove fulfillment end to end

- **Objective:** Confirm we can reliably ship what an outreach push would sell,
  and know the real per-order logistics cost.
- **Owner:** Build hat (instrumentation) + Michael (physical pick/pack/ship).
- **Scope — read:** Shopify orders, shipping settings, the two inventory
  locations. **Write:** `03-data/fulfillment-log-2026-08.md` (local only).
- **Non-goals:** No Shopify workflow automation yet. No production storefront
  changes. No inventory-count writes without Jason approval.
- **Authority:** Observe and record real orders that would happen anyway; do not
  create fake orders that move money.
- **Deliverable:** Written log of 5-10 real shipped orders.
- **Acceptance:** For ≥5 orders — order date, lines, pick accuracy (correct
  part y/n), time from order to handoff, actual parcel cost vs. amount charged,
  and every failure point encountered.
- **Priority:** P0 — an outreach push that creates unfillable orders is
  net-negative.
