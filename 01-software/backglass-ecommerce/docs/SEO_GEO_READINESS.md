# SEO / GEO implementation — 2026-09-08

## Latest owner-evidence update — 2026-09-09

This update supersedes the older blanket grade/content blockers and validation
counts below; older entries remain historical evidence, not current questions.

- `MICHAEL-2026-09-09-Q1-Q2` records Michael's confirmed one-piece Premium and
  two-layer raised-area A Grade construction. Exact original statements are in
  ignored `03-data/seo-geo-evidence/MICHAEL-2026-09-09-Q1-Q2.md`; only the safe
  interpretation and evidence ID enter the shared product adapter.
- Literal package semantics are reviewed: glass only, half assembly without
  wireless charging coil, coil only. No detailed half-assembly BOM or performance,
  authenticity, fitment, materials/coating or accessory facts were added.
- Appearance evidence is retained internally; draft copy uses construction only
  and does not assert Apple/OEM origin or identity.
- Q1/Q2 are removed from pending questions. The first two guides now have status
  `OWNER_REVIEWED_PUBLICATION_PENDING`; compatibility and inspection guides still
  require technical evidence. All four remain unpublished/noindex.
- Sol's narrow independent re-review found no remaining issue in this owner-fact
  update. Its conditional MEDIUM question about “to create a similar shape” was
  closed against the exact owner evidence and user's explicit interpretation;
  the clause is supported construction wording, not a performance assertion.
- Description Review — Batch 1 regenerated for six representative products from
  the live read-only plan. Existing merchant HTML is preserved; exact merges/SEO
  still need Jason's itemized approval. Michael is asked only about specific
  exceptions or conflicting existing claims, not to repeat the default answers.
- Validation: 57 unit tests, 20 desktop/mobile E2E tests, typecheck and build pass.
  SSR crawl: 134 routes, zero errors, 40 warnings (20 unreviewed coil relationships
  and 20 detailed half-assembly component gaps). The latter is not a blanket
  package-label blocker or a request for a generic BOM answer.
- Plan captured 2026-09-09T08:18:19Z: 114 products, 56 ACTIVE, 54 public review
  candidates, zero eligible automatic replacements, 30 unpublished coil drafts,
  six collection candidates, four unpublished Pages, eleven theme changes,
  zero theme transformation blockers, `writesToShopify=0`.
- Current plan detects 21 URL decisions (20 review-required plus one existing).
  This differs from the historical 29; no URL health improvement is inferred.
  The original retired-URL investigation and hosted Shopify validation remain
  open production gates. No redirect, theme, catalog or publication was changed.
- Plan checker: zero errors, 118 warnings: 40 factual, 54 merge, 20 URL health,
  two unresolved guidance review and two guidance publication approvals.

Readiness estimates (not SEO scores): technical 90/100, factual content 60/100,
publication 35/100. Local validation is strong; hosted runtime/URL acceptance,
exact content approvals and production authorization remain outstanding.

SEO/GEO estimates remain 48→65 and 40→44 respectively for continuity; the new
facts strengthen the evidence behind conditional content gains. No live score
or original-reference-authority increase is claimed before approved publication.
Questions still needed are coil fitment/labels/SKUs/media, inspection criteria,
and only concrete SKU exceptions to the reviewed default rules.

See [approval packet](SEO_GEO_APPROVAL_PACKET.md) and
[Description Review — Batch 1](SEO_GEO_DESCRIPTION_REVIEW_BATCH_1.md).

Status: **READY FOR OWNER APPROVAL** for local implementation and Shopify
proposals only. No production writes; live acceptance gates remain below.
Owner: website implementation; Michael owns product facts; Jason owns publication.

## Ownership and reuse

| Surface | Authority | Implementation |
| --- | --- | --- |
| Products, variants, colors, SKUs, availability | Shopify | Existing Admin client; no separate manually maintained catalog |
| Model family and coil draft mapping | Existing product-taxonomy.ts and coil matrix | Reused; mappings are not compatibility approval |
| Descriptions, SEO metadata | Shopify product/collection/page fields | Deterministic proposals from product-information.ts |
| Reviewed component and compatibility details | Proposed Shopify bgp.product_information JSON metafield | Only supplemental facts with Michael, source, review date and expiry |
| Redirects | Shopify URL redirects | Read-only decision plan; preserve meaningful 404s |
| Schema, headings, empty sections | Published Shopify theme | Reviewable local theme transformations; never auto-published |
| Editorial pages | Shopify Pages | Draft bodies generated from shared content; no second CMS |
| Local rendering | Existing React Router preview | Uses existing snapshot; not production or live inventory authority |

The starting branch contains uncommitted coil/taxonomy work. It is preserved.
Fresh Admin read: 56 ACTIVE products, 58 DRAFT (30 standalone coils and 28
retired full assemblies). Product fact metafields are absent. Existing coil
collection and app-managed Extend collections must be reused, not recreated.

## Fact contract

Identity is derived from Shopify title/type/tags and variants. Unknown values
stay null. Neither vendor nor a device name establishes part brand/manufacturer.
The optional bgp.product_information JSON metafield carries version=1,
owner=Michael, a public-safe source reference, reviewedAt, reviewAfter, and
reviewed component/note arrays and compatibleCoilHandles. No supplier identity,
private correspondence or costs belong in this public-safe metafield.

Review expiry suppresses supplemental claims. Model matching only yields a
candidate for review; it cannot produce a compatibility claim. Variant names
remain variant labels unless Shopify explicitly identifies an option as Color.
Never infer adhesive, lenses, frames, tools, regional fitment or repair steps.

## Publication gates

Coils remain unavailable drafts. OEM is an existing draft label, not a verified
manufacturing claim or permission to publish. Michael must approve grade,
compatibility, components, SKU and media; commercial approval remains required.
Guidance requiring technical facts remains noindex and unpublished.

## Final validation — 2026-09-09 (Asia/Taipei)

The interrupted plan had completed, but `/private/tmp/bgp-theme-evidence.json`
was absent. The sequence was rerun read-only. Full theme capture initially
returned HTTP 429; sequential pacing and bounded Retry-After retries replaced
four concurrent asset requests. No upload or publication was attempted.

- Branch remains `agent/web/seo-geo-readiness`; existing modified and untracked
  work preserved. No reset, stash, clean, branch switch, commit or deployment.
- Final unit suite: **55 passed in 14 files**. Desktop/mobile Chromium E2E:
  **20 passed**. Typecheck, production build and `git diff --check` passed.
  Build sanitization removed generated server secrets; checked secret values
  and internal support-review text were absent from client bundles.
- Rendered development-preview crawl: **134 routes, zero errors**, 74 factual
  warnings: 54 unverified component lists and 20 missing reviewed coil
  relationships. These are Michael's factual gates, not permission to infer.
- Fresh plan: 114 products, 56 ACTIVE; **54 reviewable product candidates, zero
  eligible replacement proposals**, because all 54 existing descriptions need
  merge review. Existing HTML and SEO plus candidate HTML and SEO are retained
  in `reviewCandidate`; `proposal` stays null. This supersedes the earlier
  statement that all 54 were unblocked.
- Thirty standalone coils remain DRAFT with no public Online Store URL.
  Twenty-eight retired full assemblies remain historical drafts. Two ACTIVE
  SE 3rd-generation products lack Online Store URLs and remain excluded.
- Six collection candidates: five existing with hashes over explicit Admin
  id/handle/title/descriptionHtml/seo; one Back Glass creation requiring owner
  review. Collection descriptions and SEO are retained for comparison. Coil
  collection remains unpublished; Extend-owned collections are not replaced.
  Hashes are review baselines, not a concurrency lock. The future authorized
  executor must refetch, compare and abort on drift. Rules/membership are not
  audited by this content plan and must not be included in a future write.
- Four guidance Page candidates remain unpublished factual drafts. Eleven theme
  transformations are idempotent, with zero transformation blockers.
- Plan check: **zero errors, 160 warnings**: the 74 factual gaps, four guidance
  gates, 28 URL-health gates and 54 description merge gates. Collection approval
  blockers are separately present in the plan and not counted by this checker.
- All executed Shopify operations were GraphQL queries and REST/public reads,
  plus OAuth authentication. GraphQL queries also use HTTP POST; the older
  statement that only authentication uses POST was incorrect. No GraphQL
  mutations, REST writes, theme upload or redirect writes were executed.
  `mode=READ_ONLY_PROPOSAL`, **`writesToShopify=0`**; no apply mode exists.

### Adversarial review and corrections

GPT-5.6 Sol independently reviewed the proposal safeguards and Liquid code, then
re-reviewed the corrections. Final targeted review found no unresolved defects.
The final theme lint corrections also received a separate narrow re-review.
This is technical critique, not Michael/Jason approval.

Short existing descriptions cannot be overwritten. Review candidates now retain
both old and proposed text. A single explicitly owned block can be updated while
preserving surrounding merchant content. Generated collection links now carry
an explicit ownership marker; adjacent unmarked merchant links are preserved.
Multiple owned blocks fail closed. Regression tests cover each case. Collection
hashes exclude transient public GET state. The product row now says simply
"No" for coil inclusion, avoiding an implication that draft coils can be bought.
No copy proposes recreating a retired full assembly by combining parts.

### Retired URL GET investigation

`seo-url-evidence.mjs` completed: 39 controlled requests across three samples,
plus paired Node/curl GETs for all 28 retired URLs (95 total requests).
All 28 are classified **SHOPIFY/CDN CONDITIONAL 404** by the script: curl GET
returns HTTP 404 with a 404 page, while Node GET returns HTTP 302 to `/`.
The classification describes observation, not proof that Shopify/CDN is the
cause. Matching Chrome, Googlebot and Node user-agent strings did not eliminate
the split. On the three controlled samples, following the Node redirect reaches
the homepage with HTTP 200; curl retains the 404. HEAD was comparison evidence
only. A Googlebot user-agent string does not authenticate a real crawler.

Normal Chrome navigation on this machine also differed: the iPhone 14 A Grade
retired URL landed on the homepage; the iPhone 16 Plus A Grade and iPhone Air
Premium retired URLs displayed “404 Not Found” / “Page not found.” These browser
checks establish visitor-visible outcomes, not independently captured HTTP codes.

The one existing exact legacy a-grade-copy redirect remains HTTP 301 to the
active Premium/no-coil iPhone 16 Pro Max product, HTTP 200, without a chain.
**Zero new redirects proposed or created.** The 28 retired URLs have no approved
equivalent destination. Their desired behavior remains meaningful 404s.

The cause of conditional live redirects and verified Googlebot behavior remain
unresolved. Jason must authorize any production-side investigation/remediation
or external Shopify support contact; nothing was sent. Require repeat visitor
GETs and Search Console URL Inspection/server evidence before calling this
issue resolved. Do not redirect to half assemblies, coils, categories or home.

### Theme and schema evidence

Full downloaded-theme comparison: **356 source assets, zero source drift**.
Final proposed values match the latest plan, including all eleven changed files.
Baseline Theme Check: two errors and 33 warnings (exit 1). Proposed full-theme
Theme Check: **zero errors, 33 pre-existing warnings (exit 0)**. The two baseline
errors were corrected locally: express the dynamic header wrapper with an
assigned tag name, and migrate email signup's deprecated top-level `templates`
to `enabled_on.templates` while preserving its password-template restriction.
Four sticky-header modes render identically in LiquidJS before/after; the section
restriction and idempotence are tested. No warnings were suppressed; remaining
warnings concern existing theme/app code (naming, deprecated filters/tags,
unused assignments and undefined objects) and are not new SEO findings.

Offline Liquid tests parse ProductGroup/variant, Organization and breadcrumb
JSON and challenge script-breaking strings, absent SKU, protocol-relative and
absolute images, zero-price offers, currency and availability. They passed.
The JSON filter and image_url in LiquidJS are test adapters; this is **not**
Shopify runtime certification or a Google Rich Results Test pass.

Fresh Chrome baseline: homepage title remains “Back Glass Pro – Back Glass
Pros,” its H1 is the logo, no description was found, and Organization sameAs
contains empty strings. The representative live Premium iPhone 16 Pro Max
product has its canonical, description and product H1, but its current native
ProductGroup still declares Apple as brand. The local replacement omits inferred
brand/manufacturer; it has not changed live schema.

Before publishing any approved theme, Jason must separately authorize an
unpublished Shopify theme preview, then require actual Shopify rendering checks
for metadata, one meaningful homepage H1, no duplicate schema, valid variant
JSON/commerce values and Google Rich Results Test validation. No development
theme upload was used in this task.

See [SEO_GEO_APPROVAL_PACKET.md](SEO_GEO_APPROVAL_PACKET.md) for decisions,
acceptance gates, private evidence paths and score limitations.

## SEO/GEO change manifest

Paths below are relative to this application. Baseline hashes in the private
temporary baseline distinguished pre-existing changes from this task.

New SEO files: `app/data/{product-information,collection-content,store-content,
buyer-guidance,redirect-decisions,seo,seo-quality,support-content,seo-readiness.test}.ts`,
`app/components/{product-information,structured-data}.tsx`,
`app/routes/guidance.tsx`, `scripts/{seo-geo-check,shopify-seo-geo-plan}.ts`,
`scripts/{seo-url-evidence,seo-theme-evidence}.mjs`,
`scripts/lib/{seo-theme-plan,seo-theme-plan.test,seo-content-plan,seo-content-plan.test,seo-liquid.test}.ts`, four
`shopify/snippets/bgp-*.liquid` files, and this document.

SEO integration edits: `app/components/store-shell.tsx`,
`app/data/{catalog.server,catalog.shared,product-taxonomy}.ts`, `app/routes.ts`,
`app/routes/{store,product,collection,coil-product,model,models}.tsx`,
`workers/app.ts`, `package.json`, `vitest.config.ts`, and the homepage assertion
in `e2e/migration-console.spec.ts`. Several of these already contained catalog
work; only SEO integration additions belong to this pass.

Pre-existing, preserved work includes catalog styling/media, coil draft cards
and matrix, taxonomy/model routing, retirement/draft automation, Quick Order,
catalog transition scripts and documents, catalog tests, E2E coverage and
repository knowledge updates. No unrelated changes were introduced by this pass.

## Scores (estimates, equal aspect weights as original audit)

Current live SEO: 48/100; conditional post-deployment readiness: 65/100.
Aspects: crawlability 75→75, metadata/headings 35→75, product content 40→65,
categories/links 45→65, schema 65→85, trust 25→25.

Current live GEO: 40/100; conditional post-deployment readiness: 44/100.
Aspects: readable access 85→85, buyer answers 30→45, original expertise 20→20,
public identity 25→25. Draft shells receive no expertise credit. Scores assume
approved Shopify changes render correctly; no local-code credit is awarded live.
Michael's approved grade definitions, compatibility evidence, package contents,
inspection criteria and original reference material are needed for further gains.

These scores are heuristic equal-weight audit estimates, not Lighthouse,
Search Console, ranking, traffic or AI-citation measurements. The previous audit
rubric is retained for continuity; this continuation refreshed selected live
surfaces, not a new exhaustive scored audit. Conditional scores require approved
product merges, collection/content changes and successful Shopify runtime/schema
validation. They are not the score of a theme-only deployment. The conditional
crawlability score gives no improvement credit for the unresolved retired URLs.

References: [Shopify Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check),
[Google product validation](https://developers.google.com/search/docs/appearance/structured-data/product-snippet),
[Google HTTP status handling](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes).
