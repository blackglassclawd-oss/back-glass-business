# Short-Term Plan

## Objective

Secure the brand domain, stage the new price sheet without changing live
prices, obtain private Shopify data, and prepare a small repair-shop ordering
pilot.

## Next 48 Hours

1. Register `backglasspros.com` for one year after checkout confirms a standard
   registration price and no paid add-ons. Complete.
2. Enable Porkbun MFA, WHOIS privacy, auto-renew, and recovery codes. Privacy,
   auto-renew, and registrar lock are complete; MFA and recovery codes remain.
3. Confirm whether the July 28 sheet contains customer selling prices or
   internal costs.
4. Confirm whether the prices apply per color variant and whether they replace
   or supplement current Shopify pricing.
5. Add `backglasspros.com` to Cloudflare and authenticate Wrangler without
   changing authoritative nameservers yet. Complete on the Free plan.
6. Restore Shopify Admin automation through the Chrome plugin or Admin API.
   Complete through a read-only Admin API app.
7. Export products, inventory, customers, orders, discounts, shipping, refunds,
   redirects, files, themes, and installed-app inventory in read-only mode.
   Products, inventory, and orders are complete; remaining datasets are pending.
8. Deploy and verify the visual clone on Cloudflare without changing production
   DNS. Complete at
   `https://backglass-ecommerce.backglasspros.workers.dev`.

## Days 3-7

1. Reconcile the staged price sheet against Shopify without deleting anything.
2. Keep blank sheet cells and models not currently sold as drafts.
3. Keep active products missing from the sheet unchanged and flag them for
   review.
4. Define A Grade versus Premium and AM versus Original flex-cable criteria.
5. Verify the current shipping cutoff, free-shipping threshold, warranty, and
   RMA policy.
6. Add model, grade, assembly, coil, color, stock age, and compatibility fields
   to the migration data model.

## Days 8-14

1. Create a reviewed Shopify price-change preview with old price, proposed
   price, margin impact, and affected variants.
2. Add the drafted iPhone 16e and iPhone 17 family without publishing them.
   The iPhone 17 family is now published only on the Cloudflare owner-review
   route; Shopify draft creation remains pending.
3. Add charging-flex products as drafts until inventory, photos, SKUs, and
   descriptions are confirmed.
4. Pilot the quick-order builder with three to five existing repair shops.
5. Measure ten-line order time, search failures, cart-line accuracy, and buyer
   questions.
6. Prepare canonical domain, redirect, and Cloudflare DNS changes without
   cutting over checkout.

## Price-Sheet Handling

The source has been transcribed to
`data/pricing/draft-price-sheet-2026-07-28.json`.

- Ten models match the captured catalog.
- iPhone 16e and the four iPhone 17 models are staged as draft models.
- Charging-flex entries remain staged because that product type is absent from
  the captured catalog.
- All 46 populated prices are staged as proposals.
- Every one of the 14 blank cells is retained as an explicit draft with `null`
  price.
- Existing products missing from the sheet remain untouched.
- No live storefront or Shopify price has been changed.

## Decision Gate

Do not publish, synchronize, or advertise the sheet until the owner confirms:

1. Selling price versus internal cost.
2. Retail, wholesale, or account-specific price tier.
3. Whether each price applies to every color.
4. Effective date and whether current Shopify prices should be replaced.
5. Inventory availability for each newly drafted product.
