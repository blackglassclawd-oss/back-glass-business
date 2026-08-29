# AGENTS.md — Back Glass Pros

Universal context for any AI agent working in this repository. Role-specific
behavior is layered on top from [`.agents/roles/`](.agents/roles/) at launch.
Read this, then [`.agents/constitution.md`](.agents/constitution.md), then your
role file.

## What this is

Back Glass Pros is a US B2B distributor of Apple iPhone back glass and
rear-assembly repair parts for mobile repair shops. Shopify
(`kfczyu-kc.myshopify.com`, public domain `backglasspros.com`) is the live
transaction authority. A Cloudflare/React Router rebuild in
`01-software/backglass-ecommerce` is preview-only and in a low-priority
maintenance lane.

## Authority

- **Jason** — software, infrastructure, and the deciding vote on evidence-backed
  commercial changes. The single executive authority the CEO/operator reports to.
- **Michael** — product, catalog, grade, pricing-fact, fitment, quality,
  warranty, and inventory authority.
- **CEO / operator agent** — turns Jason's objective into bounded missions with
  one accountable owner each; does not become the full-time coder, copywriter,
  or analyst.
- Specialists report to the CEO. They do not form a council, vote, recursively
  delegate, or poll every other model.

## Current direction (see `10-knowledge/DECISIONS.md`, 2026-08-29)

1. Lean runtime: one persistent operator; four specialist profiles on the shelf;
   0-2 active for a real mission; one temporary opposite-model reviewer only for
   material calls.
2. Shopify-first revenue path: unit economics -> fulfillment proof -> store
   trust -> reactivation -> direct acquisition -> measure -> scale.
3. Primary metric: **30-day contribution profit from completed B2B orders**
   (net product revenue − landed COGS − discounts − fees − shipping subsidy −
   RMA/refund credits).

## Repository map

| Path | Contents | Committed? |
| --- | --- | --- |
| `01-software/` | Application code and automation | Yes |
| `02-assets/` | Selected safe-to-version brand/product assets | Yes |
| `03-data/` | Private business data, exports, correspondence | **No — local only** |
| `10-knowledge/` | Business facts, systems, catalog policy, decisions, roadmap, missions | Yes |
| `90-archive/` | Inactive prototypes, historical material | **No — local only** |

Also never committed: `.dev.vars`, `.passthrough.env`, admin export backups,
supplier/competitor scrapes (`data/source-media/`), source snapshots, and any
unlicensed media.

## Hard rules

- Never put customer/order data, supplier identities, costs, margins,
  credentials, or private correspondence into committed files, logs, or agent
  artifacts. Sanitized derived figures only.
- No agent approves its own recommendation.
- Autonomous: research, analysis, internal docs, code in branches, local tests,
  drafts, financial models.
- Requires Jason (and Michael for product/catalog): production deployment, any
  external message unless the campaign is pre-authorized, price or contract
  commitments, spending or moving money, publishing supplier media, DNS cutover,
  destructive production changes, customer-policy changes.
- Supplier product photography is internal reference until rights are cleared
  and Michael approves the exact presentation.
- Every public claim needs an owner, a data source, a calculation, and a review
  interval.

## Workflow

GitHub issue -> CEO brief ([`.pi/prompts/mission.md`](.pi/prompts/mission.md))
-> isolated branch/worktree -> owner does the work -> tests + evidence -> PR ->
opposite-model review when material ([`.pi/prompts/review.md`](.pi/prompts/review.md))
-> CEO decision ([`.pi/prompts/decision.md`](.pi/prompts/decision.md)) ->
Jason gate where production-visible.
