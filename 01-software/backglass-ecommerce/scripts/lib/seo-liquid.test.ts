import { readFileSync } from "node:fs";
import { Liquid } from "liquidjs";
import { load } from "cheerio";
import { expect, it } from "vitest";

// Offline syntax/control-flow tests, NOT Shopify runtime certification.
// json/image_url are explicit test adapters; commerce fixtures are synthetic,
// never exported to the catalog or Shopify plan.
const engine = new Liquid({ strictFilters: true });
engine.registerFilter("json", value => JSON.stringify(value ?? null));
engine.registerFilter("image_url", value => value.src);
const source = (name: string) => readFileSync(`shopify/snippets/bgp-${name}.liquid`, "utf8");
const shop = { url: "https://backglasspros.com", name: 'Test </script><script>alert(1)</script>' };
const product = { id: 123, url: "/products/test", title: 'Test "part" </script>', type: "Back Glass", description: "<p>Fixture only</p>", featured_image: { src: "//cdn.shopify.com/test.jpg" }, options: ["Color"], variants: [
  { id: 1, title: "Black", options: ["Black"], sku: 'SKU"</script>', price: 1234, available: true },
  { id: 2, title: "White", options: ["White"], sku: "", price: 1500, available: false, featured_image: { src: "https://cdn.shopify.com/white.jpg" } },
  { id: 3, title: "Unset price", options: ["(Product)RED"], sku: null, price: 0, available: true },
] };
it("renders safe variant JSON with live-value plumbing, missing SKU and zero-price branches", async () => {
  const raw = await engine.parseAndRender(source("product-schema"), { shop, product, cart: { currency: { iso_code: "USD" } } });
  const $ = load(`<script type="application/ld+json">${raw}</script>`);
  expect($("script")).toHaveLength(1);
  const schema = JSON.parse($("script").text());
  expect(schema.url).toBe("https://backglasspros.com/products/test");
  expect(schema.hasVariant).toHaveLength(3);
  expect(schema.hasVariant[0].offers).toMatchObject({ price: 12.34, priceCurrency: "USD", availability: "https://schema.org/InStock", url: `${schema.url}?variant=1` });
  expect(schema.hasVariant[0].image).toBe("https://cdn.shopify.com/test.jpg");
  expect(schema.hasVariant[1].image).toBe("https://cdn.shopify.com/white.jpg");
  expect(schema.hasVariant[1].offers.availability).toBe("https://schema.org/OutOfStock");
  expect(schema.hasVariant[1]).not.toHaveProperty("sku");
  expect(schema.hasVariant[2]).not.toHaveProperty("offers");
  for (const v of schema.hasVariant) { expect(v.isVariantOf["@id"]).toBe(schema["@id"]); expect(v).not.toHaveProperty("brand"); expect(v).not.toHaveProperty("manufacturer"); }
});
it("declares the color variant dimension the way Google's product-variant docs require", async () => {
  const raw = await engine.parseAndRender(source("product-schema"), { shop, product, cart: { currency: { iso_code: "USD" } } });
  const schema = JSON.parse(load(`<script>${raw}</script>`)("script").text());
  // variesBy must reference the full schema.org property URL.
  expect(schema.variesBy).toEqual(["https://schema.org/color"]);
  expect(schema.productGroupID).toBe("123");
  expect(schema.category).toBe("Back Glass");
  // Each variant carries its own real option value, verbatim from Shopify.
  expect(schema.hasVariant.map((v: { color: string }) => v.color)).toEqual(["Black", "White", "(Product)RED"]);
});
it("omits variesBy and color when the product has no color option", async () => {
  const noColor = { ...product, options: ["Length"], variants: [{ id: 9, title: "1m", options: ["1m"], sku: "S", price: 500, available: true }] };
  const raw = await engine.parseAndRender(source("product-schema"), { shop, product: noColor, cart: { currency: { iso_code: "USD" } } });
  const schema = JSON.parse(load(`<script>${raw}</script>`)("script").text());
  expect(schema).not.toHaveProperty("variesBy");
  expect(schema.hasVariant[0]).not.toHaveProperty("color");
});
it("renders one safe Organization and no empty sameAs", async () => {
  const $ = load(await engine.parseAndRender(source("organization-schema"), { shop }));
  expect($("script")).toHaveLength(1);
  const schema = JSON.parse($("script").text());
  expect(schema.name).toBe(shop.name);
  expect(schema).not.toHaveProperty("sameAs");
  expect(schema).not.toHaveProperty("logo");
});
it("keeps the theme's conditional Organization logo when one is configured", async () => {
  const $ = load(await engine.parseAndRender(source("organization-schema"), { shop, settings: { logo: { src: "//cdn.shopify.com/logo.png" } } }));
  const schema = JSON.parse($("script").text());
  expect(schema.logo).toBe("https://cdn.shopify.com/logo.png");
  expect(schema).not.toHaveProperty("sameAs");
});
it.each(["product", "collection", "page"])("renders valid %s breadcrumb JSON", async pageType => {
  const $ = load(await engine.parseAndRender(source("breadcrumb-schema"), { shop, product, request: { page_type: pageType }, canonical_url: `https://backglasspros.com/${pageType}/test?variant=1` }));
  expect($("script")).toHaveLength(1);
  const schema = JSON.parse($("script").text());
  expect(schema.itemListElement[1].item).toBe(`https://backglasspros.com/${pageType}/test`);
});
it("keeps support footer limited to available public page references", async () => {
  const $ = load(await engine.parseAndRender(source("support-links"), { routes: { root_url: "/" }, pages: {} }));
  expect($("a").map((_, a) => $(a).attr("href")).get()).toEqual(["/pages/contact"]);
});
