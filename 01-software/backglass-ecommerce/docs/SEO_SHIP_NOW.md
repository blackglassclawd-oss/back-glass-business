# Ship-now Shopify proposal — 2026-09-09

One preview theme, one approval round. Everything here changes the live revenue
surface and needs **no unresolved product facts from Michael**.

Supersedes `SEO_GEO_APPROVAL_PACKET.md` as the thing to act on; that document
stays as background evidence only.

**Shopify writes so far: 0.** No theme upload, no publication, no catalog,
price, status or redirect change. Regenerate with `npm run plan:seo-geo`,
re-verify with `npm run validate:shipnow -- <theme-capture-dir>`.

---

## A. Ready for preview

Eleven theme assets change. All eleven are covered by 32 rendered-output checks
against a capture of the live production theme (356 assets, zero drift).

### A1. Homepage title and meta description

| | |
| --- | --- |
| Before | `<title>Back Glass Pro – Back Glass Pros</title>`, **no meta description at all** |
| After | `iPhone Back Glass & Half Assemblies for Repair Shops \| Back Glass Pros` (70 chars) + a 177-char description |
| Why | The live title is a typo (“Pro”), carries no search intent, and the page has no description for Google or an AI assistant to quote. |
| Risk | Low. Copy only, reversible by reverting one asset. |
| Validation | Rendered from the real `layout/theme.liquid` through LiquidJS; asserted title, description, and absence of the typo. |

### A2. Social metadata actually receives it *(defect found and fixed)*

| | |
| --- | --- |
| Before | The proposal assigned `page_title`/`page_description` before `<head>` only. |
| After | `{% render 'meta-tags', page_title: page_title, page_description: page_description %}` |
| Why | `{% render %}` is an isolated scope, so the assignment never reached `meta-tags.liquid`. Proven: with a bare render, `og:title` stays `Back Glass Pro` and `og:description` falls back to `Back Glass Pros`, matching what the live site emits today. |
| Risk | Low. If the layout ever has more than one `meta-tags` reference the plan refuses to transform rather than guess. |
| Validation | Both renders compared side by side; og/twitter now carry the intended values. |

### A3. A real homepage H1

| | |
| --- | --- |
| Before | The only `<h1>` on the homepage is the header logo text, “Back Glass Pros”. |
| After | Header logo becomes a `<div>` on the index template only; a new `bgp-introduction` section supplies one editorial H1 and links to the four reachable collections. |
| Why | The H1 is the strongest on-page signal and it currently says nothing about what is sold. |
| Risk | Low–medium: it inserts a section at the top of the homepage. The transformation refuses to run unless every `header__heading` H1 is a recognised index-only logo wrapper. |
| Validation | Exactly one H1 in the new section; header no longer emits an index H1; links restricted to published collections. |

### A4. Product structured data — remove the Apple brand claim

| | |
| --- | --- |
| Before | Live `ProductGroup` emits `"brand": {"@type":"Brand","name":"Apple"}` on every product page. |
| After | No `brand`/`manufacturer`. Keeps `category: "Back Glass"`, adds `variesBy: ["https://schema.org/color"]`, `url` and `isVariantOf`, and gives every variant its real `color`. |
| Why | These are aftermarket parts; declaring Apple as the brand is factually wrong and a trademark exposure. Google's product-variant documentation wants `variesBy` plus the varying property on each variant, which neither the native nor the previous replacement output had. |
| Risk | Medium — it replaces commerce-bearing schema. SKU, image, price, currency and availability all still come from live Shopify data. |
| Validation | Rendered with the **live** iPhone 16 Pro Max product payload: 4 variants, colors `Desert Titanium / Natural Titanium / White Titanium / Black Titanium`, prices matching live cents, `schema.org` availability URLs. |

### A5. Organization structured data

| | |
| --- | --- |
| Before | `"sameAs": ["","","","","","","","",""]` — nine empty strings. |
| After | `sameAs` removed; `name`, `url`, `@id` kept, plus the theme's **conditional logo** restored. |
| Why | Empty `sameAs` is invalid. No social profiles are approved, so none are invented. |
| Risk | Low. |
| Note | The earlier review called the dropped logo a live regression. It is not — `settings.logo` is unset, so the live schema has no logo either. Restoring the condition prevents a *future* regression the day a logo is uploaded. |

### A6. Three empty accordions on every product page *(defect found and fixed)*

| | |
| --- | --- |
| Before | Every product page renders “Product features”, “Materials and care” and “Merchandising tips” as empty expanders. |
| After | All three removed; `title`, `price`, `description`, `share` and app blocks preserved. |
| Why | The tabs point at pages `product-features`, `materials-and-care`, `merchandising-tips` — **all three return 404**. The previous transformation skipped them because it only removed a tab whose `page` setting was blank, so it was a no-op and produced no diff. The plan now checks whether the referenced page actually exists with content. “Merchandising tips” is internal jargon currently shown to customers. |
| Risk | Low. |
| Validation | Confirmed empty on the live page; confirmed the transformation now removes exactly the three and keeps everything else. |

### A7. Unsupported “Since 2015” claim *(defect found and fixed)*

| | |
| --- | --- |
| Before | Announcement bar: “Serving Mobile Repair Industry Since 2015”. |
| After | “Replacement iPhone back glass and half assemblies for repair professionals”. |
| Why | No founding-date evidence exists anywhere in the repository or in any owner statement. `AGENTS.md` requires every public claim to have an owner, source and review interval. The previous plan could never fix it because it did not read `sections/header-group.json`, which is now included. |
| Risk | Low. The second announcement (“Shop & Refer to Maximize your SAVINGS!”) and all header settings are byte-identical. |

### A8. Four public collection descriptions

`premium`, `a-grade`, `glass-only`, `half-assembly-without-charging-coil` — all
four currently have **empty** description and SEO fields, so these are pure
additions with no merge risk.

Not five: `wireless-charging-coils` and `back-glass` both return 404 and are out
of scope. `premium-plus` is out of scope too (see the note at the end).

### Also fixed

`sections/email-signup-banner.liquid` migrates a deprecated `templates`
restriction to `enabled_on.templates`, clearing one of the three Theme Check
errors in the live theme without changing which templates it runs on.

---

## B. Owner wording approval — Jason

Four decisions. No product facts required.

1. **Homepage title, description and H1** as quoted in A1/A3.
2. **Announcement bar replacement** in A7 — or say “remove the block entirely”.
3. **Four collection descriptions.** They read well but every one is 236–259
   characters; Google truncates around 155–160, so roughly the last third will
   not be shown. Approve as-is, or ask for shorter versions.
4. **Nothing else.** The previous packet asked you to approve 54 product SEO
   titles. All 54 are no-ops: every product has a blank `seo.title`, so Shopify
   already renders exactly the proposed string. The plan now reports them as
   `already-equivalent` and they are excluded.

---

## C. Blocked on facts

Two rules, not dozens of rows.

**Michael — one question only.** Is there any specific SKU where the reviewed
defaults are wrong (Premium = one-piece formed glass; A Grade = two stacked
layers in the raised area; Glass Only = glass only; Half Assembly No Coil
excludes the coil)? If not, nothing to answer. Coil-to-model compatibility
remains genuinely unknown and blocks coil publication.

**Jason/Michael — trust blockers.** These cost orders now and none of it can be
invented:

| Gap | Evidence | Needed |
| --- | --- | --- |
| Returns policy has unfilled placeholders | Live page contains `[support email]`, `[support phone number]`, `[support email or phone number]`, `[Your Store Address, Dallas, TX]`; effective date 08/09/2019 | Support email, phone (or “email only”), business address |
| Shopify policy slots empty | `/policies/refund-policy`, `/policies/terms-of-service`, `/policies/shipping-policy` all 404; only privacy-policy is set | Confirm the refund/shipping/terms text to paste into the Shopify policy fields, which is what checkout links to |
| No warranty page | `/pages/warranty` 404, policy page never mentions warranty | Approve the M3 warranty draft already in the repo, or supply terms |
| Contact page exposes a personal address | `jasonzoid@outlook.com` appears in the contact page source | Decide whether a business support address should replace it |

---

## Deliberately deferred

54 product-description merges · 4 buyer-guidance pages · 28 retired-URL
redirects · coil publication · the `back-glass` collection · model landing pages
· any further Cloudflare preview work.

`(Product)RED` in the iPhone 11 A Grade listing is the **genuine Shopify variant
option value**, not a generation artifact. It is left exactly as-is: the
structured data must match the string a customer picks in the variant selector,
and variant option values are operational identifiers. Correcting it to
`(PRODUCT)RED` is a catalog change for Michael, not a copy fix.

A concurrent session added a Jason-specified **Premium Plus** grade while this
work was in progress. `/collections/premium-plus` returns 404, so the plan's
public-collection filter already excludes it from everything above. It needs its
own preview round once that collection exists.

---

## Validation run

| Check | Result |
| --- | --- |
| Unit tests | 86 passed, 15 files |
| Typecheck (app + scripts) | clean |
| Production build | clean |
| Playwright desktop + mobile | 20 passed |
| Rendered ship-now validation | 32/32 against the live theme capture |
| Theme Check baseline | 3 errors, 27 warnings |
| Theme Check proposed | **2 errors**, 27 warnings — one baseline error fixed, none introduced; both remaining errors are pre-existing in `snippets/product-variant-options.liquid`, which we do not touch |
| New `bgp-*` files | zero Theme Check offenses |
| Theme transformation | idempotent, zero blockers |
| Live theme drift | zero across 356 assets |
| SEO/GEO plan check | 0 errors, 119 warnings (all deferred scope) |

Not done, and required before publishing: an authorised **unpublished Shopify
preview theme**, then Google Rich Results Test against the real rendered pages.
LiquidJS is a faithful harness for scope and control flow, not Shopify runtime
certification.
