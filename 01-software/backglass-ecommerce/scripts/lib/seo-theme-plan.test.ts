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
