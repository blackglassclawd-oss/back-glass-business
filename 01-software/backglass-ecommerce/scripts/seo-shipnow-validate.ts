/**
 * Renders the ship-now theme transformation against a captured production theme
 * and asserts the resulting HTML, not just the source transformation.
 *
 * Read-only: consumes a local theme capture plus public product JSON. It never
 * authenticates for writes, never uploads a theme and never touches Shopify
 * state. Usage: npx tsx scripts/seo-shipnow-validate.ts <capture-root>
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Liquid } from "liquidjs";
import { load } from "cheerio";
import { planThemeChanges } from "./lib/seo-theme-plan";
import { storefrontPositioning } from "../app/data/store-content";
import { collectionDefinitions } from "../app/data/collection-content";
import { escapeHtml } from "../app/data/product-information";

const root = join(process.argv[2] ?? "", "before");
if (!existsSync(root)) throw new Error(`Theme capture not found: ${root}. Run scripts/seo-theme-evidence.mjs first.`);
const read = (key: string) => readFileSync(join(root, key), "utf8");

const failures: string[] = [];
const checks: string[] = [];
function check(name: string, condition: boolean, detail = "") {
  (condition ? checks : failures).push(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------- plan inputs
const assetKeys = ["templates/product.json", "templates/index.json", "sections/main-product.liquid",
  "sections/header.liquid", "sections/header-group.json", "sections/footer.liquid",
  "sections/email-signup-banner.liquid", "layout/theme.liquid"];
const assets = Object.fromEntries(assetKeys.map(k => [k, read(k)]));
const snippets: Record<string, string> = {};
for (const name of ["bgp-product-schema", "bgp-organization-schema", "bgp-breadcrumb-schema", "bgp-support-links"]) {
  snippets[`snippets/${name}.liquid`] = readFileSync(`shopify/snippets/${name}.liquid`, "utf8");
}
snippets["sections/bgp-introduction.liquid"] = `<section class="page-width"><h1>${escapeHtml(storefrontPositioning.heading)}</h1><p>${escapeHtml(storefrontPositioning.introduction)}</p><nav aria-label="Browse parts"><ul>${storefrontPositioning.importantCollections.map(h => `{% if collections['${h}'] != blank %}<li><a href="{{ collections['${h}'].url }}">${escapeHtml(collectionDefinitions[h].title)}</a></li>{% endif %}`).join("")}</ul></nav></section>\n{% schema %}{"name":"BGP product introduction","settings":[]}{% endschema %}\n`;

// The three tabs point at pages Shopify serves as 404, so nothing has content.
const pagesWithContent = new Set<string>();
const plan = planThemeChanges(assets, snippets, pagesWithContent);
check("theme transformation has no blockers", plan.blockers.length === 0, plan.blockers.join(", "));
const repeat = planThemeChanges({ ...assets, ...Object.fromEntries(plan.changes.map(c => [c.key, c.value])) }, snippets, pagesWithContent);
check("theme transformation is idempotent", repeat.changes.length === 0, repeat.changes.map(c => c.key).join(", "));
const after = (key: string) => plan.changes.find(c => c.key === key)?.value ?? assets[key];

// ------------------------------------------------------------ render harness
const engine = new Liquid({ strictFilters: true });
engine.registerFilter("json", v => JSON.stringify(v ?? null));
engine.registerFilter("image_url", (v: { src: string }) => (typeof v === "string" ? v : v?.src));
engine.registerFilter("font_face", () => "");
engine.registerFilter("font_modify", (v: unknown) => v);
engine.registerFilter("asset_url", (v: string) => `/assets/${v}`);
const shop = { url: "https://backglasspros.com", name: "Back Glass Pros", description: "", currency: "USD" };
const settings = { logo: null, favicon: null };

// ------------------------------------------------- 1. homepage head metadata
const layout = after("layout/theme.liquid");
const headStart = layout.indexOf("{% comment %}BGP verified SEO positioning{% endcomment %}");
const metaTagsEnd = layout.indexOf("%}", layout.indexOf("render 'meta-tags'")) + 2;
check("BGP metadata block is installed in the layout", headStart >= 0);
const headFragment = layout.slice(headStart, metaTagsEnd)
  .replace(/\{%\s*render 'meta-tags'[^%]*%\}/, m => m); // rendered below via real snippet
engine.registerFilter("__noop", (v: unknown) => v);
const metaTagsSource = read("snippets/meta-tags.liquid");
class MemoryFs {
  async exists(f: string) { return f === "meta-tags"; }
  existsSync(f: string) { return f === "meta-tags"; }
  async readFile() { return metaTagsSource; }
  readFileSync() { return metaTagsSource; }
  resolve(_root: string, file: string) { return file.replace(/\.liquid$/, ""); }
  dirname() { return ""; }
  sep = "/";
}
const headEngine = new Liquid({ strictFilters: false, fs: new MemoryFs() as never, globals: {
  // Shopify semantics: these are global objects, visible inside {% render %}.
  page_title: "Back Glass Pro", page_description: "", shop, settings, canonical_url: "https://backglasspros.com/",
  page_image: null, current_tags: null, current_page: 1,
} });
const headHtml = await headEngine.parseAndRender(headFragment, { request: { page_type: "index", origin: shop.url } });
const $head = load(`<head>${headHtml}</head>`, null, false);
const renderedTitle = $head("title").text().replace(/\s+/g, " ").trim();
check("homepage title is the new positioning line", renderedTitle.includes(storefrontPositioning.title), renderedTitle);
check("homepage title drops the 'Back Glass Pro' typo", !/Back Glass Pro\b(?!s)/.test(renderedTitle), renderedTitle);
check("homepage meta description is populated", $head("meta[name=description]").attr("content") === storefrontPositioning.description, $head("meta[name=description]").attr("content") ?? "(none)");
check("og:title receives the new homepage title", $head("meta[property='og:title']").attr("content") === storefrontPositioning.title, $head("meta[property='og:title']").attr("content") ?? "(none)");
check("og:description receives the new homepage description", $head("meta[property='og:description']").attr("content") === storefrontPositioning.description, $head("meta[property='og:description']").attr("content") ?? "(none)");
check("twitter:title receives the new homepage title", $head("meta[name='twitter:title']").attr("content") === storefrontPositioning.title);
check("homepage copy never advertises coils", !/coil/i.test(renderedTitle + JSON.stringify($head("meta").toArray().map(m => m.attribs))));

// --------------------------------------------------------- 2. homepage H1
const headerAfter = after("sections/header.liquid");
const indexLogoStillH1 = /\{%-?\s*if request\.page_type == 'index'\s*-?%\}\s*<h1 class="header__heading">/.test(headerAfter);
check("header logo is no longer the homepage H1", !indexLogoStillH1);
const introHtml = await engine.parseAndRender(snippets["sections/bgp-introduction.liquid"].split("{% schema %}")[0], { collections: Object.fromEntries(storefrontPositioning.importantCollections.map(h => [h, { url: `/collections/${h}` }])) });
const $intro = load(introHtml, null, false);
check("introduction section supplies exactly one H1", $intro("h1").length === 1, $intro("h1").text());
check("introduction H1 is editorial, not the logo", $intro("h1").text() === storefrontPositioning.heading);
check("introduction links only to reachable collections", $intro("a").toArray().every(a => storefrontPositioning.importantCollections.some(h => a.attribs.href?.endsWith(h))), $intro("a").toArray().map(a => a.attribs.href).join(", "));

// ------------------------------------------- 3. product structured data
const liveProduct = await (await fetch("https://backglasspros.com/products/iphone-16-pro-max-half-assembly-no-coil-premium.js", { signal: AbortSignal.timeout(20000) })).json() as {
  id: number; title: string; description: string; type: string; options: Array<{ name: string }>;
  variants: Array<{ id: number; title: string; sku: string; price: number; available: boolean; options: string[]; featured_image: { src: string } | null }>;
  featured_image: string;
};
const productContext = { shop, cart: { currency: { iso_code: "USD" } }, product: {
  id: liveProduct.id, url: "/products/iphone-16-pro-max-half-assembly-no-coil-premium", title: liveProduct.title,
  description: liveProduct.description, type: liveProduct.type, options: liveProduct.options.map(o => o.name),
  featured_image: { src: liveProduct.featured_image },
  variants: liveProduct.variants.map(v => ({ ...v, featured_image: v.featured_image ?? null })),
} };
const productRaw = await engine.parseAndRender(snippets["snippets/bgp-product-schema.liquid"], productContext);
let productSchema: Record<string, unknown> = {};
try { productSchema = JSON.parse(load(`<script>${productRaw}</script>`, null, false)("script").text()); check("ProductGroup JSON-LD parses", true); }
catch (error) { check("ProductGroup JSON-LD parses", false, String(error)); }
const variants = (productSchema.hasVariant ?? []) as Array<Record<string, unknown>>;
check("ProductGroup declares variesBy color", JSON.stringify(productSchema.variesBy) === JSON.stringify(["https://schema.org/color"]));
check("ProductGroup keeps productGroupID", productSchema.productGroupID === String(liveProduct.id));
check("ProductGroup keeps the merchant category", productSchema.category === liveProduct.type, String(productSchema.category));
check("no Apple brand or manufacturer claim remains", !/"(brand|manufacturer)"/.test(JSON.stringify(productSchema)) && !/Apple/i.test(JSON.stringify(productSchema.category ?? "")));
check("every variant exposes its real color", variants.length === liveProduct.variants.length && variants.every((v, i) => v.color === liveProduct.variants[i].options[0]), variants.map(v => v.color).join(", "));
check("every variant keeps sku, image, offers and group link", variants.every(v => v.sku && v.image && v.offers && (v.isVariantOf as { "@id": string })["@id"] === productSchema["@id"]));
check("offer prices match live cents", variants.every((v, i) => (v.offers as { price: number }).price === liveProduct.variants[i].price / 100), variants.map(v => (v.offers as { price: number }).price).join(", "));
check("availability uses schema.org URLs", variants.every(v => /^https:\/\/schema\.org\/(In|Out Of)?Stock$/.test(String((v.offers as { availability: string }).availability).replace(" ", ""))));

// ------------------------------------------------ 4. Organization schema
const orgRaw = await engine.parseAndRender(snippets["snippets/bgp-organization-schema.liquid"], { shop, settings });
const orgSchema = JSON.parse(load(orgRaw, null, false)("script").text());
check("Organization JSON-LD parses and has no empty sameAs", !("sameAs" in orgSchema));
check("Organization keeps name and url", orgSchema.name === shop.name && orgSchema.url === shop.url);
const orgWithLogo = JSON.parse(load(await engine.parseAndRender(snippets["snippets/bgp-organization-schema.liquid"], { shop, settings: { logo: { src: "//cdn/logo.png" } } }), null, false)("script").text());
check("Organization emits a logo when the theme has one", orgWithLogo.logo === "https://cdn/logo.png", String(orgWithLogo.logo));

// ------------------------------------------------- 5. empty collapsible tabs
const templateAfter = JSON.parse(after("templates/product.json").replace(/^\s*\/\*[\s\S]*?\*\//, ""));
const mainSection = Object.values(templateAfter.sections).find((s: unknown) => (s as { type: string }).type === "main-product") as { blocks: Record<string, { type: string; settings: Record<string, unknown> }>; block_order: string[] };
const remainingTabs = Object.values(mainSection.blocks).filter(b => b.type === "collapsible_tab");
check("all empty collapsible tabs are removed", remainingTabs.length === 0, remainingTabs.map(t => String(t.settings.heading)).join(", "));
const templateBefore = JSON.parse(assets["templates/product.json"].replace(/^\s*\/\*[\s\S]*?\*\//, ""));
const beforeMain = Object.values(templateBefore.sections).find((s: unknown) => (s as { type: string }).type === "main-product") as { blocks: Record<string, { type: string }> };
const nonTabBefore = Object.entries(beforeMain.blocks).filter(([, b]) => b.type !== "collapsible_tab").map(([id]) => id);
check("every non-tab block and app block is preserved", nonTabBefore.every(id => id in mainSection.blocks), nonTabBefore.join(", "));
check("block_order stays consistent with blocks", mainSection.block_order.every(id => id in mainSection.blocks) && Object.keys(mainSection.blocks).every(id => mainSection.block_order.includes(id)));

// ------------------------------------------------ 6. unsupported history claim
const groupAfter = JSON.parse(after("sections/header-group.json"));
const announcements = Object.values((groupAfter.sections["announcement-bar"] as { blocks: Record<string, { settings: { text: string } }> }).blocks).map(b => b.settings.text);
check("'Since 2015' claim is gone", !announcements.some(t => /since\s+\d{4}/i.test(t)), announcements.join(" | "));
check("the unrelated announcement is preserved", announcements.includes("Shop & Refer to Maximize your SAVINGS!"), announcements.join(" | "));
check("header group settings are otherwise untouched", JSON.stringify(groupAfter.sections.header) === JSON.stringify(JSON.parse(assets["sections/header-group.json"]).sections.header));

// ------------------------------------------------------------------- report
console.log(checks.join("\n"));
if (failures.length) { console.error("\n" + failures.join("\n")); console.error(`\n${failures.length} check(s) failed.`); process.exit(1); }
console.log(`\nAll ${checks.length} rendered-output checks passed. writesToShopify=0`);
