import { expect, it } from "vitest";
import { planThemeChanges, replaceIndexLogoHeadings } from "./seo-theme-plan";
const logo = `{%- if request.page_type == 'index' -%}<h1 class="header__heading">{%- endif -%}<a class="header__heading-link link">Logo</a>{%- if request.page_type == 'index' -%}</h1>{%- endif -%}`;
it("changes only paired index-only logo wrappers, preserving unrelated H1s", () => {
  const header = logo + '<h1 class="other">Other heading</h1>' + logo;
  const result = replaceIndexLogoHeadings(header);
  expect(result.safe).toBe(true);
  expect(result.value).toContain('<h1 class="other">Other heading</h1>');
  expect(result.value.match(/<div class="header__heading">/g)).toHaveLength(2);
  expect(replaceIndexLogoHeadings(result.value)).toEqual(result);
  expect(replaceIndexLogoHeadings('<h1 class="header__heading">Unrecognized</h1>').safe).toBe(false);
});
it("suppresses only empty theme blocks and is idempotent", () => {
  const assets = { "templates/product.json": JSON.stringify({ sections: { main: { type: "main-product", blocks: { empty: { type: "collapsible_tab", settings: { content: "", page: "" } }, useful: { type: "collapsible_tab", settings: { content: "Verified text" } }, app: { type: "shopify://apps/test", settings: {} } }, block_order: ["empty", "useful", "app"] } } }), "sections/main-product.liquid": '<h1>{{ product.title }}</h1><script type="application/ld+json">{{ product | structured_data }}</script>', "sections/header.liquid": logo + '<script type="application/ld+json">{"@type":"Organization","sameAs":[""]}</script>', "layout/theme.liquid": "<head></head>", "templates/index.json": '{"sections":{},"order":[]}' };
  const signup = `{% schema %}{"name":"Email","templates":["password"]}{% endschema %}`;
  Object.assign(assets, { "sections/email-signup-banner.liquid": signup });
  const plan = planThemeChanges(assets, {});
  const migrated = plan.changes.find(c => c.key === "sections/email-signup-banner.liquid")!.value;
  expect(JSON.parse(migrated.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)![1])).toEqual({ name: "Email", enabled_on: { templates: ["password"] } });
  expect(plan.blockers).toEqual([]);
  const updated = JSON.parse(plan.changes.find(c => c.key === "templates/product.json")!.value);
  expect(updated.sections.main.block_order).toEqual(["useful", "app"]);
  const product = plan.changes.find(c => c.key === "sections/main-product.liquid")!.value;
  expect(product).not.toContain("product | structured_data");
  expect(product).toContain('<h1>{{ product.title }}</h1>');
  const again = planThemeChanges({ ...assets, ...Object.fromEntries(plan.changes.map(c => [c.key, c.value])) }, {});
  expect(again.changes).toEqual([]);
});

import { Liquid } from "liquidjs";
import { normalizeHeaderTag } from "./seo-theme-plan";
it.each(["none", "always", "reduce-logo-size", "on-scroll-up"])("preserves header tag rendering for %s", async sticky_header_type => {
  const source = `<{% if section.settings.sticky_header_type != 'none' %}sticky-header data-sticky-type="{{ section.settings.sticky_header_type }}"{% else %}div{% endif %} class="header-wrapper">Content</{% if section.settings.sticky_header_type != 'none' %}sticky-header{% else %}div{% endif %}>`;
  const engine = new Liquid();
  const context = { section: { settings: { sticky_header_type } } };
  expect(await engine.parseAndRender(normalizeHeaderTag(source), context)).toBe(await engine.parseAndRender(source, context));
  expect(normalizeHeaderTag(normalizeHeaderTag(source))).toBe(normalizeHeaderTag(source));
});

import { collapsibleTabIsEmpty } from "./seo-theme-plan";
import { storefrontPositioning } from "../../app/data/store-content";

// The live theme points three tabs at page handles Shopify does not serve, so
// they render as empty accordions. Blank-page detection alone missed all three.
it("treats a tab pointing at a missing or empty page as empty, and keeps real ones", () => {
  const pages = new Set(["care-guide"]);
  expect(collapsibleTabIsEmpty({ content: "", page: "product-features" }, pages)).toBe(true);
  expect(collapsibleTabIsEmpty({ content: "", page: "" }, pages)).toBe(true);
  expect(collapsibleTabIsEmpty({ content: "", page: "care-guide" }, pages)).toBe(false);
  expect(collapsibleTabIsEmpty({ content: "Verified text", page: "product-features" }, pages)).toBe(false);
});

const liveShapedAssets = () => ({
  "templates/product.json": JSON.stringify({ sections: { main: { type: "main-product", blocks: {
    kept: { type: "collapsible_tab", settings: { heading: "Care", content: "", page: "care-guide" } },
    missing: { type: "collapsible_tab", settings: { heading: "Merchandising tips", content: "", page: "merchandising-tips" } },
    app: { type: "shopify://apps/test", settings: {} },
  }, block_order: ["kept", "missing", "app"] } } }),
  "sections/main-product.liquid": '<script type="application/ld+json">{{ product | structured_data }}</script>',
  "sections/header.liquid": logo + '<script type="application/ld+json">{"@type":"Organization","sameAs":[""]}</script>',
  "layout/theme.liquid": "<head><title>{{ page_title }}</title>{% render 'meta-tags' %}</head>",
  "templates/index.json": '{"sections":{},"order":[]}',
  "sections/header-group.json": JSON.stringify({ sections: { "announcement-bar": { blocks: {
    "announcement-bar-0": { type: "announcement", settings: { text: "Serving Mobile Repair Industry Since 2015", link: "" } },
    other: { type: "announcement", settings: { text: "Shop & Refer to Maximize your SAVINGS!", link: "" } },
  } } } }),
});

it("passes homepage metadata into the isolated meta-tags render", () => {
  const plan = planThemeChanges(liveShapedAssets(), {}, new Set(["care-guide"]));
  const layout = plan.changes.find(c => c.key === "layout/theme.liquid")!.value;
  expect(layout).toContain("{% render 'meta-tags', page_title: page_title, page_description: page_description %}");
  expect(layout).not.toMatch(/\{%-?\s*render\s+'meta-tags'\s*-?%\}/);
  expect(plan.blockers).toEqual([]);
});

it("removes only the empty tab and replaces only the unsupported history claim", () => {
  const plan = planThemeChanges(liveShapedAssets(), {}, new Set(["care-guide"]));
  const template = JSON.parse(plan.changes.find(c => c.key === "templates/product.json")!.value);
  expect(template.sections.main.block_order).toEqual(["kept", "app"]);
  const group = JSON.parse(plan.changes.find(c => c.key === "sections/header-group.json")!.value);
  const blocks = group.sections["announcement-bar"].blocks;
  expect(blocks["announcement-bar-0"].settings.text).toBe(storefrontPositioning.announcement);
  expect(blocks["announcement-bar-0"].settings.text).not.toMatch(/2015/);
  expect(blocks.other.settings.text).toBe("Shop & Refer to Maximize your SAVINGS!");
});

it("stays idempotent across every new transformation", () => {
  const assets = liveShapedAssets();
  const pages = new Set(["care-guide"]);
  const plan = planThemeChanges(assets, {}, pages);
  const again = planThemeChanges({ ...assets, ...Object.fromEntries(plan.changes.map(c => [c.key, c.value])) }, {}, pages);
  expect(again.changes).toEqual([]);
  expect(again.blockers).toEqual([]);
});

it("never advertises a category with no purchasable products", () => {
  const copy = [storefrontPositioning.title, storefrontPositioning.heading, storefrontPositioning.announcement].join(" ");
  expect(copy).not.toMatch(/coil/i);
  expect(storefrontPositioning.importantCollections).not.toContain("wireless-charging-coils");
});
