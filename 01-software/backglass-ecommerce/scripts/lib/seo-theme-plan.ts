import { createHash } from "node:crypto";
import { storefrontPositioning } from "../../app/data/store-content";

export interface ThemeChange { key: string; beforeSha256: string | null; value: string; reason: string }
/** No founding-date evidence exists in the repository or any owner statement. */
export const unsupportedHistoryClaim = /\bsince\s+(19|20)\d{2}\b/i;
export function normalizeHeaderTag(header: string) {
  const opening = `<{% if section.settings.sticky_header_type != 'none' %}sticky-header data-sticky-type="{{ section.settings.sticky_header_type }}"{% else %}div{% endif %}`;
  const closing = `</{% if section.settings.sticky_header_type != 'none' %}sticky-header{% else %}div{% endif %}>`;
  if (!header.includes(opening) || !header.includes(closing)) return header;
  return header.replace(opening, `{% assign bgp_header_tag = 'div' %}{% if section.settings.sticky_header_type != 'none' %}{% assign bgp_header_tag = 'sticky-header' %}{% endif %}<{{ bgp_header_tag }}{% if section.settings.sticky_header_type != 'none' %} data-sticky-type="{{ section.settings.sticky_header_type }}"{% endif %}`)
    .replace(closing, `</{{ bgp_header_tag }}>`);
}
export function replaceIndexLogoHeadings(header: string) {
  const marker = "{% comment %}BGP index-only logo wrapper{% endcomment %}";
  const indexIf = String.raw`\{%-?\s*if request\.page_type == 'index'\s*-?%\}`;
  const endif = String.raw`\{%-?\s*endif\s*-?%\}`;
  const pattern = new RegExp(`(${indexIf}\\s*)<h1 class="header__heading">(\\s*${endif})((?:(?!<\\/?h1\\b)[\\s\\S])*?)(${indexIf}\\s*)<\\/h1>(\\s*${endif})`, "g");
  const matches = [...header.matchAll(pattern)];
  const openings = (header.match(/<h1 class="header__heading">/g) ?? []).length;
  if (!openings && header.includes(marker)) return { value: header, safe: true };
  if (!matches.length || matches.length !== openings || matches.some(m => !m[3].includes('class="header__heading-link'))) return { value: header, safe: false };
  return { value: header.replace(pattern, (_, a, b, inner, c, d) => `${marker}${a}<div class="header__heading">${b}${inner}${c}</div>${d}`), safe: true };
}
/**
 * A collapsible tab renders empty when it has no inline content AND its `page`
 * setting resolves to nothing. Checking `page` for blankness alone is not
 * enough: the live theme points three tabs at page handles that do not exist,
 * so they render as empty accordions on every product page. `pagesWithContent`
 * carries the handles Shopify actually serves with a non-empty body.
 */
export function collapsibleTabIsEmpty(settings: Record<string, unknown>, pagesWithContent: ReadonlySet<string>) {
  if (String(settings.content ?? "").trim()) return false;
  const page = String(settings.page ?? "").trim();
  return !page || !pagesWithContent.has(page);
}
export function planThemeChanges(assets: Record<string, string>, snippets: Record<string, string>, pagesWithContent: ReadonlySet<string> = new Set()) {
  const changes: ThemeChange[] = []; const blockers: string[] = [];
  const add = (key: string, value: string, reason: string) => {
    if (assets[key] === value) return;
    changes.push({ key, value, reason, beforeSha256: assets[key] === undefined ? null : createHash("sha256").update(assets[key]).digest("hex") });
  };
  const productKey = "templates/product.json";
  try {
    const template = JSON.parse(assets[productKey].replace(/^\s*\/\*[\s\S]*?\*\//, ""));
    const removed: string[] = [];
    for (const section of Object.values(template.sections) as Array<{ type: string; blocks?: Record<string, { type: string; settings: Record<string, unknown> }>; block_order?: string[] }>) {
      if (section.type !== "main-product") continue;
      for (const [id, block] of Object.entries(section.blocks ?? {})) {
        if (block.type === "collapsible_tab" && collapsibleTabIsEmpty(block.settings, pagesWithContent)) {
          removed.push(String(block.settings.heading ?? id));
          delete section.blocks![id]; section.block_order = section.block_order?.filter(key => key !== id);
        }
      }
    }
    add(productKey, JSON.stringify(template, null, 2) + "\n", `Suppress collapsible tabs that render empty (${removed.join(", ") || "none"}); preserve nonempty content and app blocks.`);
  } catch { blockers.push("product-template-not-parseable"); }
  const main = assets["sections/main-product.liquid"] ?? "";
  const schemaPattern = /\{\{[-]?\s*product\s*\|\s*structured_data\s*[-]?\}\}/g;
  if (main.includes("render 'bgp-product-schema'")) { /* already installed */ }
  else if ([...main.matchAll(schemaPattern)].length === 1) add("sections/main-product.liquid", main.replace(schemaPattern, "{% render 'bgp-product-schema' %}"), "Replace native schema once to omit unverified manufacturer/brand; retain live variant offers.");
  else blockers.push("product-schema-replacement-count-not-one");
  const header = assets["sections/header.liquid"] ?? "";
  const organization = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/g;
  const organizationScripts = [...header.matchAll(organization)].filter(m => /"@type"\s*:\s*"Organization"/.test(m[0]));
  let newHeader = normalizeHeaderTag(header);
  if (header.includes("render 'bgp-organization-schema'")) { /* already installed */ }
  else if (organizationScripts.length === 1) newHeader = newHeader.replace(organizationScripts[0][0], "{% render 'bgp-organization-schema' %}");
  else blockers.push("organization-schema-replacement-count-not-one");
  const logoReplacement = replaceIndexLogoHeadings(newHeader);
  newHeader = logoReplacement.value;
  if (!logoReplacement.safe) blockers.push("homepage-logo-h1-needs-review");
  add("sections/header.liquid", newHeader, "Use stable Organization identity without empty sameAs; let introductory copy own the homepage H1.");
  const layoutKey = "layout/theme.liquid"; const layout = assets[layoutKey] ?? "";
  const marker = "{% comment %}BGP verified SEO positioning{% endcomment %}";
  if (!layout.includes(marker) && layout.includes("<head>")) {
    const assignments = `${marker}\n{% if request.page_type == 'index' %}{% assign page_title = ${JSON.stringify(storefrontPositioning.title)} %}{% assign page_description = ${JSON.stringify(storefrontPositioning.description)} %}{% endif %}\n`;
    let value = layout.replace("<head>", assignments + "<head>");
    // {% render %} is an isolated scope: the assigns above shadow the globals
    // only inside this layout, so a bare {% render 'meta-tags' %} would emit
    // the old title and shop-name description into og:/twitter:. Pass them in.
    const bareMetaTags = /\{%-?\s*render\s+'meta-tags'\s*-?%\}/g;
    const bareCount = [...value.matchAll(bareMetaTags)].length;
    const totalReferences = (value.match(/'meta-tags'/g) ?? []).length;
    const alreadyParameterised = /render\s+'meta-tags',\s*page_title:/.test(value);
    if (bareCount === 1 && totalReferences === 1) value = value.replace(bareMetaTags, "{% render 'meta-tags', page_title: page_title, page_description: page_description %}");
    // Zero references means this layout has no social-metadata snippet to fix.
    else if (totalReferences && !alreadyParameterised) blockers.push("meta-tags-render-not-one");
    add(layoutKey, value, "Set homepage title/description and pass them into the isolated meta-tags render so social metadata matches.");
  } else if (!layout.includes(marker)) blockers.push("layout-head-not-found");
  try {
    if (!logoReplacement.safe) throw new Error("Homepage H1 transformation is not safe");
    const index = JSON.parse(assets["templates/index.json"].replace(/^\s*\/\*[\s\S]*?\*\//, ""));
    index.sections.bgp_information = { type: "bgp-introduction", settings: {} };
    index.order = ["bgp_information", ...index.order.filter((id: string) => id !== "bgp_information")];
    add("templates/index.json", JSON.stringify(index, null, 2) + "\n", "Expose concise homepage positioning and available collection links without changing existing sections.");
  } catch { blockers.push("homepage-template-not-parseable"); }
  for (const [key, value] of Object.entries(snippets)) add(key, value, "New reviewed SEO component; installation remains gated.");
  const headerGroupKey = "sections/header-group.json";
  if (assets[headerGroupKey] !== undefined) {
    try {
      const group = JSON.parse(assets[headerGroupKey].replace(/^\s*\/\*[\s\S]*?\*\//, ""));
      let replaced = 0;
      for (const section of Object.values(group.sections ?? {}) as Array<{ blocks?: Record<string, { settings?: Record<string, unknown> }> }>) {
        for (const block of Object.values(section.blocks ?? {})) {
          // Replace only the unsupported company-history claim. Every other
          // announcement, link and setting is merchant content and is preserved.
          if (typeof block.settings?.text === "string" && unsupportedHistoryClaim.test(block.settings.text)) {
            block.settings.text = storefrontPositioning.announcement; replaced += 1;
          }
        }
      }
      if (replaced === 1) add(headerGroupKey, JSON.stringify(group, null, 2) + "\n", "Replace the unsupported 'Since 2015' company-history claim; preserve the other announcement and all settings.");
      else if (replaced > 1) blockers.push("multiple-unsupported-history-claims");
    } catch { blockers.push("header-group-not-parseable"); }
  }
  const signupKey = "sections/email-signup-banner.liquid";
  if (assets[signupKey]) {
    try {
      const source = assets[signupKey];
      const schema = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
      if (!schema) throw new Error("Missing section schema");
      const data = JSON.parse(schema[1]);
      if (data.templates) {
        if (data.enabled_on || data.disabled_on) throw new Error("Ambiguous template restrictions");
        data.enabled_on = { templates: data.templates }; delete data.templates;
        add(signupKey, source.replace(schema[0], () => `{% schema %}\n${JSON.stringify(data, null, 2)}\n{% endschema %}`), "Migrate deprecated templates restriction to enabled_on without changing allowed templates.");
      }
    } catch { blockers.push("email-signup-schema-needs-review"); }
  }
  const footerKey = "sections/footer.liquid"; const footer = assets[footerKey] ?? "";
  if (footer && !footer.includes("render 'bgp-support-links'")) {
    add(footerKey, "{% render 'bgp-support-links' %}\n" + footer, "Expose verified contact route; do not promote unapproved policies.");
  }
  if (!main.includes("BreadcrumbList") && !main.includes("render 'bgp-breadcrumb-schema'")) {
    const changed = changes.find(c => c.key === "sections/main-product.liquid");
    const value = (changed?.value ?? main) + "\n{% render 'bgp-breadcrumb-schema' %}\n";
    if (changed) changed.value = value; else if (main) add("sections/main-product.liquid", value, "Add product breadcrumbs once.");
  }
  return { changes: blockers.length ? [] : changes, blockers };
}
