# First-Party SEO/GEO Baseline Status

**Status:** `BASELINE BLOCKED`

**Audit date:** 2026-08-07
**Audit timezone:** Asia/Taipei

No connected Chrome or in-app browser was available in either the prior SEO/GEO
turn or the 2026-08-07 audit recheck (`agent.browsers.list()` returned `[]`). No
Search Console, GA4, Google Ads Keyword Planner, Merchant Center, rank tracker,
or Google Generative AI report connector was available. Public source code and
manual search results are not substitutes for first-party exports.

## Required Google Search Console Export

Provide an unchanged export for the verified domain property covering
2025-04-07 through 2026-08-06, plus a fresh export ending the day before any
future cohort deployment.

| Field | Required value | Current audit value |
| --- | --- | --- |
| Property identifier | Exact domain/URL-prefix property | NOT PROVIDED |
| Export timestamp | ISO timestamp | NOT PROVIDED |
| Property timezone | Exact setting | NOT PROVIDED |
| Country | United States | NOT PROVIDED |
| Device | All plus desktop/mobile/tablet splits | NOT PROVIDED |
| Search type | Web | NOT PROVIDED |
| Dimensions | Date, query, page, country, device, search appearance | NOT PROVIDED |
| Metrics | Clicks, impressions, CTR, average position | NOT PROVIDED |
| Indexing | Indexed/excluded reason, user canonical, Google-selected canonical, last crawl | NOT PROVIDED |
| Brand definition | Case-insensitive `back glass pros`, `backglasspros`, and approved variants; preserve raw queries before classification | NOT APPROVED |
| URL cohort | Changed URLs and untouched control URLs, frozen before deployment | NOT SELECTED |
| Query cohort | Approved measured target queries and separate brand/non-brand set | 24 HYPOTHESES ONLY |
| Raw location | Immutable original export | NOT PROVIDED |
| Transform | Versioned script with output hash | NOT CREATED; no raw input |

If the property exposes a Google Generative AI Search Console report, export its
available impressions/dimensions unchanged and record the report name and
limitations. Do not infer exact AI-generated clicks unless the report actually
supports that conclusion.

## Required GA4 Export

Use the same date range and timezone basis as GSC, preserving the raw export.

| Field | Required value | Current audit value |
| --- | --- | --- |
| Account/property identifier | Exact GA4 account and property IDs | NOT PROVIDED |
| Export timestamp | ISO timestamp | NOT PROVIDED |
| Property timezone | Exact setting | NOT PROVIDED |
| Geography | United States | NOT PROVIDED |
| Dimensions | Date, landing page + query string, session source/medium, device category, country | NOT PROVIDED |
| Metrics | Organic sessions, users, engaged sessions, engagement rate/time, key events/conversions | NOT PROVIDED |
| Organic definition | Session default channel = Organic Search, with source/medium retained | NOT APPROVED |
| AI referrals | Raw referrer/source evidence for identifiable AI services | NOT PROVIDED |
| URL cohort | Same changed/control URL sets as GSC | NOT SELECTED |
| Raw location | Immutable original export | NOT PROVIDED |
| Transform | Versioned script with output hash | NOT CREATED; no raw input |

## Required Shopify/Private Business Export

The audit obtained a read-only product-status export only. It did not retrieve
customer or order details. For the same dates and URL/account attribution
cohorts, provide immutable, access-controlled exports for:

- account applications and timestamps;
- qualified/approved repair-shop accounts;
- orders, net orders after cancellations/refunds, and revenue;
- first versus repeat orders and repeat revenue;
- the landing/source keys needed for the cohort join;
- inventory, availability, promotions, paid campaigns, and outage periods that
  could confound attribution.

The property/store identifier confirmed for the product-only query is
`kfczyu-kc.myshopify.com`, Admin API `2026-07`, captured
2026-08-07T08:59:02.442Z. That catalog query is not a traffic or conversion
baseline.

## Measurement Rule Frozen Before Results

Relevant organic traffic to a changed URL cohort must increase. GSC non-brand
organic clicks and GA4 organic landing sessions/users must show the same
sustained upward direction in at least two comparable post-deployment reporting
windows, with changed pages separate from untouched controls. If they disagree,
status is `INCONCLUSIVE`.

No percentage uplift threshold is set. A threshold may be added only before a
measurement period begins. Rankings, indexing, AI mentions, citations, and
documents remain diagnostic evidence. Shopify/business conversions are an
additional traffic-quality and commercial-value check.

## Blocked Downstream Gates

- All 24 proposed queries remain `HYPOTHESIS`.
- Current US desktop/mobile positions are NOT VERIFIED.
- Google-selected canonicals are NOT VERIFIED.
- The smallest implementation cohort is NOT SELECTED because demand, current
  rank, margin, inventory, and baseline traffic are not jointly verified.
- No before/after implementation record exists because no SEO cohort was
  implemented or deployed.
- SEO and GEO traffic success are NOT MEASURED.

