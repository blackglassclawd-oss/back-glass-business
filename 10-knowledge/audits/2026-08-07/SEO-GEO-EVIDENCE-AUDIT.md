# SEO/GEO RESEARCH ONLY

**Audit date:** 2026-08-07  
**Audit timezone:** Asia/Taipei  
**Performance baseline:** `BASELINE BLOCKED`  
**Traffic-lift evidence:** `NOT VERIFIED`

The prior work produced research, plans, local skill installations, and public
technical observations. It did not implement or deploy an SEO page cohort, did
not establish Google indexing, and did not measure—let alone cross-verify—an
increase in relevant organic traffic.

This audit made no SEO/GEO implementation, tracking, DNS, theme, schema,
canonical, redirect, publication, or deployment change. It made one read-only
Shopify product-status query, read-only public HTTP requests, wrote audit
artifacts, and corrected misleading status language in existing documentation.

## Final Evidence Table

| Claim | Status | Primary evidence | Independent cross-check | Missing evidence | Confidence | Next required action |
| --- | --- | --- | --- | --- | --- | --- |
| SEO/GEO research and planning documents exist | PLAN / RESEARCH | 16-file patch ledger and SHA-256 register in `prior-seo-file-changes.jsonl` and `deliverable-classification.tsv` | Current files exist; local links were previously checked | None for document existence | DIRECT — session patch events plus current hashes | Treat as inputs, not results |
| Seven marketing skills were installed locally | IMPLEMENTED LOCALLY | Pinned install command at prior session line 345; installed paths and hashes in `skill-risk-register.tsv` | Installed SKILL hashes equal commit `7868cb...f335` clone hashes | Upstream trust review remains required before broader use | CORROBORATED — command, path, commit, and byte match | Keep high-capability skills gated; do not auto-publish |
| Public technical crawl was performed | RESEARCH | Prior commands at session lines 377, 384, 388; public sitemap and page observations in `SEO-GEO.md` | Current sitemap independently reproduces 54 product URLs | GSC crawl/indexing data | DIRECT for public HTTP; NOT evidence of Google indexing | Obtain GSC indexing and performance exports |
| Competitor profiles were produced | RESEARCH | Seven dated analyst-note files plus four profile/summary files | Prior search/open/curl calls at lines 514-559 | US rank, traffic, backlinks, independent operational verification | DIRECT for notes; LIMITED for competitor claims | Keep external claims labeled unverified |
| 24 proposed queries are keyword targets | NOT VERIFIED; all remain HYPOTHESIS | `keyword-hypotheses-audit.csv` and corrected `SEARCH-ARCHITECTURE.md` | Prior session explicitly states demand/rank unknown | US demand, desktop/mobile rank, landing URL, selected canonical, conversion evidence | BLOCKED — required fields absent | Provide first-party/approved rank and demand exports |
| Proposed model-hub/site architecture is live | NOT VERIFIED | `SEARCH-ARCHITECTURE.md` says it is a plan and prohibits publication | Current public sitemap contains no proposed model-hub proof | Local implementation, deploy, HTTP, sitemap, index, performance records | NOT ESTABLISHED — documentation cannot satisfy implementation | Select no cohort until baseline, demand, inventory, and margin are verified |
| Analytics tracking plan is implemented | NOT VERIFIED | `ANALYTICS-TRACKING-PLAN.md` says PLAN only and BASELINE BLOCKED | Public source did not expose a static GA4/GTM ID; browser list is empty | Signed-in pixel inventory, property IDs, DebugView, production event tests | BLOCKED — no authorized instrumentation evidence | Provide GA4/GTM/Shopify Customer Events access or exports |
| Live SEO/GEO changes were deployed | NOT VERIFIED | Prior final explicitly states no live Shopify, Google, DNS, or production changes | No deployment command, live change record, or cohort diff in the tool ledger | Commit/diff, deploy timestamp, live URL verification | NOT ESTABLISHED — deployment gate unmet | Do not deploy until baseline and cohort approval |
| Changed pages are indexed | NOT VERIFIED | No GSC URL Inspection/indexing export | Public 200/canonical/sitemap signals show only technical indexability | Google-selected canonical, indexed/excluded state, last crawl | BLOCKED — indexing gate requires Google evidence | Export GSC page indexing and URL Inspection evidence |
| Relevant organic traffic increased | NOT VERIFIED | No GSC performance export | No GA4 organic landing export | Comparable pre/post windows and changed/control cohorts | BLOCKED — primary success gate unmet | Provide immutable GSC and GA4 exports |
| Traffic lift is commercially valuable | NOT VERIFIED | No joined account/order/repeat/revenue cohort | Only product/catalog state was queried; no customer/order data was fetched | Qualified accounts, orders, repeat orders, revenue, confounders | BLOCKED — business cross-check absent | Provide access-controlled business exports for the same windows |
| GEO visibility or traffic improved | NOT VERIFIED | No Google AI report, AI-referral export, or fixed prompt-test result | No GSC/GA4 traffic evidence | Dated report/export and fixed diagnostic prompt set | BLOCKED — GEO evidence absent | Measure separately; citation tests remain diagnostic |
| Catalog discrepancy is reconciled | MEASURED — catalog state only | Current Shopify query: 84 roots = 56 ACTIVE + 28 DRAFT; `catalog-reconciliation.json` | Current sitemap: 54 URLs; public GET: 54 self-canonical 200, 28 draft 404, two active/unpublished 404 | Google indexed state remains unavailable | CORROBORATED — Admin API + sitemap + independent HTTP | Use the authoritative set before any future page cohort |
| `workers/` and `wrangler.jsonc` came from the SEO task | FALSE | Older session provenance in `WORKERS-WRANGLER-ORIGIN.md` | Birth times 2026-07-23 and current hashes; SEO file-change ledger excludes them | No missing origin evidence identified | DIRECT — old scaffold calls, patch events, timestamps, and contents | Leave unchanged; commit separately only when the project is ready |

## Exact Permission And Command Audit

Primary SEO session ledger:

`/Users/jason/.codex/sessions/2026/08/06/rollout-2026-08-06T16-51-02-019fd644-d1b6-7733-bf0e-2e047cac05d9.jsonl`

The SEO/GEO work starts with the user request at line 247 and ends immediately
before the audit request at line 636.

| Setting | Exact evidence/result |
| --- | --- |
| Sandbox mode | `danger-full-access`; no filesystem sandboxing |
| Approval mode | `never` |
| Network | Enabled |
| Workspace metadata | root `/Users/jason`; `permission_profile=disabled`; filesystem `unrestricted` |
| Effective writable scope | Full host process access under `danger-full-access`; not limited by a sandbox allowlist |
| Commands unsandboxed | Yes. Every shell command in the prior SEO range ran under the global full-access context |
| Per-command escalation | None in the SEO range: zero `sandbox_permissions` and zero `require_escalated` occurrences |
| Approval bypass | No command recorded a bypass flag or overrode an approval. Because policy was `never`, commands ran without interactive approval by configuration |
| “Dangerously skip permissions” mode | No matching flag or equivalent string in any prior SEO tool input |
| Destructive command | One attempted `rm -rf /tmp/backglass-seo-skill-audit.T7QICv`; the safety wrapper rejected it, so no deletion occurred |

The prior range contains 63 outer tool-orchestration calls. Their exact inputs
contain 83 `exec_command` invocations, 15 web calls, eight `apply_patch` calls,
and three signed-browser runtime calls. All exact inputs, hashes, timestamps,
and original ledger line numbers are preserved in
`prior-seo-tool-calls.jsonl`. That file is the exhaustive answer to “every
command that received full-system access”; no command is omitted or paraphrased.

Write operations created the seven skill directories through the pinned
installer and changed the 16 project documentation files through eight patch
calls, all listed in the classification and tool-call registers.
There was no `wrangler deploy`, Shopify mutation, Google write, DNS write,
external upload, message send, git commit, or git push in the SEO range.

## Skill Safety Verdict

The complete 127-row instance/source register, 1,860-row file/hash tree, and
full-content security scan are separate because they are too wide for a readable
narrative table:

- `SKILL-AUDIT.md`
- `skill-risk-register.tsv`
- `skill-integrity-manifest.tsv`
- `skill-security-scan.tsv`

Result: 4 PASS, 123 REVIEW, 0 FAIL. REVIEW is conservative and means the skill
has external-content, credential, code, browser, install, or write capability,
or its original bytes/provenance could not be fully verified. It does not mean
the capability was exercised.

The previous competitor research did not visibly obey an external instruction
or execute page content. Nevertheless, the trust boundary is REVIEW, not PASS:
the competitor/SEO skills have no prompt-injection rule, downloaded repository
documents entered model context, and the sitemap crawler followed unvalidated
`<loc>` targets without a same-origin allowlist. External content remained data
in observed behavior, but that property was not technically enforced.

## Reclassification Of Every Prior Project File

The exact 16-file table with pre-correction and current SHA-256 values is
`deliverable-classification.tsv`.

| File/group | Classification | Evidence | Higher gates |
| --- | --- | --- | --- |
| `10-knowledge/SEO-GEO.md` | PLAN | Prior patch lines 410/595/608; current local file | IMPLEMENTED/DEPLOYED/INDEXED/MEASURED/PERFORMANCE VERIFIED: NOT VERIFIED |
| `10-knowledge/SEARCH-ARCHITECTURE.md` | PLAN | Prior successful patch line 586; current local file | All 24 targets remain HYPOTHESIS; no live hubs |
| `10-knowledge/ANALYTICS-TRACKING-PLAN.md` | PLAN | Prior patch line 608; current local file | No tag/event implementation or production validation |
| `.agents/product-marketing.md` | RESEARCH | Prior patch line 507; current local file | Hypotheses/context only |
| Three competitor profiles plus `_summary.md` | RESEARCH | Prior patch line 564; current hashes | Competitor rank/traffic/claims not independently verified |
| Seven dated competitor “raw” note files | RESEARCH | Prior patch line 559; current hashes | Analyst summaries, not raw byte-for-byte HTML exports |
| Root `README.md` link | PLAN | Prior patch line 410 | Navigation documentation, not implementation |
| Seven installed skills | IMPLEMENTED LOCALLY | Pinned installer command and matching local hashes | Not deployed; no production behavior by installation alone |
| Public crawl observations | RESEARCH | Prior hard-coded crawl commands and public responses | Not Google INDEXED or performance MEASURED evidence |

There is no qualifying item in the prior work for `DEPLOYED`, `INDEXED`,
`MEASURED` SEO performance, or `PERFORMANCE VERIFIED`. Local documents do not
satisfy `IMPLEMENTED LOCALLY` under this audit rule.

The business root is not a Git repository. The application subdirectory is a
Git repository with no commits; all files are untracked. Therefore there is no
commit history that can prove the prior SEO document changes. The session patch
events and SHA-256 manifests are the available local provenance.

## “Phase 0 Complete” Audit

The exact prior statement was:

> Phase 0 is complete: the SEO/GEO operating plan, competitive baseline, site
> architecture, and measurement contract are documented and validated.

That wording could reasonably be misunderstood as measurement or SEO phase
completion. The same final response then disclosed that the 24 queries were
hypotheses, volume/rank were unknown, signed GSC/GA4 access was unavailable, and
no production changes were made. “Complete” therefore meant only “documents
drafted and local links checked.” Even with the later caveats, the headline was
overbroad.

The wording has been corrected in `SEO-GEO.md`, `SEARCH-ARCHITECTURE.md`,
`ANALYTICS-TRACKING-PLAN.md`, `.agents/product-marketing.md`, and ambiguous
competitor indexing statements. The corrected status is:

**Research/planning documents drafted; first-party baseline, implementation,
deployment, indexing, and performance verification are not complete.**

## Baseline Gate

Two browser checks—one in the prior work and one during this audit—found no
connected browser (`[]`). No GSC, GA4, Google AI, rank, or approved keyword
demand export exists in project evidence. The definitive status is
`BASELINE BLOCKED`.

`BASELINE-STATUS.md` records the required property/account IDs, exact export
dates, 2025-04-07 through 2026-08-06 historical range, timezone, United States
and device filters, brand/non-brand definition requirement, URL/query cohorts,
raw locations, and transformation-script requirement. Raw exports must remain
unchanged.

The existing Shopify Admin backup contains five order roots, but it is not a
matched SEO baseline and lacks approved page/source cohorts, account
applications, qualified accounts, comparable periods, and attribution joins.
It was not used as a performance substitute. This audit deliberately fetched no
order or customer data.

## Catalog Reconciliation

### Reproducible source counts

```bash
python3 -c 'import json; print(len(json.load(open("data/storefront/catalog.json"))["products"]))'
```

Result: `66` products in the 2026-07-26 public Storefront JSON snapshot.

```bash
python3 -c 'import json; p="backups/admin/2026-08-06T06-35-37.615Z/products.jsonl"; print(sum(1 for l in open(p) if (lambda x: not x.get("__parentId") and str(x.get("id","")).startswith("gid://shopify/Product/"))(json.loads(l))))'
```

Result: `84` authenticated product roots. All 84 were `ACTIVE`; exactly 66 had
non-null `publishedAt`. Those 66 IDs exactly equal the earlier public snapshot
set. Thus 66 and 84 were not contradictory: one was the published public set,
the other included 18 active-but-unpublished roots.

Current product-only Admin query, preserved verbatim in the raw export:

```graphql
query CatalogAudit {
  products(first: 250, sortKey: ID) {
    nodes {
      id legacyResourceId title handle status publishedAt onlineStoreUrl
      productType tags totalInventory updatedAt
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

Current result at 2026-08-07T08:59:02.442Z: 84 roots, 56 ACTIVE, 28 DRAFT,
no next page. The 28 drafts exactly match the saved full-assembly pre-change set
and now have no online-store URL.

Public sitemap reproduction:

```bash
curl -fsSL 'https://backglasspros.com/sitemap.xml'
curl -fsSL 'https://backglasspros.com/sitemap_products_1.xml?from=8100267983020&to=8112326246572'
```

The product sitemap contains 54 product URLs. Independent throttled-and-retried
GET verification established:

- 54 `ACTIVE` products: HTTP 200, self-declared canonical, in sitemap, no
  detected noindex — classified `live/indexable` in the technical sense, not
  Google `INDEXED`;
- 2 `ACTIVE` products with `onlineStoreUrl=null`: the Premium and A Grade
  `iphone-se-3rd-gen-large-hole-back-glass-*` handles return 404 and are
  `live/non-indexable`;
- 28 `DRAFT` full-assembly products: no online-store URL, omitted from sitemap,
  return 404 with `/404` canonical;
- 0 ARCHIVED roots;
- 0 exact duplicate titles or handles;
- 0 product redirects observed;
- 0 app-generated product roots identified. The two known Extend Commerce
  app-generated URLs are collections, not products.

The complete per-product classification and all source hashes are in
`catalog-reconciliation.json`. Google-selected canonicals and actual indexed
state remain NOT VERIFIED without GSC.

## Query, Cohort, And Implementation Gates

`keyword-hypotheses-audit.csv` contains all 24 queries and every requested
field. US demand, desktop rank, mobile rank, current landing URL, and
Google-selected canonical are all `NOT VERIFIED`; commercial relevance and
target page are labeled hypotheses/proposals; cannibalization is unmeasured.

No smallest measurable implementation cohort can be responsibly selected yet.
The joint prerequisites—verified demand, current rank/landing page, current
catalog authority, available inventory, margin, unique evidence, and baseline
traffic—are not all present. No implementation record exists because no cohort
was changed or deployed.

## Traffic And GEO Measurement Rule

The primary success metric is a visible increase in relevant organic traffic to
the changed cohort. Before any result is observed:

- freeze changed and untouched/control URL sets;
- compare equivalent pre/post windows and show cohorts separately;
- require GSC non-brand clicks and GA4 organic landing sessions/users to move in
  the same sustained upward direction for at least two comparable windows;
- mark disagreement `INCONCLUSIVE`;
- use Shopify account/order/repeat/revenue data as a quality/value cross-check;
- examine algorithm updates, seasonality, inventory/publication changes, paid
  campaigns, outages, tracking changes, promotions, and other confounders.

No percentage threshold has been invented. The known 2026-08-07 drafting of 28
full-assembly products is already a catalog/publication confounder that any
future analysis must record.

GEO remains separate:

- Google AI: report only what an available first-party report actually exposes,
  plus ordinary GSC Web traffic;
- AI referrals: require GA4 referrer/source evidence;
- citation tests: fixed, dated, documented diagnostics only;
- AI visibility without organic traffic lift must be reported as
  `GEO VISIBILITY UP / TRAFFIC SUCCESS NOT PROVEN`.

No component currently has sufficient data for a GEO success claim.

## Untracked Cloudflare Files

`WORKERS-WRANGLER-ORIGIN.md` proves that Codex created `workers/` and
`wrangler.jsonc` on 2026-07-23 via Cloudflare C3 2.70.13, then changed them for
the local read-only migration application and security headers. Their birth
times predate SEO work by 15 days. They are related to Back Glass Pros, not to
the SEO task, and they remain untracked only because the application repo has no
commits. Neither file was modified or deleted during this audit.

## Evidence Artifact Index

- `BASELINE-STATUS.md` — blocked first-party baseline and exact export request
- `SKILL-AUDIT.md` — skill safety and trust-boundary narrative
- `skill-risk-register.tsv` — every advertised/installed/referenced/read skill instance
- `skill-integrity-manifest.tsv` — complete per-file trees and SHA-256 values
- `skill-security-scan.tsv` — full-content pattern/domain/trigger scan
- `prior-seo-tool-calls.jsonl` — exhaustive prior full-access tool inputs
- `prior-seo-file-changes.jsonl` — prior 16-file patch provenance and diffs
- `deliverable-classification.tsv` — file-by-file classification and evidence gates
- `keyword-hypotheses-audit.csv` — all 24 query fields
- `catalog-reconciliation.json` — all 84 product classifications and source hashes
- `WORKERS-WRANGLER-ORIGIN.md` — Cloudflare scaffold provenance
- `raw/` — immutable audit-time public and product-only Shopify responses
