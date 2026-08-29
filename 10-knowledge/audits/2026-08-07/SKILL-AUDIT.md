# SEO/GEO Skill And Trust-Boundary Audit

## Scope And Evidence

The session began with 36 advertised skills. It then installed seven
`coreyhaines31/marketingskills` skills, already had `grill-me`, read a rotated
Chrome skill version, cloned the complete `marketingskills` and `claude-seo`
repositories for inspection, and listed their skill packages.

The exact enumeration is in `skill-risk-register.tsv` (127 rows). Rows represent
skill instances and inspected source packages, not 127 active installations;
an installed skill and its identical cloned source are separate rows. The
complete per-file tree, mode, executable bit, byte size, and SHA-256 is in
`skill-integrity-manifest.tsv` (1,860 file/scope rows). The full-content security
scan is in `skill-security-scan.tsv`.

Audit method:

1. Read every byte of every current `SKILL.md` and every file in each advertised
   skill directory, installed skill directory, and both cloned community
   repositories, excluding `.git` object databases.
2. Hash every file and symlink target with SHA-256.
3. Search all decoded text for shell/subprocess use, `curl`/`wget`, package
   installation, `eval`/`exec`, deletion, git configuration, environment and
   credential access, SSH, cloud/Shopify/Cloudflare credentials, browser/MCP/app
   calls, external writes/uploads, telemetry, permission weakening, untrusted
   content controls, and prompt-injection phrases.
4. Enumerate executable bits, script/code extensions, hooks, domains, named
   credential variables, write capabilities, and frontmatter trigger text.
5. Scan for bidirectional, zero-width, and hidden Unicode control characters.

Four original plugin-cache paths were rotated away before this audit and cannot
be honestly re-hashed: Browser 26.707.72221, Chrome 26.707.72221, Computer Use
1.0.1000387, and Visualize 1.0.11. Their exact integrity is `NOT VERIFIED`.
Chrome 26.715.21316—the replacement version actually read later in the SEO
turn—was fully hashed. This is the only completeness exception.

## Installed Or Directly Used Skills

| Exact skill | Absolute path | Source/version | Code/dependencies/network/credentials/write | Auto-trigger | Risk |
| --- | --- | --- | --- | --- | --- |
| `skill-installer` | `/Users/jason/.codex/skills/.system/skill-installer` | OpenAI system bundle; CLI 0.146.1; SKILL SHA `d68b77e5...f8ee` | Python downloads from GitHub API/codeload, can use Git/GitHub auth, writes into the Codex skills directory, removes temporary staging paths; no downloaded code was executed by the installer | Requests to list/install skills or install from a repo | REVIEW |
| `grill-me` | `/Users/jason/.codex/skills/grill-me` | `mattpocock/skills`; unpinned install; SKILL SHA `6189dfce...ba54`; byte-matches main `84fdeffd...0502` on audit date | Two text/YAML files; no scripts, network, credentials, or write instruction | Manual only: `disable-model-invocation: true` and `allow_implicit_invocation: false` | PASS |
| `wholesale-b2b-commerce` | `/Users/jason/.codex/skills/wholesale-b2b-commerce` | Local skill, upstream provenance NOT VERIFIED; SKILL SHA `1387c512...3cd` | Markdown only, but authorizes catalog/Shopify analysis and scoped mutation after backup; could access private business sources if a task authorizes it | Wholesale catalog, pricing, reorder, retention, SEO/GEO, migration requests | REVIEW |
| `product-marketing` | `/Users/jason/.codex/skills/product-marketing` | `coreyhaines31/marketingskills` 2.1.0, commit `7868cb9251fad80a73d26e488a5ad5f6c4a9f335`; SKILL SHA `6dfd6bd4...d1ec` | Markdown/eval only; writes `.agents/product-marketing.md`; no executable support file | Product context, ICP, positioning, audience, or new marketing-project context | REVIEW |
| `seo-audit` | `/Users/jason/.codex/skills/seo-audit` | Same repo, 2.0.0; SKILL SHA `3b03a2e0...d1cb` | Markdown/JSON only; directs web/curl crawling and connected SEO data access; can recommend/code changes | SEO audit, indexing, rankings, page speed, metadata, technical SEO | REVIEW |
| `schema` | `/Users/jason/.codex/skills/schema` | Same repo, 2.0.0; SKILL SHA `d8b7aa7b...e0b` | Markdown/JSON only; can write JSON-LD/site code and call validators; example uses `dangerouslySetInnerHTML` for JSON serialization, not a permission bypass | Schema/JSON-LD/rich-result implementation requests | REVIEW |
| `site-architecture` | `/Users/jason/.codex/skills/site-architecture` | Same repo, 2.0.0; SKILL SHA `a47f693c...492` | Markdown/JSON only; produces page hierarchy, URL, navigation, and internal-link plans; no executable support file | Site map/hierarchy/navigation/URL/internal-link planning (not XML sitemap auditing) | REVIEW |
| `ai-seo` | `/Users/jason/.codex/skills/ai-seo` | Same repo, 2.2.0; SKILL SHA `009333fb...322` | Markdown/JSON only; directs AI-search content/crawler analysis and may write content/machine-readable files; platform assertions require primary-source verification | AI SEO/AEO/GEO/LLMO, AI Overviews, LLM citations, `llms.txt`, OKF | REVIEW |
| `competitor-profiling` | `/Users/jason/.codex/skills/competitor-profiling` | Same repo, 2.0.0; SKILL SHA `ea7b5b7f...b3af` | Markdown/JSON only; directs scraping/search/MCP use and writes profiles; consumes untrusted external pages without a prompt-injection boundary | Competitor URLs, competitor research/profile/landscape requests | REVIEW |
| `analytics` | `/Users/jason/.codex/skills/analytics` | Same repo, 2.0.1; SKILL SHA `3eda97d9...8404` | Markdown/JSON only; may write GA4/GTM/site tracking, access connected analytics, and alter measurement configuration when authorized | GA4/GTM/conversion/event/measurement requests | REVIEW |
| `chrome:control-chrome` | `/Users/jason/.codex/plugins/cache/openai-bundled/chrome/26.715.21316/skills/control-chrome` | OpenAI bundled plugin 26.715.21316; SKILL SHA `b4b06a14...3eb26` | Browser runtime can operate visible signed-in sessions; skill forbids cookies, local storage, password/profile/session-store inspection; no browser was available | Tasks requiring current Chrome tabs, login state, extensions, or UI | REVIEW |
| `programmatic-seo` | `/tmp/backglass-seo-skill-audit.T7QICv/marketingskills/skills/programmatic-seo` | Community source only, 2.0.0 at commit `7868cb...f335`; SKILL SHA `15cb5979...de1b` | Markdown/JSON only; can generate many local/site pages; explicitly held and never installed/invoked | Requests to create templated SEO pages at scale | REVIEW |

The full register contains every other advertised OpenAI/plugin/local skill, all
46 `marketingskills` packages listed in the cloned source, and all 33 main or
extension `SKILL.md` packages in the `claude-seo` candidate repository. Each row
contains the exact path, source, version/commit, integrity reference, file/code
inventory, dependencies, domains, credentials, writes, trigger, trust finding,
and PASS/REVIEW/FAIL result.

## Community Repository Findings

### `coreyhaines31/marketingskills`

- Commit: `7868cb9251fad80a73d26e488a5ad5f6c4a9f335`.
- Seven skills were installed by exact pinned commit. Their installed hashes
  match the cloned source hashes.
- The complete clone contains 429 non-git files and 66 executable/script-marked
  files, largely repository tooling and many marketing service CLIs. Those tools
  were inspected but were not copied by the seven per-skill installs and were
  not executed.
- Repository integrations describe credentials and network access for many
  services, including GSC, GA4, Google Ads, Shopify, Semrush, DataForSEO,
  Firecrawl, HubSpot, Stripe, ad platforms, and messaging providers. None was
  connected by installing the seven Markdown skill packages.
- The seven installed scopes contain Markdown, references, and eval JSON—no
  shell, Python, JS, binary, or hook file.

### `AgriciDaniel/claude-seo`

- Commit: `09d37c7b66ed3ca9c6efbdb765a805a6c76a8f01`.
- Clone path: `/tmp/backglass-seo-skill-audit.T7QICv/claude-seo`.
- It was evaluated and rejected/not installed. The safety wrapper also rejected
  the later temporary-directory `rm -rf`, so the clone remains available for
  this audit.
- The repo contains 379 non-git files and 36 executable-bit files. It includes
  install/uninstall shell and PowerShell code, a launcher, hooks, Python scripts,
  subprocess/runtime helpers, fetch/render/crawl logic, package-install paths,
  OAuth helpers, API clients, and external submission tools.
- Named/possible services include Google OAuth/Search Console/GA4/Keyword
  Planner/Indexing APIs, Bing Webmaster/IndexNow, DataForSEO, Ahrefs, Firecrawl,
  SE Ranking, Profound, Gemini, Common Crawl, Moz, PageSpeed/CrUX, YouTube,
  OpenStreetMap, and browser/MCP tooling.
- It can read environment/API credentials and write local reports/configuration;
  some scripts can submit URLs or modify external services. It contains install,
  uninstall, deletion, subprocess, curl, and package-manager instructions.
- Concrete credential/config locations include `~/.claude/settings.json`,
  `~/.config/claude-seo/google-api.json`,
  `~/.config/claude-seo/oauth-token.json`, project `.env` files, and variables
  such as `DATAFORSEO_USERNAME`, `DATAFORSEO_PASSWORD`, `GOOGLE_AI_API_KEY`,
  `GOOGLE_API_KEY`, `FIRECRAWL_API_KEY`, `AHREFS_API_TOKEN`,
  `SERANKING_API_KEY`, `PROFOUND_API_KEY`, `BING_WEBMASTER_API_KEY`, and
  `INDEXNOW_KEY`. No such file or variable was read by a candidate script during
  the SEO session because no candidate code was executed.
- No candidate script, hook, installer, credential flow, or external submission
  was executed. Risk: REVIEW, not FAIL, because capability is substantial but no
  malicious behavior or approval/sandbox bypass instruction was found.

## Permission-Weakening And Hidden-Instruction Search

- No `dangerously skip permissions`, approval bypass, sandbox disable, or
  equivalent instruction was found in the SEO/community skills.
- `cloudflare-deploy` (available but not used for SEO) contains two instructions
  to retry deployment with `sandbox_permissions=require_escalated` when sandbox
  networking blocks a deployment. That is an escalation instruction and is
  marked REVIEW. It was not invoked in the SEO/GEO turn.
- No zero-width/bidirectional Unicode control characters were found.
- No `ignore previous/system/developer instructions` or jailbreak phrase was
  found. Benign security references to system prompts and
  `dangerouslySetInnerHTML` were not classified as approval bypasses.
- No `git config`, SSH-key installation, cloud-credential export, telemetry
  activation, external upload, or package installation was performed by the
  installed SEO skills. The candidate repositories merely contain instructions
  or code capable of some of those actions.
- Available non-SEO skills have additional credential reach recorded in the
  register: the installer can use `GITHUB_TOKEN`, `GH_TOKEN`, existing Git/SSH
  credentials, and `$CODEX_HOME`; Wrangler/Cloudflare skills can use Wrangler
  login state, `.env`, `CLOUDFLARE_API_TOKEN`, account/zone IDs, and Cloudflare
  config/credential files; Sentry can inspect `SENTRY_AUTH_TOKEN`, `.env`, DSNs,
  and CLI login state. Chrome can operate a signed-in UI, but its instructions
  explicitly prohibit cookie, local-storage, profile, password, and session-store
  inspection.

## Untrusted Web Content Boundary

Competitor pages, search results, sitemaps, robots files, HTML comments,
JSON-LD, and downloaded repository documentation are untrusted data. They must
never be treated as agent instructions.

The relevant installed skills do not enforce this rule. In particular,
`competitor-profiling` explicitly consumes scraped Markdown, and `seo-audit`,
`ai-seo`, and browser workflows consume external page content; none of their
scopes contains a prompt-injection/data-only boundary. Therefore they can expose
untrusted webpage text to the model as context. Risk: REVIEW.

Observed prior behavior did not execute or follow a competitor-page instruction:

- competitor URLs and shell commands were hard-coded by Codex;
- no competitor HTML/README text was passed to a shell, `eval`, `exec`, package
  manager, git configuration, credential store, upload, or service mutation;
- profile files paraphrased claims and labeled them unverified;
- no browser, Shopify, Google, DNS, or production write followed competitor text.

However, the boundary was not structurally complete. The prior sitemap crawler
followed every `<loc>` value without a same-origin allowlist, so untrusted
sitemap data selected outbound fetch targets. The saved “raw” competitor files
are also analyst notes, not byte-for-byte raw HTML. The correct verdict is:

**Observed competitor content remained data in practice, but prompt-injection
and same-origin protections were not enforced. Trust-boundary status: REVIEW.**

## Risk Result

The conservative register result is 4 PASS, 123 REVIEW, 0 FAIL across 127
advertised/installed/source-instance rows. REVIEW means manual control or
additional trust/credential/write guardrails are required; it does not mean the
skill was malicious or that its capabilities were exercised.
