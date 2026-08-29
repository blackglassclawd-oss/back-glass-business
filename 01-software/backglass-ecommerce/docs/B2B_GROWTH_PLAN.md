# B2B Growth And Ordering Plan

## Position

Back Glass Pros should be the specialist ordering system for rear smartphone
repair parts:

> Right model. Right color. Right assembly. Known delivered cost.

Compete on selection accuracy and purchasing efficiency, not general-parts
breadth or unsupported quality claims.

## Evidence-Backed Selling Points

1. **Correct-part confidence:** model, generation, color, grade, assembly, coil,
   camera configuration, adhesive, and included components.
2. **Defined quality:** published Premium and A Grade construction, tolerances,
   QC, observed defect-credit rate, and warranty.
3. **Stock confidence:** available, low stock, or ETA with a synchronization
   timestamp.
4. **Known delivered cost:** unit and tier pricing, shipping threshold, tax
   status, and estimated delivered unit cost.
5. **Predictable fulfillment:** a cutoff and transit range supported by actual
   shipment data.
6. **Low-friction recovery:** plain RMA eligibility, evidence, resolution time,
   and return-freight responsibility.

Every public claim needs an owner, data source, calculation, and review
interval.

## Catalog Findings

The July 26 public snapshot contains:

- 66 products and 312 variants
- 312 available variants and no missing or duplicate SKUs
- 310 product images, all without source alt text
- one product type, `Back Glass`, and one vendor, `Apple`
- 36 Premium products and 30 A Grade products
- variant prices from $3 to $35, with a $9 median

Before launch:

- Define objective Premium versus A Grade criteria.
- Add model, assembly, coil, grade, color, compatibility, included-component,
  warranty, and inventory-age fields.
- Review equal Premium/A Grade prices where the distinction is unclear.
- Remove temporary or copy handles through permanent redirects.
- Add meaningful image alt text and model/category navigation.
- Verify the historical same-day shipping and $150 free-shipping claims.

## Ordering Workflow

The local clone now supports variant-level quantity entry, pasted
`SKU, quantity` lists, estimated subtotal, and one Shopify cart handoff.

Next sequence:

1. Pilot the builder with 8 to 12 recurring repair-shop customers.
2. Add Storefront API cart creation to preserve buyer identity and account
   pricing.
3. Add shorthand search such as `15PM black full coil`.
4. Add buy-again, saved lists, favorites, and multi-location lists.
5. Show stock age, price tiers, shipping threshold, tax status, and delivered
   cost.
6. Revalidate all lines before checkout and never silently substitute.

## Channel Priority

1. Reactivate existing and lapsed customers using SKU-specific buy-again links.
2. Send replenishment prompts based on observed reorder intervals.
3. Build indexable model hubs and synchronize Merchant Center listings.
4. Conduct targeted repair-shop account outreach.
5. Partner with repair trainers, tool vendors, and equipment suppliers.
6. Test narrow high-intent paid search after conversion tracking is reliable.

Social content should provide operational proof: grade comparisons, fitment,
QC, included parts, stock arrivals, repair-shop outcomes, and RMA resolution.
Broad social advertising and generic repair articles are lower priority.

## SEO And GEO

- Maintain one canonical domain and permanent redirect map.
- Link model/category hubs to every product.
- Add accurate ProductGroup/Product, Offer, shipping, returns, breadcrumb, and
  organization structured data.
- Synchronize variant price and stock with Merchant Center.
- Publish original grade, QC, fitment, and defect evidence.
- Treat GEO as evidence-rich SEO, not a separate content-volume tactic.

References:

- [Google ecommerce site structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure)
- [Google product variants](https://developers.google.com/search/docs/appearance/structured-data/product-variants)
- [Google generative AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Shopify Storefront Cart](https://shopify.dev/docs/api/storefront/latest/objects/cart)

## Thirty-Day Sequence

### Days 1-5: Establish Truth

- Export order-line, customer, discount, shipping, refund, and RMA data.
- Baseline account profitability, reorder interval, order time, search success,
  stock mismatch, order accuracy, and RMA rate.
- Inventory every public claim.

### Days 6-12: Normalize

- Complete required fields for all 312 variants.
- Define grades, warranty, shipping, and RMA policy.
- Create model taxonomy, canonical URLs, redirects, and Merchant feed.

### Days 13-20: Pilot

- Test at least 50 carts with 8 to 12 active accounts.
- Instrument search, quantities, handoff, checkout, and purchase.
- Add saved lists and buy-again after observing pilot behavior.

### Days 21-30: Acquire And Iterate

- Reactivate lapsed accounts with SKU-specific links.
- Launch highest-intent model pages and free Merchant listings.
- Test narrow paid-search groups and correct pilot friction.

## Launch Gates

- 100% required catalog-field completeness
- 100% public claims tied to evidence
- at least 99.5% price and stock parity
- zero lost cart lines across QA handoffs
- under 3 minutes for a ten-line pilot order
- under 5% zero-result searches for in-catalog queries
- at least 95% Merchant feed approval
- at least 20 completed pilot orders

The north-star metric is repeat gross profit per active account after payment
fees, shipping subsidy, discounts, and RMA credits.
