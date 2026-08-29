# Origin Of `workers/` And `wrangler.jsonc`

## Determination

Codex created both paths on 2026-07-23 as part of the Back Glass Pros
Cloudflare React Router migration scaffold. Codex subsequently changed both.
They are project-related, but they predate and are unrelated to the 2026-08-07
SEO/GEO research task.

They are untracked because the application repository has no commits. Current
`git status --short` reports the entire application tree, including `workers/`
and `wrangler.jsonc`, as untracked; `git log --oneline --all` is empty.

## Reproducible Provenance

Primary session ledger:

`/Users/jason/.codex/sessions/2026/07/14/rollout-2026-07-14T20-58-24-019f60b5-0703-79b2-b376-001ef7ce3c71.jsonl`

- line 473: Codex ran `npx create-cloudflare@latest --help`; Cloudflare C3
  reported version 2.70.13.
- lines 479 and 508: two earlier scaffold attempts were made. The generated
  wrong/default scaffold was inspected and removed before the final attempt.
- line 523: Codex ran the final interactive scaffold command:
  `npm create cloudflare@latest backglass-ecommerce -- --framework=react-router --platform=workers --no-deploy --no-git --no-agents`.
- line 540: the generated file inventory includes
  `/Users/jason/backglass-ecommerce/workers/app.ts` and
  `/Users/jason/backglass-ecommerce/wrangler.jsonc`.
- line 772, confirmed by patch event line 773: Codex changed
  `wrangler.jsonc` from the scaffold variable to `MIGRATION_MODE`,
  `SHOPIFY_API_VERSION`, and `SHOPIFY_STORE_DOMAIN`.
- line 3561: Codex changed `workers/app.ts` to apply project security headers
  and `Cache-Control: no-store` on `/api/shopify/status`.
- `/Users/jason/backglass-ecommerce` is now a compatibility symlink to the
  canonical application directory under this business root.

The scaffold commands at ledger lines 473, 479, 508, and 523 used
`sandbox_permissions=require_escalated` and explicit approval questions. These
were older, approved project-creation actions; they were not commands from the
SEO/GEO session. C3 reported that no deploy was requested (`--no-deploy`).

## Current Files

### `wrangler.jsonc`

- Absolute path: `/Users/jason/Desktop/Michael's back glass business/01-software/backglass-ecommerce/wrangler.jsonc`
- Birth: 2026-07-23T16:41:16+0800
- Modified: 2026-07-23T16:59:59+0800
- Bytes: 1,386
- SHA-256: `241942fc344302999a9bd3a0e0fb93a38eaa6af4d85fcd79462785d112f4de9d`
- Purpose: names the Worker `backglass-ecommerce`, points `main` to
  `./workers/app.ts`, sets read-only migration/API/domain variables, enables
  observability/source maps, and enables `nodejs_compat`.
- It contains no secret value. Shopify client credentials remain in a separate
  ignored `.dev.vars` file.

### `workers/app.ts`

- Absolute path: `/Users/jason/Desktop/Michael's back glass business/01-software/backglass-ecommerce/workers/app.ts`
- Birth: 2026-07-23T16:41:16+0800
- Modified: 2026-07-28T16:44:00+0800
- Bytes: 724
- SHA-256: `8ad04673c728e3786783650a39c2d5d6cfa83a5cdd52a4d0b39e7f6907ee993e`
- Purpose: invokes the React Router request handler, applies local security
  headers, disables caching for `/api/shopify/status`, and returns the response.

No file was deleted or modified while determining this provenance.

