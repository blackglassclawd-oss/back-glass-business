import { load } from "cheerio";
import { getProductInformation, type CatalogInput } from "./product-information";

export interface Finding { severity: "error" | "warning"; code: string; path: string; detail: string }
export function auditProduct(product: CatalogInput & { body_html?: string }, supplemental?: unknown): Finding[] {
  const facts = getProductInformation(product, supplemental);
  if (facts.partType === "retired-full-assembly") return [];
  const path = `/products/${product.handle}`;
  const findings: Finding[] = facts.issues.map(code => ({ severity: "error", code, path, detail: "Canonical catalog fact requires correction or review." }));
  const content = load(product.body_html ?? "").text().trim();
  if (content.length < 160) findings.push({ severity: "warning", code: "thin-description", path, detail: "Less than 160 characters of product information; add verified facts, not filler." });
  if (facts.coilIncluded === false && !facts.compatibleCoilHandles.length) findings.push({ severity: "warning", code: "coil-compatibility-gap", path, detail: "No reviewed separately sold coil relationship. Do not infer compatibility from model names." });
  if (!facts.includedComponents) findings.push({ severity: "warning", code: "components-unverified", path, detail: facts.packageContents ? "Product-label contents are owner reviewed; detailed half-assembly BOM is not established. Do not infer or request generic reconfirmation." : "Product-specific contents require review." });
  return findings;
}

export function auditHtml(html: string, path: string): { findings: Finding[]; links: string[]; title: string } {
  const $ = load(html);
  const findings: Finding[] = [];
  const add = (code: string, detail: string, severity: Finding["severity"] = "error") => findings.push({ code, detail, path, severity });
  const title = $("title").text().trim();
  if (!title) add("missing-title", "Page title is missing.");
  if ($("h1").length !== 1 || !$("h1").text().trim()) add("invalid-h1", "Expected one meaningful H1.");
  if (!$("meta[name='description']").attr("content")?.trim()) add("missing-description", "Meta description is missing or empty.");
  const canonicals = $("link[rel='canonical']");
  if (canonicals.length !== 1) add("canonical-count", "Expected exactly one canonical URL.");
  else {
    try { const url = new URL(canonicals.attr("href")!); if (url.origin !== "https://backglasspros.com" || url.search || url.hash) add("invalid-canonical", "Canonical must use the public origin without query or fragment."); }
    catch { add("invalid-canonical", "Canonical must be absolute."); }
  }
  const seen = new Set<string>();
  function inspect(value: unknown, key = "") {
    if (value === null || value === "" || (Array.isArray(value) && !value.length)) add("empty-schema-value", `Empty schema value: ${key}`);
    if (Array.isArray(value)) { value.forEach(v => inspect(v, key)); return; }
    if (value && typeof value === "object") {
      const o = value as Record<string, unknown>;
      if (["Organization", "Product", "ProductGroup", "BreadcrumbList"].includes(String(o["@type"]))) {
        const identity = `${o["@type"]}:${o["@id"] ?? o.url ?? o.name ?? ""}`;
        if (seen.has(identity)) add("duplicate-schema", `Repeated entity: ${identity}`);
        seen.add(identity);
      }
      for (const [k, v] of Object.entries(o)) {
        if (["brand", "manufacturer"].includes(k) && /apple|oem/i.test(JSON.stringify(v))) add("suspicious-brand", "Device brand or draft grade must not imply replacement-part manufacture.");
        inspect(v, k);
      }
    }
  }
  $("script[type='application/ld+json']").each((_, el) => {
    try { inspect(JSON.parse($(el).text())); } catch { add("invalid-json-ld", "Structured data could not be parsed."); }
  });
  $("details").each((_, el) => {
    const copy = $(el).clone(); copy.find("summary").remove();
    if (!copy.text().trim() && !copy.find("img,video,iframe").length) add("empty-template-section", "Empty collapsible content section.", "warning");
  });
  for (const label of ["Product features", "Materials and care", "Merchandising tips"]) {
    $("h2,h3").filter((_, el) => $(el).text().trim() === label).each((_, el) => {
      const next = $(el).next(); if (!next.length || !next.text().trim() || next.is("h1,h2,h3")) add("empty-template-section", `Potentially empty ${label} section; verify rendered output.`, "warning");
    });
  }
  return { findings, title, links: [...new Set($("a[href]").map((_, el) => $(el).attr("href")!).get())].filter(href => href.startsWith("/") && !href.startsWith("//")) };
}
