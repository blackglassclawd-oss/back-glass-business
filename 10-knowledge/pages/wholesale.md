# Wholesale page (draft)

**Status:** Draft, unpublished. Shopify page `wholesale` (handle `/pages/wholesale`)
created 2026-10-10 with `isPublished: false` and the theme's `contact` template,
so the theme's contact form renders under the copy as the sign-up form.
**Owner:** Wholesale page thread. **Publish gate:** Jason; product facts: Michael.

Source of the page body: [`wholesale.html`](wholesale.html). Shopify is the copy
people will see; keep this file in step when the page changes.

## Where each fact comes from

| Section | Source | Status |
| --- | --- | --- |
| Price list | Live Shopify product prices, read 2026-10-10 | Public already; set the "as of" date at publish |
| Volume tiers | Proposal (5% at 50+, 10% at 100+) | Needs Michael |
| Minimum order | Proposal (none on store, $100 for wholesale pricing) | Needs Michael |
| Dallas same-day delivery | Jason, 2026-10-10 | Needs area and cutoff |
| National shipping | Unknown | Needs Michael (carrier, origin, days, free threshold) |
| Warranty and returns | Published Return, Refund, and Exchange Policy page | Matches live policy |
| iPhone 17 series, coils | Owned by the listings thread | Add rows when live |

## Open conflict

The July 28 price sheet overlaps the store's half-assembly prices. If that
sheet is supplier cost, some store prices may be at or below cost, and the
price list must change before this page goes live. Michael checks this; no
cost figures go in this repo.

## Before publishing

1. Michael fills every `[bracket]`.
2. Delete the "DRAFT, NOT PUBLISHED" line.
3. Jason publishes in Shopify admin (Online Store > Pages > Wholesale) and
   adds it to the main menu.
4. Submit one test application through the form and confirm it reaches the
   store's contact email.
