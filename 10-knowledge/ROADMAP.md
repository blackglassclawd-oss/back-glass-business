# Operating Roadmap

**Owner:** CEO function (currently the operator agent + Jason).
**Created:** 2026-08-29.
**Status:** Draft for Jason approval. Supersedes the agent-count and phasing in
the pasted "Agent Operating System v0.1" where the two conflict (see
[`DECISIONS.md`](DECISIONS.md), 2026-08-29 entries).

## Objective

First real, repeatable gross profit from mobile repair-shop orders within 90
days, without new capital, without waiting on the Cloudflare rebuild, and
without any customer-facing claim that is not backed by current evidence.

## Why this shape

The business has ~5 orders and 13 customer records in the last authenticated
export, and no approved unit-economics model. That is too little signal to
justify a five-runtime AI executive team; building it first is the
"optimize the agent system instead of the company" failure the spec itself
names. The live Shopify store already converts with zero marketing, so the
fastest path to cash is: make the live store safe to send traffic to, then
drive repair-shop demand to it directly. The Cloudflare rebuild is real work
but produces no revenue inside 90 days, so it runs in the background at low
priority.

## Structure (lean)

- **One operator / CEO function.** Owns prioritization, the roadmap, and the
  decision record. Does not become the full-time coder, copywriter, or analyst.
- **Two working hats, invoked on demand, not two standing runtimes:**
  - *Commercial hat* — pricing, outbound, quoting, warranty/RMA wording,
    reactivation. Every external or price-committing action needs Michael and/or
    Jason approval per [`BUSINESS.md`](BUSINESS.md) governance.
  - *Build hat* — Shopify fixes, storefront code, fulfillment instrumentation.
- **On-demand opposite-model review** for any material or irreversible call,
  per spec section 16. Reviewer's job is to falsify, not paraphrase.
- **GitHub** is the task list and decision history. Plain issues; skip the label
  taxonomy, mission-contract YAML, and multi-pane runtime until there is a
  reason to parallelize (roughly >50 orders/month).

The five named specialist roles from the spec stay on the shelf and are
activated only when demand-driven work actually requires one.

## Phase 1 — Truth and fulfillment (target: 2 weeks)

Nothing that spends money on acquisition starts until these are answered.

1. **Pricing basis.** Confirm whether the 2026-07-28 sheet is customer selling
   price or internal cost, whether it applies across colors, and its effective
   date. Owner: Michael. (Open decision #3.)
2. **Unit economics for the top 15 SKUs by inventory value** — landed cost
   incl. inbound freight, current sell price, gross margin %. Owner: Michael,
   assembled into [`unit-economics/COGS-REQUEST.md`](unit-economics/COGS-REQUEST.md).
3. **Inventory reality.** What the two Shopify locations physically are, what is
   actually on hand, who updates counts, and replenishment lead time. Owner:
   Michael + Jason. (Open decision #5.)
4. **Fulfillment proof.** Place and ship 5-10 real orders end to end; record
   lead time, pick accuracy, actual parcel cost vs. charged. Owner: build hat +
   Michael.
5. **Warranty / RMA in one paragraph** a repair shop can be quoted before their
   first order — term, evidence required, refund vs. replacement, return
   freight. Owner: Michael. (Open decisions #6.)
6. **Shipping economics.** Confirm or kill "free over $150" against real parcel
   cost and average order value. Owner: Michael + Finance review.
7. **Store trust pass.** Fix only Shopify issues that block checkout or
   credibility: broken/placeholder images, missing warranty/shipping page,
   the duplicate "do-not-delete" collections, and the Full Assembly collection
   that contradicts recorded catalog direction. Owner: build hat. No price,
   publication, or deletion without approval.

**Primary metric to approve (Open decision #11):** repeat gross profit per
active account, after payment fees, shipping subsidy, discounts, and RMA
credits. Guardrails: gross margin % floor, stock-accuracy %, order-accuracy %.

## Phase 2 — Reactivate and pilot (target: weeks 3-6)

1. Reactivate existing and lapsed accounts with SKU-specific buy-again links
   (pre-authorized campaign scope, wording approved once).
2. Outbound to 20-40 US repair shops matching the existing customer profile;
   first-order incentive; log every price / warranty / stock objection
   verbatim.
3. Run the quick-order pilot with 3-5 active shops; instrument search,
   cart handoff, and order time against the launch gates in
   [`../01-software/backglass-ecommerce/docs/B2B_GROWTH_PLAN.md`](../01-software/backglass-ecommerce/docs/B2B_GROWTH_PLAN.md).

## Phase 3 — Decide the multipliers (target: weeks 7-12)

With real CAC, repeat rate, and per-SKU margin in hand, decide:

1. Whether a wholesale / net-terms deal with a mid-size repair chain or regional
   distributor is worth pursuing (BizDev activates here, not before).
2. Whether narrow high-intent paid search clears margin.
3. Whether and when the Cloudflare storefront is allowed to reach production
   (Open decision #10).

## First three missions

See [`missions/`](missions/). Summary:

| ID | Owner | Deliverable | Accept when |
| --- | --- | --- | --- |
| M1 | Michael | Pricing basis answer + top-15 SKU margin table | Table filled: SKU, landed cost, sell price, margin %; sheet basis stated |
| M2 | Build hat + Michael | 5-10 real orders shipped and measured | Written log of 5+ shipped orders with lead time, pick accuracy, parcel cost vs charged; failure points listed |
| M3 | Commercial hat (Michael sign-off) | One-paragraph warranty/RMA policy + reactivation email to existing accounts, drafted | Policy approved by Michael; email drafted and reviewed; not yet sent |

## Approval gates (unchanged from spec section 14)

Autonomous: research, analysis, internal docs, code in branches, local tests,
drafts, financial models. Requires Jason (and Michael where product/catalog):
production deployment, any external message unless the campaign is
pre-authorized, price or contract commitments, spending money, publishing
supplier media, DNS cutover, destructive production changes, customer-policy
changes.
