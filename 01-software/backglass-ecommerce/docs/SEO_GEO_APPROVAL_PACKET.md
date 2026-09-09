> **Superseded for action, 2026-09-09.** Act on
> [SEO_SHIP_NOW.md](SEO_SHIP_NOW.md) instead: eleven theme assets and four
> collection descriptions, needing four wording decisions from Jason and one
> conditional question for Michael. This document is retained as background
> evidence. Its 54 product SEO-title rows were verified to be no-ops and its
> empty-tab and homepage-metadata transformations were verified to be broken;
> both are fixed in the ship-now proposal.

# Back Glass Pros SEO/GEO owner approval packet

Prepared 2026-09-09 (Asia/Taipei), branch `agent/web/seo-geo-readiness`.
Scope: reviewable local implementation and read-only Shopify proposals.
Review disposition: **READY FOR OWNER APPROVAL** for this proposal scope;
actual publication remains gated below.
**No publication approval is implied. Shopify remains production authority.**

## Decision requested

**Latest update — Michael Q1/Q2 resolved, 2026-09-09:** construction and literal
package semantics are OWNER REVIEWED. Historical counts and question lists below
are superseded where noted by this update and the final addendum. Start with
[Description Review — Batch 1](SEO_GEO_DESCRIPTION_REVIEW_BATCH_1.md).

Michael reviews factual content and product-description merges. Jason decides
which reviewed Shopify changes may proceed to a separately authorized theme
preview and publication workflow. This packet does not request activation of
coil drafts or deployment of the Cloudflare preview.

## Reviewable changes

| Surface | Candidate | Required decision |
| --- | --- | --- |
| 54 public active products | Existing description/SEO alongside generated information/SEO in `products[].reviewCandidate` | Michael approves exact merged copy; all `proposal` values remain null until merge review |
| Five existing collections | Description and SEO candidates with original content and source hashes | Michael approves wording; Jason authorizes exact content-only updates, preserving identity, rules, membership and publication |
| Back Glass collection | Creation candidate only; currently absent | Michael/Jason approve purpose, membership and publication separately; do not duplicate an app-owned collection |
| Four guidance Pages | Unpublished draft bodies | Michael supplies and approves factual expertise; Jason decides publication afterward |
| Eleven theme file changes | Local proposed source beside downloaded live source | Jason authorizes a separate unpublished Shopify preview before any live replacement |
| 28 retired product URLs | No equivalent target; preserve meaningful 404 intent | Jason owns investigation of request-dependent live redirects; no new redirects approved |
| Existing exact legacy URL redirect | Preserve verified single-hop 301 to exact active Premium part | No change needed |

The product candidate is an information block for review, not an approved full
replacement description. Preserve existing merchant facts and links when merging;
do not copy the candidate over the existing HTML. Short descriptions are still
protected. Generated ownership markers identify only the block and explicitly
marked related link. Unmarked adjacent merchant collection links survive updates.

## Michael approval items

1. Flag only concrete SKU exceptions or conflicting old claims in the 54
   existing/candidate description pairs. The Q1/Q2 default facts are already
   approved. Jason retains exact merged HTML/SEO approval; automation must not
   silently erase existing content.
2. Approve the six category descriptions and whether proposed public links
   accurately represent available products. Coils remain separate products.
3. Q1/Q2 are resolved by Michael's 2026-09-09 evidence: Premium one-piece formed
   glass; A Grade two layers in the raised 3D portion; literal product-label
   contents. Do not request those answers again. Flag only specific SKU
   exceptions/contradictions; inspection and installation facts remain separate.
4. Approve coil relationships individually; matching an iPhone model is not
   compatibility evidence. Record source, owner, review date and expiry for any
   supplemental fact. Do not infer Apple/OEM manufacture from vendor or title.
5. Review the duplicated OEM label on the iPhone 17 Pro coil draft, and factual
   SKU/grade/media/fitment readiness. This is a future catalog review item, not
   approval to change or publish any of the 30 drafts.
6. Review the four guidance drafts and any warranty/shipping/returns statements
   separately. Unreviewed technical guidance remains unpublished.

## Jason approval items and execution gates

1. Accept or narrow the Shopify-first change scope after Michael's content
   review. The React Router/Cloudflare application remains preview-only/noindex.
2. Authorize any unpublished Shopify theme upload/preview separately. No such
   upload occurred here. On that preview, verify actual Shopify Liquid rendering,
   headings, canonical/title/description, ProductGroup/variant offers, escaping,
   image URLs and duplicate schema; run Google Rich Results Test. Static lint
   and LiquidJS cannot substitute for this gate.
3. Before a future production write, regenerate the read-only plan; refetch the
   exact product/collection/theme source and compare approved source hashes.
   Abort on any mismatch, changed main-theme identity, or collision with a new
   asset/collection handle. Review fresh differences and reapprove. A hash in a
   proposal is not an enforced lock; no apply executor exists in this work.
4. Limit collection writes to approved description/SEO fields. The current hash
   covers Admin id, handle, title, descriptionHtml and seo, in that order; public
   GET state is excluded. Rules/membership are not captured by this content audit
   and must not be sent, reset or reconstructed. Do not alter publication or
   app-managed Extend collections.
5. Preserve local private backups of the exact approved-before source. Authorize
   publication only after preview passes, then verify rendered live pages and
   use the preserved prior content/theme as the rollback basis if needed.
6. Authorize production-side URL investigation or contact with Shopify support
   if desired. No external message was sent. Require visitor GET and verified
   crawler evidence before marking retired-URL health resolved. Do not create
   unrelated replacements to hide warnings.

## Completed technical evidence

- 55 unit tests across 14 files passed, including description-preservation and
  adversarial Liquid fixtures.
- 20 desktop/mobile Chromium E2E tests passed; existing checkout handoff tests
  run against the local preview without placing orders.
- Typecheck, production build, JavaScript script syntax checks and diff whitespace
  checks passed. Generated server secrets were removed; checked secret values
  and internal support notes were absent from client bundles.
- 134-route rendered preview crawl: zero errors, 74 factual warnings (54 component
  gaps and 20 unreviewed coil relationships).
- Read-only Shopify plan: zero checker errors, 160 warnings (74 factual, four
  guidance, 28 URL-health, 54 description merge). Collection gates are additional
  explicit plan blockers, not included in this warning total.
- 54 review candidates are complete for comparison; zero product replacements
  eligible without owner merge review. 30 coils are DRAFT and unpublished.
- Eleven theme transformations are idempotent, zero transformation blockers; complete
  capture includes 356 source assets, zero source drift, and proposed theme values
  exactly match the final plan.
- Full theme lint: proposed **zero errors, 33 pre-existing warnings, exit 0**;
  baseline had two errors and 33 warnings. The proposal repairs dynamic header-tag
  parser compatibility and migrates the deprecated email-signup template
  restriction to enabled_on without changing allowed templates. Four header-mode
  render-equivalence fixtures and section restriction/idempotence tests passed.
  No lint warnings were suppressed.
- Sol adversarial review and targeted re-review completed. The final review found
  no unresolved defects in the corrected proposal safeguards. It is not business
  approval or Shopify runtime certification.
- Executed Shopify requests were GraphQL queries, REST GETs and OAuth token POSTs.
  GraphQL queries use POST but perform no mutation. **writesToShopify = 0**.
  No products changed, drafts activated, redirects created, theme uploaded,
  collection published or deployment performed.

## URL and schema limitations

All 28 retired paths return curl GET 404 with a real 404 page, but Node GET 302
to the homepage. Three samples were compared across default, Chrome, Googlebot
and Node user-agent strings and both GET/HEAD; client differences persisted.
Following Node redirects ended at homepage HTTP 200. There were 95 diagnostic
requests total. Spoofed Googlebot headers do not establish actual Googlebot
behavior. Chrome showed a homepage landing for iPhone 14 A Grade, and 404 pages
for iPhone 16 Plus A Grade and iPhone Air Premium. The live cause is unresolved.

The existing exact a-grade-copy legacy path still returns a single 301 to the
correct active Premium/no-coil iPhone 16 Pro Max product, which returns 200.
There are no new 301 proposals. Retired full assemblies cannot be recreated by
combining separate parts, and no such replacement is claimed here.

Offline JSON-LD validation covers serialization, script-context escaping, missing
SKU, absolute/protocol-relative image URLs, no zero-price offer, currency and
availability. Live Chrome inspection still found native Apple brand schema on a
representative product and empty Organization sameAs entries on the homepage.
The proposed schema removes inferred brand/manufacturer, but remains uninstalled.
No Google Rich Results Test pass or hosted Shopify runtime pass is claimed.

There are no remaining identified local implementation blockers. Two technical
acceptance gates remain outside this read-only scope: hosted Shopify rendering
validation after Jason authorizes preview, and live retired-URL diagnosis. Owner
approval of the proposal can proceed; production readiness is not certified.

## Scores and interpretation

| Audit estimate | Current live | Conditional after approved deployment |
| --- | ---: | ---: |
| SEO | 48/100 | 65/100 |
| GEO | 40/100 | 44/100 |

These are retained heuristic audit estimates using the prior equal-aspect rubric,
not measured Google scores, Lighthouse results, ranking promises or AI citation
rates. Selected live surfaces were refreshed this session; no new exhaustive
scored audit was performed. See the aspect calculations in
[SEO_GEO_READINESS.md](SEO_GEO_READINESS.md).

The conditional column requires approved product-description merges, collection
and theme changes plus actual Shopify runtime/schema validation. A theme-only
release does not earn that score. Draft guidance receives no original-expertise
credit, and no crawlability improvement is assumed for the conditional redirects.
Unknown product facts remain unknown; the scores do not assume coil publication,
new technical grade distinctions, manufacturer claims or invented trust policies.

## Evidence locations (local only)

- `/private/tmp/bgp-shopify-seo-geo-plan.json`: final candidates, merge gates,
  source hashes, theme changes and read-only counters.
- `/private/tmp/bgp-theme-evidence.json`: complete capture location, main theme
  identity, asset count, source drift and zero-write declaration.
- `/private/tmp/bgp-theme-verification-ndbrJM/{before,proposed}`: full local theme
  source comparison. Do not commit or publish these raw captures.
- `/private/tmp/bgp-theme-check-before.json` and
  `/private/tmp/bgp-theme-check-proposed.json`: complete lint outputs.
- `/private/tmp/bgp-url-evidence.json`: per-path GET outcomes and controlled
  request comparisons. No cookies or response bodies are retained there.
- `/private/tmp/bgp-final-build.log`: local build result.
- `playwright-report/index.html`: latest local desktop/mobile E2E report.

Temporary evidence can expire. Regenerate it before implementation; do not treat
these paths as durable production state. Keep raw evidence and credentials out
of Git and public artifacts. This sanitized packet and the readiness document
are the reviewable record; no repository commit or PR was made in this continuation.

References: [Shopify Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check),
[Google product validation](https://developers.google.com/search/docs/appearance/structured-data/product-snippet),
[Google HTTP status handling](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes).

## Owner decision register — 2026-09-09

### APPROVED

1. Homepage positioning

   * Title:
     `iPhone Back Glass & Half Assemblies for Repair Shops | Back Glass Pros`
   * H1:
     `Professional iPhone Back Glass & Half Assemblies`
   * Meta description:
     `Shop replacement iPhone back glass and half assemblies for professional repair businesses, organized by model, part type and quality grade using familiar industry conventions.`
   * Supporting homepage copy may reference MobileSentrix only as a recognizable industry benchmark for professional repair-shop catalog conventions.
   * Do not place MobileSentrix in the title or H1.
   * Do not imply affiliation, endorsement, common sourcing, identical grades, certification, or product equivalence.
   * Comparative wording remains subject to factual review before publication.

2. Existing collection introduction scope

   * Approved in scope for:

     * Premium
     * A Grade
     * Half Assemblies Without Charging Coil
     * Glass Only
   * Exact wording remains subject to Michael's factual review and hosted preview validation.
   * Wireless Charging Coils remains unpublished.

3. Umbrella Back Glass collection concept

   * Approve concept for `/collections/back-glass`.
   * Intended as the primary broad back-glass browsing entry point.
   * Include current glass-only and half-assembly products.
   * Exclude wireless charging coils.
   * Exclude retired full assemblies.
   * Do not duplicate products merely to populate the collection.
   * Premium, A Grade, Glass Only, Half Assembly and model pages remain narrower paths.
   * Creation/publication not yet authorized.

4. Footer positioning

   * Approve contact-first footer.
   * Add `Contact Back Glass Pros` in later preview.
   * Buyer Guidance link remains gated until its destination is factually approved and public.
   * Do not add unapproved shipping, returns, warranty, support-hours, or contact-detail claims.

5. Unpublished Shopify theme preview

   * Approved for a later execution session.
   * Preview must use a separate unpublished Shopify theme.
   * Live theme must remain untouched.
   * This approval does not authorize product edits, collection creation, publication, or deployment.

6. Structured data for unpublished preview

   * Approve reviewed Organization, ProductGroup/variant and BreadcrumbList changes for preview.
   * Remove unsupported brand/manufacturer assertions and empty organization links.
   * Commerce values must remain Shopify-sourced.
   * Production remains gated on rendered validation, duplicate-schema checks, and correct prices/currency/availability.

7. Guidance pages

   * Keep all four unpublished:

     * Premium vs A Grade
     * Glass Only vs Half Assembly
     * Wireless Charging Coil Compatibility
     * Pre-installation Inspection
   * Michael factual approval required first.
   * Jason publication authorization required afterward.

8. Product-description merge policy

   * Approve individual merge-review policy for all 54 candidates.
   * Preserve merchant content and links.
   * Never automatically replace a full existing description.
   * Resolve conflicting claims explicitly.
   * Michael approves facts.
   * Jason approves each exact merge or explicitly itemized batch.
   * Any source drift after review pauses that item for re-review.
   * No product description is approved merely by this policy decision.

9. Publication sequence

   * Approve staged release process:

     1. Prepare unpublished theme preview.
     2. Validate hosted Shopify rendering.
     3. Present exact release scope and evidence to Jason.
     4. Obtain separate production authorization.
     5. Release product-copy merges and guidance only as their own approvals clear.
   * Collection creation and shared Shopify content changes remain separately gated.

10. Retired-product URL launch dependency

    * Require URL investigation findings before Jason makes the first production launch decision.
    * Unpublished preview work may proceed while investigation is open.
    * Investigation findings do not automatically require a redirect or fix.
    * Do not create unrelated replacement redirects.
    * Do not resurrect retired full assemblies.

### MICHAEL REQUIRED

Michael still owns factual approval for:

* specific SKU exceptions to the reviewed construction and literal-content defaults (only if identified)
* exact coil compatibility
* category factual wording
* questionable Back Glass collection membership
* inspection/installation facts
* identified SKU-specific conflicts in product-description merges (not repeat approval of Q1/Q2)
* guidance-page technical content
* any comparative catalog statement that requires factual substantiation

Q1/Q2 default construction and literal package semantics are OWNER REVIEWED,
not pending. Detailed half-assembly BOM is not inferred; no generic BOM question
is required to use the literal half-assembly/no-coil label. Exact merged copy
and publication authorization remain separate from factual evidence approval.

### PREVIEW REQUIRED

Before any production authorization, hosted Shopify preview must verify:

* one meaningful homepage H1
* logo/header/sticky-header behavior
* product H1
* collection H1
* homepage title/meta/canonical
* Organization JSON-LD
* ProductGroup/variant JSON-LD
* Offer price/currency/availability
* BreadcrumbList
* footer/support links
* email-signup section availability
* no duplicate schema
* no desktop/mobile visual regressions
* hosted structured-data validation

### INVESTIGATION REQUIRED

The 28 retired full-assembly URLs remain on a separate production-URL investigation track.

Current evidence:

* curl GET produced 404
* Node GET produced homepage 302
* Chrome produced mixed outcomes
* cause unresolved
* existing exact legacy redirect remains healthy
* no new redirects approved

### NOT AUTHORIZED

These decisions do NOT authorize:

* production deployment
* live theme publication
* Shopify product mutation
* collection creation/publication
* product-description writes
* guidance-page publication
* coil activation/publication
* production redirects
* retired full-assembly restoration

## Current Michael follow-up — Q1/Q2 removed

Evidence ID: `MICHAEL-2026-09-09-Q1-Q2`. Exact Chinese statements are retained in
the ignored local-only evidence record, not in customer-facing data.

Latest validation: 57 unit tests, 20 desktop/mobile tests, typecheck/build and
134-route preview crawl pass. Current factual warnings are 40, not the historical
74 above. Current plan has 54 review candidates, zero eligible automatic merges,
30 coil drafts, and zero Shopify writes. The latest URL detector returns 20
review-required decisions plus the existing exact redirect; this is live drift,
not a resolution of the historical 28-path investigation. See the dated update
at the top of SEO_GEO_READINESS.md for the current counters and review outcome.

| Resolved default | Public-safe draft use |
| --- | --- |
| Premium one-piece/integrally formed glass | One-piece formed glass construction |
| A Grade two stacked glass layers in raised 3D area | State construction only, no inferred superiority |
| Premium exterior appearance statement | Retained as evidence; no Apple/OEM authenticity claim; appearance wording omitted from Batch 1 |
| Literal product-type contents | Glass only; half assembly without wireless charging coil; coil only |

Do not ask for materials, durability, tolerances, coating or a detailed BOM simply
to fill fields. Those facts are not needed for this bounded copy. Ask only about
a concrete contradictory SKU if one is identified. No such exception is assumed.

Remaining coil review: for each existing mapped model below, record separately
for OEM/Aftermarket: compatible yes/no/unknown, public-safe evidence reference,
label approval, SKU approval, regional/configuration limitations, approved media,
and only an exception to coil-only contents if one exists. Matching names do not
answer compatibility. No activation or price/inventory assumptions follow.

| Model mapping (not fitment approval) | OEM / Aftermarket review |
| --- | --- |
| iPhone 17 Pro Max | Pending / Pending |
| iPhone 17 Pro | Pending / Pending — duplicated OEM title needs correction decision |
| iPhone 17 Air | Pending / Pending |
| iPhone 17 | Pending / Pending |
| iPhone 17e | Pending / Pending |
| iPhone 16 Pro Max | Pending / Pending |
| iPhone 16 Pro | Pending / Pending |
| iPhone 16 Plus | Pending / Pending |
| iPhone 16 | Pending / Pending |
| iPhone 15 Pro Max | Pending / Pending |
| iPhone 15 Pro | Pending / Pending |
| iPhone 15 Plus | Pending / Pending |
| iPhone 15 | Pending / Pending |
| iPhone 14 Plus | Pending / Pending |
| iPhone 14 | Pending / Pending |

Inspection reference remains open: supply factual pre-install checks, rejection
criteria, handling precautions and defect escalation route—not marketing prose.
These are required only for inspection guidance, not the construction-only copy.

## Current Jason decisions and deployment waves

REQUIRED BEFORE ANY PRODUCTION DEPLOYMENT: hosted theme/schema acceptance,
exact release scope, source-drift recheck, URL investigation findings, and
explicit production authorization. Existing homepage/concept/preview approvals
in the decision register remain intact; do not request them again.

REQUIRED FOR CONTENT IN THAT RELEASE: exact six-item Batch 1 merges and SEO;
exact collection wording; separate guidance publication approval. Michael's
construction answers do not approve replacing merchant descriptions.

OPTIONAL FOR LATER SEO/GEO IMPROVEMENT: approved About identity, public support
email, optional public phone/address, shipping wording, returns/warranty policies,
FAQ and their footer/contact placement. Do not publish new business claims or
policies while answers are missing; use the verified contact route.

| Wave | Scope | Unchanged prerequisite |
| --- | --- | --- |
| 1 | Approved theme metadata/schema/header/footer and eligible collection intros | Separately authorized hosted preview, then exact production approval; no shared Shopify content writes implied by theme preview |
| 2 | Exact product-copy merges using reviewed construction/literal contents; later SKU-specific facts | Jason approves itemized merges; Michael answers only exceptions or unresolved coil relationships |
| 3 | Approved buyer guidance and original inspection/reference material | First two guides have reviewed bounded facts; all four remain unpublished until separately authorized; inspection/fitment expertise still needed |

No wave is executed by this packet.
