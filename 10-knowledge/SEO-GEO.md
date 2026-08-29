# SEO And GEO

**Overall status:** `SEO/GEO RESEARCH ONLY` — `BASELINE BLOCKED`.

No live SEO/GEO implementation or performance result is established by this
document. The earlier phrase “Phase 0 is complete” meant only that planning
documents had been drafted; it did not mean that measurement, implementation,
deployment, indexing, or performance verification was complete.

## Objective

Increase qualified US discovery for Back Glass Pros through traditional Google
Search and evidence-based generative discovery. The commercial objective is not
traffic by itself; it is profitable acquisition and repeat ordering from mobile
repair shops.

Google rankings cannot be guaranteed. "Top three" means positions 1-3 for an
approved portfolio of high-intent, non-branded US queries, measured from a
fixed baseline rather than a site-wide claim.

## Measurement Contract

The primary success gate is a visible increase in relevant organic traffic to
the changed URL cohort. Search Console non-brand organic clicks and GA4 organic
landing traffic must show the same sustained upward direction across at least
two comparable reporting windows. If they disagree, the result is
`INCONCLUSIVE` until reconciled. Shopify/business conversions are an additional
quality and commercial-value check; rankings, documents, pages, indexing, or AI
citations do not independently establish success.

Use these result and diagnostic metrics:

| Metric | Definition | Source |
| --- | --- | --- |
| Top-3 share | Target queries in positions 1-3 / tracked target queries | Rank tracker plus Search Console validation |
| Top-10 share | Target queries in positions 1-10 / tracked target queries | Rank tracker plus Search Console validation |
| US non-branded clicks | Organic clicks excluding brand queries, country = United States | Google Search Console |
| Qualified organic conversion | Approved repair-shop account, Quick Order, or purchase attributed to organic entry | GA4 plus Shopify |
| Organic gross profit | Gross profit after payment, shipping subsidy, discounts, and RMA credits | Shopify plus accounting source |
| Repeat gross profit per active account | Repeat gross profit / active purchasing accounts | Shopify plus accounting source |

Track rankings, impressions, click-through rate, indexation, Merchant feed approval, rich
result validity, zero-result search rate, and assisted conversions as diagnostic
metrics. Do not claim success from rankings, indexing, citations, or only one
traffic source.

No numerical ranking target or deadline should be approved until the target
query set, starting positions, search demand, and conversion baseline are
recorded. This prevents an arbitrary target from masquerading as a forecast.

## Public Technical Snapshot (Not A Performance Baseline): 2026-08-07

This was a read-only crawl from Taiwan of the US English storefront. It is a
technical snapshot, not a US Google Search Console export.

### Authority and discovery

- `https://backglasspros.com/` currently returns HTTP 200 from Shopify.
- DNS points the apex to Shopify, and `www` aliases to Shopify. Porkbun remains
  authoritative DNS. The Cloudflare build is not the public storefront.
- `robots.txt` allows public product, collection, page, blog, and policy HTML
  and declares `https://backglasspros.com/sitemap.xml`.
- The sitemap exposes 70 traditional HTML URLs and one agent-facing Markdown
  URL: home, 54 product URLs, six pages, eight collections, one blog index, and
  `agents.md`.
- All 71 discovered URLs returned HTTP 200 during the crawl.
- A general web-discovery proxy did not return Back Glass Pros for the exact
  brand or `site:backglasspros.com` checks. This is a warning signal, not proof
  of Google non-indexation. Google Search Console is required for the decision.

### Crawl and metadata findings

The following counts exclude `agents.md` where HTML metadata does not apply:

| Finding | Count | Priority |
| --- | ---: | --- |
| HTML URLs returning 200 | 70 / 70 | Healthy baseline |
| Missing HTML titles | 0 | Healthy baseline |
| Missing canonical links | 0 | Healthy baseline |
| `noindex` directives | 0 | Review intentionality |
| Missing meta descriptions | 12 | High |
| HTML pages without an H1 | 1 (`/pages/contact`) | Medium |
| Pages sharing the `All Products` title | 2 | High |
| Product URLs with Product/ProductGroup/Offer schema | 54 / 54 | Healthy baseline |
| URLs with detected BreadcrumbList schema | 0 | High |
| Product URLs with detected shipping or return schema types | 0 | High |

The homepage title is `Back Glass Pro - Back Glass Pros`, its H1 is only the
brand, and its meta description is empty. It does not clearly state B2B,
wholesale, iPhone, rear assembly, repair-shop, or US buying intent.

Twelve HTML URLs with missing descriptions include the homepage, Contact, FAQ,
News, Quick Order, All Products, the grade collections, and the current
assembly collections.

Two public, indexable app-generated collection URLs create duplicate or
internal-looking search surfaces:

- `/collections/do-not-delete-all-products-generated-by-extend-commerce`
- `/collections/do-not-delete-all-products-generated-by-extend-commerce-1`

The public collection
`/collections/full-assembly-with-charging-coil` also conflicts with the
recorded direction to stop offering Full Assemblies. It must be reconciled in
Shopify before any SEO recommendation treats it as a target landing page.

The sitemap's 54 live product URLs also differ from the 2026-07-26 public
capture of 66 products and the 2026-08-06 authenticated export of 84 product
roots. These are different populations; a Shopify status reconciliation must
explain the difference before page production or deletion.

### Measurement access snapshot

**Status:** `BASELINE BLOCKED`.

- The available browser-control session exposed no Chrome or in-app browser, so
  signed-in Google Search Console, GA4, Merchant Center, Keyword Planner, and
  Semrush data could not be inspected.
- No public Google site-verification token was found in the homepage source or
  apex TXT records. This does not prove that no Search Console property exists.
- No public GA4 measurement ID or GTM container ID was found in the current
  homepage source or Cloudflare-preview codebase.
- Shopify Web Pixels expose Judge.me, a Shopify app pixel, and a generic custom
  pixel configuration. The custom-pixel code and destination are not public, so
  the scan cannot determine whether GA4 or another destination is configured.
- Account and performance state therefore remain **access-blocked**, not
  "absent." No property should be created until current ownership is confirmed.

### AI discovery controls

- Current `robots.txt` allows public content under the wildcard group and does
  not name-block `OAI-SearchBot` or `PerplexityBot`.
- For ChatGPT search and citations, the relevant OpenAI crawler is
  `OAI-SearchBot`; `GPTBot` is a separate training control.
- Google AI Overviews and AI Mode use normal Google Search eligibility and
  Googlebot controls. `Google-Extended` does not affect inclusion or ranking in
  Google Search.
- Perplexity distinguishes its search crawler, `PerplexityBot`, from
  user-triggered fetching.
- Do not add `llms.txt` or bot-specific rules merely because a community skill
  suggests them. Change crawler controls only for a documented business or
  privacy decision and verify the result in logs.

## Initial Query Architecture

The final portfolio should contain 20-50 commercially meaningful queries. The
following are research clusters, not approved keywords and not statements of
search volume:

1. **Category intent:** `wholesale iphone back glass`, `iphone back glass
   supplier`, `iphone rear glass wholesale`, `cell phone back glass wholesale`.
2. **US distributor intent:** category terms combined with `USA`, `US supplier`,
   `Dallas`, `same day shipping`, or `repair shop`; location and shipping claims
   may be used only after operational verification.
3. **Model intent:** `[iphone model] back glass wholesale`, `[iphone model] rear
   assembly`, `[iphone model] back glass with frame`.
4. **Configuration intent:** model plus `half assembly`, `without charging coil`,
   color, and verified grade.
5. **Problem and comparison intent:** verified fitment, included components,
   assembly differences, grade definitions, QC, and RMA questions asked by
   professional repair shops.

Exclude consumer repair-service intent, automotive back-glass intent, unsupported
`OEM` claims, obsolete Full Assembly targets, and informational topics without a
credible route to repair-shop revenue.

## Competitor Research Set

Start with distributors already present in project evidence or current
discovery results:

- MobileSentrix and PhoneLCDParts for catalog, imagery, fitment, and supplier
  positioning comparisons.
- Parts4Cells, Ufoneparts, Express Parts, Kracked Screens, and iCell4Less for US
  repair-parts query coverage.
- Mobileparts.shop and MobiPhix for grade definitions, stock evidence, warranty,
  and B2B content patterns.

Inclusion here is not an endorsement or proof of current US ranking. Each
profile must record target query, country/device, observed position and date,
landing page, offer, structured data, content evidence, backlinks or mentions,
and a commercially testable recommendation.

The first quick profiles are in
[`competitor-profiles/_summary.md`](competitor-profiles/_summary.md). The working
query-to-page map is in
[`SEARCH-ARCHITECTURE.md`](SEARCH-ARCHITECTURE.md).

The event and attribution contract is in
[`ANALYTICS-TRACKING-PLAN.md`](ANALYTICS-TRACKING-PLAN.md).

## Work Sequence

### Required Baseline — NOT COMPLETE (`BASELINE BLOCKED`)

1. Confirm whether Google Search Console, GA4, Merchant Center, Google Ads
   Keyword Planner, and Semrush accounts exist and who owns them.
2. In Search Console, verify the domain property, submit the current sitemap,
   and export the last 16 months of query/page/device data filtered to the
   United States. Keep brand and non-brand reporting separate.
3. Record indexed/excluded URLs, crawl findings, rich-result status, Merchant
   diagnostics, manual actions, and security issues.
4. Define GA4 events for account application, Quick Order use, search success,
   add to cart, Shopify handoff, checkout, purchase, and repeat purchase.
5. Join landing-page performance to Shopify orders and private gross-profit
   data without exposing customer, cost, or margin details in public artifacts.

### Phase 1: Correct authority and index surfaces

1. Reconcile 54 live product URLs against the public and authenticated catalog
   evidence. Delete nothing; stage redirects for approved retired URLs.
2. Decide whether both app-generated All Products collections should remain
   indexable. Preserve any app dependency before changing visibility.
3. Reconcile the Full Assembly collection with Michael's recorded catalog
   direction.
4. Create one canonical model/category hierarchy and link every indexable
   product from a model hub.
5. Draft improved homepage, collection, Contact, FAQ, News, and Quick Order
   titles, descriptions, and headings. Publication requires approval.

### Phase 2: Make product evidence machine-readable

1. Complete model, grade, assembly, coil, color, included-components, fitment,
   warranty, stock-age, and image-alt fields for every purchasable variant.
2. Add and validate BreadcrumbList plus accurate shipping and return structured
   data. Keep ProductGroup/Product/Offer price and availability synchronized
   with Shopify.
3. Synchronize Merchant Center and require at least 95% feed approval before
   calling the feed ready.
4. Publish original grade, fitment, QC, component, defect, warranty, and RMA
   evidence only after Michael verifies the product facts.

### Phase 3: Acquire and learn

1. Build the approved high-intent model hubs before broad informational
   content.
2. Earn relevant mentions through repair trainers, tool vendors, equipment
   suppliers, repair communities, and customer proof with explicit permission.
3. Review the query portfolio weekly at first and monthly after stabilization.
4. Promote a page or query cluster only when it produces qualified accounts,
   purchases, or defensible assisted revenue.

## Guardrails And Approval Gates

- Michael approves product, fitment, grade, quality, image, warranty, and RMA
  facts.
- Jason approves architecture, measurement, controlled experiments, and
  evidence-backed commercial recommendations.
- No DNS, canonical, redirect, Shopify publication, schema, tracking, Merchant
  feed, or content change is authorized by this document.
- No generated product imagery, invented testimonials, synthetic mentions,
  fake reviews, or unsupported claims.
- No `llms.txt` or mass-generated pages without a specific measured need.
- Programmatic pages require normalized catalog data and unique buyer value for
  every page; templates alone are insufficient.
- Keep customer data, credentials, costs, margins, private correspondence, and
  raw order exports out of Buzz and public SEO artifacts.

## Tools

Installed for the next Codex turn from `coreyhaines31/marketingskills` at commit
`7868cb9251fad80a73d26e488a5ad5f6c4a9f335`:

- `product-marketing`
- `seo-audit`
- `schema`
- `site-architecture`
- `ai-seo`
- `competitor-profiling`
- `analytics`

Use these with the local `wholesale-b2b-commerce`, `web-perf`, and `playwright`
skills. Hold `programmatic-seo` until the catalog and evidence gates are met.

## References

- [Google: Do you need an SEO?](https://developers.google.com/search/docs/fundamentals/do-i-need-seo)
- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google AI search optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google ecommerce site structure](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure)
- [Google product variants](https://developers.google.com/search/docs/appearance/structured-data/product-variants)
- [Google Search Console performance reporting](https://support.google.com/webmasters/answer/17010961?hl=en)
- [Google AI features and websites](https://developers.google.com/search/docs/appearance/ai-features)
- [Google-Extended crawler control](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended)
- [OpenAI publisher and developer guidance](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Perplexity crawler guidance](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
