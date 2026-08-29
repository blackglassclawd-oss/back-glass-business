# Analytics Tracking Plan

**Status:** `PLAN` only; no implementation authorized; `BASELINE BLOCKED`
**Last updated:** 2026-08-07

## Purpose

The primary success gate is a cross-verified increase in relevant organic
traffic to the changed URL cohort: GSC non-brand organic clicks and GA4 organic
landing traffic must move upward together for at least two comparable windows.
Shopify/business conversions then check traffic quality and commercial value.
Every event below must inform a commercial or product decision. This document
does not prove that any event or property is implemented.

## Current State

- The public Shopify source exposes Judge.me, a Shopify app pixel, and a generic
  custom pixel configuration.
- No public GA4 measurement ID or GTM container ID was found.
- The custom-pixel code and destination are not visible publicly, so GA4/GTM
  status cannot be inferred.
- Signed-in Shopify Customer Events, GA4, GTM, Search Console, and Merchant
  Center could not be inspected because no connected browser session was
  available.
- Do not add another pixel until the existing custom pixel, destinations,
  ownership, consent mode, and duplicate-event risk are reviewed.

## Business Questions

| Question | Decision informed |
| --- | --- |
| Which US organic landing pages create qualified repair-shop accounts? | Prioritize pages and queries by commercial value |
| Which search terms return no useful products? | Fix catalog synonyms, taxonomy, or stock gaps |
| Does Quick Order reduce ten-line order time and increase cart handoff? | Invest in or revise the workflow |
| Where do Shopify handoffs lose lines or buyers? | Fix cart validation and checkout continuity |
| Which model/grade/configuration pages produce purchase and repeat purchase? | Prioritize catalog evidence, inventory, and SEO work |
| Does GEO visibility produce branded search or assisted conversion without a direct AI referral? | Balance citation work with direct SEO and attribution research |

## Event Contract

Use GA4 recommended ecommerce event names where an equivalent exists. Custom
events use lowercase object-action names and carry context in properties.

### Standard Ecommerce Events

| Event | Trigger | Required properties | Decision |
| --- | --- | --- | --- |
| `page_view` | Indexable page rendered | `page_location`, `page_title`, `page_class` | Landing-page and journey analysis |
| `view_item_list` | Collection/model/search results displayed | `item_list_id`, `item_list_name`, `items[]` | Hub and result usefulness |
| `select_item` | Product selected from a list | list context and `items[]` | Navigation effectiveness |
| `view_item` | Product detail rendered | `currency`, `value`, `items[]` | Product-page demand |
| `search` | Sanitized onsite search completed | `search_term_class`, `results_count` | Search success; do not send unsanitized user input |
| `add_to_cart` | Shopify or preview cart accepts line | `currency`, `value`, `items[]` | Product/cart intent |
| `remove_from_cart` | Line removed | `currency`, `value`, `items[]` | Cart friction |
| `view_cart` | Cart rendered | `currency`, `value`, `items[]` | Cart progression |
| `begin_checkout` | Buyer enters Shopify checkout | `currency`, `value`, `coupon`, `items[]` | Checkout funnel |
| `add_shipping_info` | Shopify accepts shipping choice | `shipping_tier`, `items[]` | Shipping friction |
| `add_payment_info` | Shopify accepts payment step | non-sensitive `payment_type`, `items[]` | Payment friction |
| `purchase` | Shopify confirms completed order | unique `transaction_id`, `currency`, `value`, tax, shipping, coupon, `items[]` | Revenue attribution |
| `refund` | Refund or credit recorded | `transaction_id`, `value`, `items[]` | Net revenue and quality guardrail |

### B2B And Quick Order Events

| Event | Trigger | Properties | Decision |
| --- | --- | --- | --- |
| `account_application_started` | First meaningful application interaction | `source_page`, `traffic_channel` | Application funnel start |
| `account_application_submitted` | Valid application accepted | `source_page`, `traffic_channel`; no form fields | Primary lead conversion |
| `qualified_account_approved` | Owner approves repair-shop account | pseudonymous `account_key`, source cohort | Lead quality; private/offline event |
| `quick_order_started` | First Quick Order quantity/search/paste action | `entry_method`, `page_version` | Workflow adoption |
| `sku_paste_processed` | Pasted list parsed | `line_count`, `matched_count`, `ambiguous_count`, `rejected_count` | Parser and catalog quality |
| `quick_order_submitted` | Valid Quick Order proceeds to cart | `line_count`, `unit_count`, `subtotal`, `elapsed_seconds` | Ten-line completion and intent |
| `shopify_cart_handoff_started` | Preview requests Shopify cart | `line_count`, `unit_count`, `subtotal` | Handoff start |
| `shopify_cart_handoff_completed` | Shopify returns a cart/checkout URL with all lines | `line_count`, `unit_count`, `line_loss_count`, `elapsed_ms` | Handoff integrity |
| `catalog_search_no_results` | In-catalog search returns zero products | sanitized `query_class`, `model_family`, `term_type` | Taxonomy or stock gap |
| `reorder_started` | Buyer starts from past order/saved list | `source_type`, `line_count` | Repeat-order adoption |
| `reorder_completed` | Reorder purchase confirmed | pseudonymous cohort, `transaction_id` | Repeat conversion |

`qualified_account_approved`, returns/RMA outcomes, gross profit, and repeat
status should be joined privately from Shopify/accounting sources. Do not expose
customer details, costs, or margins as client-side event properties.

## Item Properties

Use stable IDs and objective catalog data:

- `item_id`: SKU
- `item_name`: approved product title
- `item_brand`: vendor/brand only when accurate
- `item_category`: part type
- `device_family` and `device_model`
- `assembly_type`
- `coil_status`
- `grade`
- `color`
- `price`, `quantity`, and `currency`
- `stock_age_bucket`, not precise private warehouse quantities unless approved
- `catalog_version` or synchronization timestamp bucket

Never send cost, margin, customer name, email, phone, address, tax identifier,
private account tier, free-form application text, support message, raw pasted
content, or order notes to GA4.

## Conversions And Reporting

### Primary conversions

1. `account_application_submitted`
2. `qualified_account_approved`
3. `purchase`
4. `reorder_completed`

### Diagnostic milestones

- `quick_order_submitted`
- `shopify_cart_handoff_completed`
- `begin_checkout`
- `catalog_search_no_results`

### Required views

- United States versus other countries
- Brand versus non-brand organic search
- New versus returning purchasing account
- Landing-page class: home, collection, model hub, product, evidence guide,
  Quick Order
- Device: mobile versus desktop
- Model family, grade, assembly, and coil configuration
- Direct AI referral where visible, assisted AI self-report, and branded-search
  lift tracked separately

## Attribution Boundary

GA4 is a behavioral measurement source, not the financial authority. Shopify
and the accounting source determine orders, refunds, fees, shipping subsidy,
discounts, RMA credits, and gross profit. Join them in a private reporting layer
using controlled pseudonymous keys.

Add a voluntary `How did you hear about us?` field at an appropriate account or
post-purchase step only after owner and privacy review. Store the response in the
private customer system, not as raw GA4 text. Include `ChatGPT or another AI
assistant` as one controlled option so AI-influenced journeys that arrive via
brand search or direct traffic are not invisible.

## Validation Gates

- Inventory every existing app and custom pixel in Shopify Customer Events.
- Confirm owners, destinations, consent/privacy settings, and data access for
  each pixel.
- Choose one supported path for each destination; do not run both a Google tag
  and GTM in ways that double-count events.
- Validate in Shopify Pixel Helper and GA4 DebugView before production use.
- Ensure each purchase uses the Shopify transaction ID and fires once. Test
  refreshes, thank-you page revisits, Shop Pay, PayPal, and mobile checkout.
- Confirm no PII appears in URLs, titles, search terms, event names, event
  parameters, UTMs, or custom dimensions.
- Reconcile at least 20 pilot orders across Shopify and analytics before using
  conversion reports for budget or SEO decisions.
- Require zero cart-line loss and explain any analytics-to-Shopify revenue
  difference before launch approval.

## References

- [Shopify pixels and customer events](https://help.shopify.com/en/manual/promoting-marketing/pixels)
- [Shopify app pixels](https://help.shopify.com/en/manual/promoting-marketing/pixels/app-pixels)
- [Shopify GTM custom-pixel mapping](https://help.shopify.com/en/manual/promoting-marketing/pixels/custom-pixels/gtm-tutorial)
- [Google Analytics ecommerce validation](https://developers.google.com/analytics/devguides/collection/ga4/validate-ecommerce)
- [Google Analytics PII guidance](https://support.google.com/analytics/answer/6366371?hl=en)
