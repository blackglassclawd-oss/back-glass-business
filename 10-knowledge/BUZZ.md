# Buzz Discovery

## Intended role

Buzz is being evaluated as the shared workspace where Back Glass Pros humans
and AI agents communicate, preserve decisions, review work, and run approved
workflows. The exact boundary is not yet decided.

Upstream project: <https://github.com/block/buzz>

Buzz currently provides a self-hostable community selected by its authoritative
URL, signed identities for people and agents, channels, search, audit history,
Git events, an agent-oriented CLI, and YAML-triggered workflows. Upstream also
labels workflow approval gates as still being wired up, so business controls
cannot depend on unfinished approval behavior.

## Recommended first boundary

Start Buzz as a private internal workspace for project knowledge, software work,
and read-only operational summaries. Do not initially place Shopify secrets,
raw customer/order exports, supplier costs, margins, or private email bodies in
the event log.

Suggested initial rooms:

- `announcements` — owner-approved decisions and major state changes.
- `catalog` — SKU, fitment, grade, image, and publication reviews.
- `operations` — inventory, fulfillment, RMA, and exception summaries.
- `storefront-migration` — Cloudflare/Shopify implementation and tests.
- `buzz-admin` — workspace configuration, identities, backups, and security.
- `agent-review` — proposed agent actions awaiting human approval.

## Initial agent policy draft

- Agents may read approved project documents and produce summaries or drafts.
- Research agents may analyze markets, competitors, customers, products, and
  operations and submit quantified recommendations with sources, assumptions,
  expected impact, downside risk, and a measurement plan.
- Agent recommendations require human approval. Convincing evidence can change
  prior business choices, but the approving human and success metric must be
  recorded in Buzz.
- Agents may modify local code/docs within explicit task scope and report diffs.
- Agents may not change Shopify product, price, inventory, publication, order,
  refund, fulfillment, customer, or company state without an explicit owner
  approval tied to a reviewed diff and fresh backup.
- Agents may not send customer/supplier communications, publish content, deploy
  production, alter DNS, or rotate credentials without explicit approval.
- Secrets and raw personal data stay outside channels and workflow logs.

## Deployment decisions required

- Business-wide operating workspace or software/agent room only.
- Human members, agent identities, and whether any external party can join.
- Local trial, Railway, or owned VPS production relay.
- Authoritative community URL, likely a private subdomain.
- Backup, restore, uptime, update, and administrator ownership.
- Data classification and retention rules.
- GitHub integration versus Buzz Git hosting.
- Exact read/write permissions for each agent and workflow.
- Primary business metric, guardrails, experiment duration, and the rule for
  resolving conflicts between Michael's product judgment and Jason's
  data-backed commercial approval.

Buzz implementation should begin only after these decisions and after the
active application is committed to a private remote.
