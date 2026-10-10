# Back Glass Pros: shortest route to profit

**Version:** 2026-10-10 · **Owner:** Jason · **Product/catalog authority:** Michael
**Replaces:** `10-knowledge/ROADMAP.md` (2026-08-29) where they conflict.

## 1. Where we actually are (checked 2026-10-10)

Live Shopify analytics (store `kfczyu-kc`, read-only):

| Metric | Value |
| --- | --- |
| Online orders, last 24 months | **6** (gross **$580**) |
| Orders since Mar 2025 | 2 (Jun 2025 $7, Aug 2026 $23) |
| Store sessions, last 6 months | 397, of which 369 "direct" (mostly us testing, inferred) |
| Google search sessions, last 6 months | 18 |
| Buyers by state | OK 2 ($344), TX 2 ($206), ID 1, CA 1 |
| Best sellers | **Full Assembly with coil: $361 of $580 (62%)** |

What this means:

1. **The website is not the business yet.** It has had about one real order a year.
   Shopify Basic alone costs more than it earns.
2. **Effort went to software, not selling.** The repo holds 847 files, ~40
   image/catalog scripts and a Cloudflare rebuild. None of it touched revenue.
3. **We may have shelved the only line that sold.** Full Assemblies were moved
   to Draft on 2026-07-29; they were 62% of all online sales.
4. **Buyers are regional.** 4 of 6 orders came from Texas and Oklahoma, which
   fits a Dallas base.
5. **The bottleneck is answers from Michael, not agent capacity.** M1-M3 have
   been open since 2026-08-29; the 28-question sheet for Michael is blank.

If Michael has been selling since 2015 (per the question sheet, unconfirmed),
the real revenue is offline. Step one is to find it and route it through a
system we can measure.

## 2. The thesis

A specialist with a $9 median part price will not out-SEO MobileSentrix,
PhoneLCDParts or Injured Gadgets in 90 days. It can win three places fast:

1. **Local speed.** A DFW repair shop with a customer waiting values same-day
   delivery or pickup over a $1 price gap. National players ship overnight.
2. **Where buyers already are.** eBay, Facebook repair-tech groups and Google
   free shopping listings have demand today. SEO is a 6-12 month asset.
3. **Configuration accuracy.** Right model, color, grade, coil/no-coil. This is
   the moat, but only worth paying for once shops are buying.

## 3. Target and math (assumptions until Michael's numbers land)

| Input | Assumption | Source |
| --- | --- | --- |
| Avg unit price | $15 | Price range $3-$35, median $9; assemblies higher |
| Gross margin | 35% | Placeholder; M1 replaces it |
| Units per active shop | 20/month | ~5 back glass jobs a week |

**90-day goal:** 30 active shops (or equivalent marketplace volume) ≈ 600
units ≈ **$9k revenue ≈ $3.1k contribution per month.** First checkpoint is
10 paying shops by day 45. Every number is re-based once M1 delivers real cost.

Primary metric stays: **30-day contribution profit from completed orders**
(net revenue − landed COGS − discounts − fees − shipping subsidy − RMA credits).

## 4. The sequence

### Week 0-1: Truth in one sitting

- One 60-minute call with Michael answers the six questions in `QUESTIONS.md`
  (revenue today, cost basis, stock, hours, cash, local delivery). Not 28.
- Make the GitHub repo private (it is public today; see Risks).
- Decide on Full Assemblies: if stock exists, re-publish the top sellers.
- Store trust minimum: shipping page, one-paragraph warranty, real contact.

### Week 1-4: Sell where buyers are

- **DFW outbound:** list ~150 repair shops within 40 miles, call or visit
  40/week, offer a sample pack and same-day delivery. Log every objection.
- **Marketplaces:** list the 20 best SKUs on eBay; post in 3-5 repair-tech
  groups. Measure sell-through and fees.
- **Free Google surfaces:** Google Business Profile (wholesale, Dallas) and
  Merchant Center free listings through the Shopify Google channel.
- **Existing customers:** buy-again message to all 13 Shopify customers and
  Michael's offline accounts.

### Week 5-12: Keep what pays

- Weekly scorecard: shops contacted, samples, first orders, repeat orders,
  contribution by channel.
- Kill any channel with zero contribution after 4 weeks. Double the one that wins.
- Only then: model hub pages for SEO, tier pricing, quick-order pilot, paid
  search on exact part queries.

## 5. Freeze list (no work until 10 paying shops)

Cloudflare storefront rebuild · Buzz · Herdr/Pi multi-agent runtime · image
overlay and gallery scripts · SEO/GEO measurement framework · extra quick-order
apps (keep one).

## 6. Risks

- **Public repo.** It holds the owner price-sheet photo (may be supplier cost),
  owner screenshots, Michael's question sheet and competitor scrapes, while
  `DECISIONS.md` says the repo is private.
- **Unverified claims.** "Since 2015", "ships from Dallas", "same day before
  5pm CT", "free UPS over $150" are unconfirmed; none go public until Michael
  confirms.
- **Supplier photos.** No supplier imagery goes live without rights and
  Michael's approval (unchanged).
- **Inventory.** Shopify shows zero tracked stock; selling what we cannot ship
  is worse than not selling.

## 7. Approval gates (unchanged)

Autonomous: research, drafts, lead lists, analysis, code in branches.
Needs Jason (and Michael for product facts): any message to a customer or
shop, price changes, publishing or unpublishing products, spending money,
marketplace accounts, production deploys.
