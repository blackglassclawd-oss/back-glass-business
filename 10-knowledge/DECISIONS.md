# Decision Log

## Confirmed or recorded direction

| Date | Decision | Status |
| --- | --- | --- |
| 2026-07-28 | Register `backglasspros.com` at Porkbun | Completed |
| 2026-07-28 | Keep Shopify as operating and transaction authority during gradual migration | Active |
| 2026-07-29 | Stop offering Full Assemblies; move to Draft and delete nothing | Recorded; current live application must be re-audited |
| 2026-07-29 | Keep Premium and A Grade Half Assemblies without charging coil | Recorded |
| 2026-07-29 | Offer charging flex separately with Aftermarket and OEM Pull variants | Superseded by the 2026-08-29 standalone-coil direction |
| 2026-08-03 | Apply catalog corrections in Shopify before propagating to Cloudflare | Active |
| 2026-08-06 | Evaluate PhoneLCDParts imagery because available MobileSentrix imagery did not match the required configuration | Owner feedback; rights and product accuracy still require approval |
| 2026-08-06 | Use the Michael's back glass business directory as the local project core | Completed |
| 2026-08-06 | Evaluate Buzz as the human/agent workspace | Discovery in progress |
| 2026-08-06 | Michael owns product/catalog judgment; Jason owns architecture and may approve evidence-backed commercial recommendations | Active; conflict rule and metrics pending |
| 2026-08-06 | Use research agents to improve efficiency and commercial results, with human approval retained | Active |
| 2026-08-29 | Create the first parent commit for the core repository (824 files; private data, archive, secrets, and supplier media excluded) | Completed |
| 2026-08-29 | `blackglassclawd-oss` is the business GitHub owner; private repo `blackglassclawd-oss/back-glass-business`, existing parent history as `main`. GitHub is the development source of truth from the successful push forward. `03-data/`, `90-archive/`, secrets, supplier/reference scrapes, source snapshots, and unlicensed media stay local-only | Active after successful private remote push |
| 2026-08-29 | Lean structure: one persistent CEO/operator (GPT-5.6 Sol); four prepared specialist profiles (Website Opus 5, Commercial Opus 5, Finance Sol, BizDev Sol) activated only for a real mission, 0-2 at a time; one temporary opposite-model reviewer only when warranted. Pi role files + lightweight Herdr launch commands prepared now. No orchestration extension, mission bus, voting council, standing scheduler, or Fusion replacement | Active |
| 2026-08-29 | Shopify-first revenue path: unit economics -> fulfillment proof -> store trust / purchase-path blockers -> reactivation -> direct repair-shop acquisition -> measure -> scale what works. Do not wait on the Cloudflare rebuild to generate demand | Active |
| 2026-08-29 | Cloudflare storefront rebuild moves to a low-priority maintenance lane: keep the codebase healthy, fix critical/security issues, preserve tests and deployment knowledge, build only what directly removes a commercial blocker, no speculative parity work while M1-M3 are open. Website development is an on-demand function, not the primary workstream | Active, low-priority maintenance lane |
| 2026-08-29 | Primary commercial metric (amends Open decision #11): **30-day contribution profit from completed B2B orders** = net product revenue - landed product COGS - discounts - payment/transaction fees - outbound shipping subsidy - directly attributable RMA/refund credits. Companion metrics: active purchasing B2B accounts, contribution profit per active account, repeat-order rate, gross margin %, stock accuracy, order accuracy / fulfillment-error rate. Promote **repeat contribution profit per active account** to primary once customers have had a realistic chance to reorder | Active; #11 partially resolved, repeat-metric promotion pending |
| 2026-08-29 | The Fable review is recorded as an adversarial model critique, not independent business evidence. Validation comes from real landed COGS, shipped orders, fulfillment errors, customer replies, repeat purchases, and contribution profit | Active |
| 2026-08-29 | Full Assemblies are retired without deletion. Back Glass and standalone Wireless Charging Coils are separate part types. Verified coil models receive separate OEM and Aftermarket drafts only; no draft is sellable until price, inventory, SKU, compatibility, included components, grade definition, rights-cleared model media, and owner approvals are complete. iPhone 17e and 16e remain blocked; no 14 Pro/Pro Max coils are established | Active; local preview/config complete, Shopify retirement/publication pending |
| 2026-09-01 | Jason approved the production catalog correction. All 28 Full Assembly products were verified Draft and preserved historically. iPhone 17e joins the standalone coil draft matrix as unavailable and media-blocked; iPhone 16e remains excluded. Michael's 17-series email removes A Grade from iPhone 17 Pro and Pro Max and confirms 17-series Back Glass must not imply an included charging coil | Active; public coil publication still requires approved selling prices, inventory, product identity details, and media clearance |
| 2026-09-12 | Michael approved the reviewed iPhone 17 series for publication ("我看了17系列了，17可以发布了"), approved adding iPhone 17e Back Glass ("可以加17e背玻璃"), and allowed temporary iPhone 16e imagery for the first 17e listing despite the known magnet difference ("先求有再求好"). This clears owner review only: price, inventory, media rights and all coil decisions are untouched | Active; publication limited to products that also have an approved price and pass the live collection gate. See `iphone-17-series-owner-approval-2026-09-12.json` |

## Open decision register

1. Define the conflict rule when Michael's product judgment and Jason's
   data-backed commercial decision disagree.
2. Define Premium and A Grade with measurable evidence.
3. Resolve the staged price sheet's semantics and effective date.
4. Define repair-shop account tiers, quantity rules, tax status, terms, and
   approval process.
5. Document inventory ownership and the two-location workflow.
6. Verify shipping, warranty, defect, and RMA policies.
7. Choose Buzz scope, members, hosting, URL, data boundary, and backup owner.
8. RESOLVED 2026-08-29 — GitHub remains code authority; private remote
   `blackglassclawd-oss/back-glass-business` created and adopted as the
   development source of truth.
9. Decide which one of the five installed Quick Order apps remains during the
   pilot.
10. Decide when the Cloudflare storefront is allowed to reach production.
    (Rebuild is now in a low-priority maintenance lane; production cutover is
    still explicitly ungated.)
11. PARTIALLY RESOLVED 2026-08-29 — primary metric is 30-day contribution
    profit from completed B2B orders, with the companion metric set above.
    Still open: the controlled-experiment standard, and the trigger for
    promoting repeat contribution profit per active account to primary.
