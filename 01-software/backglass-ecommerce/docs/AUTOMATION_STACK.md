# Automation Stack

## Installed

- `wholesale-b2b-commerce`: local skill for catalog normalization, B2B offer,
  order UX, sales, retention, SEO/GEO, metrics, and controlled automation.
- `cloudflare-deploy`: Cloudflare Workers and deployment workflows.
- `playwright`: browser validation and storefront regression checks.
- `security-best-practices` and `security-threat-model`: security review before
  enabling writes or processing customer data.
- `sentry`: production issue inspection after monitoring is configured.

## Recommended Integrations

Install or connect only when the business uses the corresponding service:

| Integration | Use | Initial access |
| --- | --- | --- |
| Shopify AI Toolkit | API schemas, GraphQL/Liquid validation, Shopify CLI | Read-only pilot; disable optional telemetry |
| HubSpot | Accounts, deals, tasks, support, sales reporting | Read-only until CRM ownership is decided |
| Apollo or Outreach | Repair-shop prospecting and sequences | No sending until list quality and consent are reviewed |
| Semrush | Keyword, competitor, backlink, and traffic research | Read-only |
| Windsor.ai | Cross-channel Shopify, GA4, Search Console, ads, CRM reporting | Read-only |
| Gmail/Outlook/SendGrid | Follow-up drafts and transactional email | Draft-only before approved sending |
| Brand24/Canva | Social listening and creative production | Read-only or draft-only |

Do not install every connector. HubSpot, Apollo, Outreach, Semrush, Windsor.ai,
Brand24, Canva, and Mixpanel are useful only if the store has or chooses those
accounts.

## Avoid Blind Installation

Community SEO/GEO skill packs often request many API keys, publish content, or
install additional runtimes. Audit and pin source before use. Port only the
needed workflows into the local skill.

Google's current guidance does not support adding `llms.txt`, synthetic brand
mentions, or AI-only rewrites as special generative-search optimizations.

## Required Owner Decisions

1. CRM: HubSpot, another system, Shopify/customer export, or none.
2. Email: current provider and whether automation may draft only or send.
3. Social accounts and channels currently owned by the business.
4. Existing GA4, Search Console, Merchant Center, ad, and Semrush accounts.
5. Prospecting tools already licensed, if any.
