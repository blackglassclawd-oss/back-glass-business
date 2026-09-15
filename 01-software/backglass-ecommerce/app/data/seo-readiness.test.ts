import { describe, expect, it } from "vitest";
import { catalog } from "./catalog.server";
import { getProductInformation, parseReviewedDetails, compatibleCoils, productInformationHtml, productDescription } from "./product-information";
import { buyerGuidance, guidanceHtml } from "./buyer-guidance";
import { belongsToCollection } from "./collection-content";
import { buildRedirectDecisions } from "./redirect-decisions";
import { auditHtml } from "./seo-quality";
import { productSchema, serializeJsonLd } from "./seo";

const half = catalog.products.find(p => /Half Assembly.*Premium/.test(p.title))!;
const glass = catalog.products.find(p => /Large Hole Back Glass.*A Grade/.test(p.title))!;
const review = { version: 1, owner: "Michael", source: "Public-safe approved product specification", reviewedAt: "2026-09-01", reviewAfter: "2026-12-01" };
describe("canonical product evidence boundaries", () => {
  it("uses Michael's construction and literal contents rules without inferred BOM or performance", () => {
    const premium = getProductInformation(half);
    const aGrade = getProductInformation(glass);
    expect(premium.construction).toBe("Premium uses one-piece formed glass construction.");
    expect(aGrade.construction).toContain("two layers of glass stacked in the raised three-dimensional portion");
    expect(aGrade.includedComponents).toEqual(["Glass only"]);
    expect(premium.packageContents).toBe("Half assembly — wireless charging coil not included");
    expect(premium.includedComponents).toBeNull();
    expect(premium.compatibleCoilHandles).toEqual([]);
    expect(productDescription(premium)).not.toMatch(/OEM|Apple|durability|stronger|coating|adhesive|frame|tools/i);
    const coil = getProductInformation({ ...half, title: "iPhone 16 Pro Wireless Charging Coil - Aftermarket", product_type: "Wireless Charging Coil", tags: [] });
    expect(coil.includedComponents).toEqual(["Wireless charging coil only"]);
    expect(coil.construction).toBeNull();
  });
  it("narrows Q1/Q2 review gates without publishing guidance or resolving coil fitment", () => {
    for (const slug of ["premium-vs-a-grade", "glass-only-vs-half-assembly"]) {
      expect(buyerGuidance[slug].status).toBe("OWNER_REVIEWED_PUBLICATION_PENDING");
      expect(guidanceHtml(slug)).toContain("Publication approval remains pending");
      expect(buyerGuidance[slug].sections.every(s => s.answer !== null)).toBe(true);
    }
    expect(buyerGuidance["wireless-charging-coil-compatibility"].status).toBe("FACTUAL_REVIEW_REQUIRED");
  });
  it("derives no-coil and variants without inventing components or brand", () => {
    const f = getProductInformation(half);
    expect(f.coilIncluded).toBe(false);
    expect(f.includedComponents).toBeNull();
    expect(f.compatibleCoilHandles).toEqual([]);
    expect(f.colors).toEqual(half.options?.[0].values);
    expect(f.variants.map(v => v.sku)).toEqual(half.variants.map(v => v.sku));
    expect(productSchema(half, f)).not.toHaveProperty("brand");
    expect(JSON.stringify(productSchema(half, f))).not.toContain('"offers"');
  });
  it("does not infer coil inclusion for glass-only or general back glass", () => {
    expect(getProductInformation(glass).coilIncluded).toBeNull();
    expect(getProductInformation({ ...half, title: "iPhone 17 Back Glass - Premium" }).partType).toBeNull();
  });
  it("rejects expired, future and incomplete factual reviews", () => {
    expect(parseReviewedDetails(review, "2026-09-08")).not.toBeNull();
    expect(parseReviewedDetails({ ...review, reviewAfter: "2026-09-08" }, "2026-09-08")).toBeNull();
    expect(parseReviewedDetails({ ...review, source: "" }, "2026-09-08")).toBeNull();
    expect(parseReviewedDetails({ ...review, reviewedAt: "2026-09-09" }, "2026-09-08")).toBeNull();
    expect(parseReviewedDetails({ ...review, includedComponents: [null] }, "2026-09-08")).toBeNull();
  });
  it("requires explicit reviewed coil relationship and exact model, not a model match alone", () => {
    const facts = getProductInformation(half);
    const coil = { ...half, handle: "test-coil", title: `${facts.model} Wireless Charging Coil - Aftermarket`, product_type: "Wireless Charging Coil", tags: [] };
    expect(compatibleCoils(facts, [coil])).toEqual([]);
    const approved = { ...facts, review: parseReviewedDetails({ ...review, compatibleCoilHandles: ["test-coil"] }), compatibleCoilHandles: ["test-coil"] };
    expect(compatibleCoils({ ...facts, compatibleCoilHandles: ["test-coil"] }, [coil])).toEqual([]);
    expect(compatibleCoils(approved, [coil])).toEqual([coil]);
    expect(compatibleCoils(approved, [{ ...coil, title: "iPhone 8 Wireless Charging Coil - Aftermarket" }])).toEqual([]);
  });
  it("keeps grades and formats separate and rejects taxonomy contradictions", () => {
    expect(belongsToCollection(glass, "a-grade")).toBe(true);
    expect(belongsToCollection(glass, "half-assembly-without-charging-coil")).toBe(false);
    expect(belongsToCollection(half, "glass-only")).toBe(false);
    expect(getProductInformation({ ...half, product_type: "Wireless Charging Coil" }).issues).toContain("product-type-conflict");
    expect(productInformationHtml(getProductInformation({ ...half, tags: ["a grade"] }))).toBeNull();
  });
  it("escapes HTML and JSON-LD rather than executing catalog text", () => {
    const text = '</script><script>alert("x")</script>';
    expect(serializeJsonLd({ name: text })).not.toContain("</script>");
    expect(JSON.parse(serializeJsonLd({ name: text })).name).toBe(text);
    const f = { ...getProductInformation(half), includedComponents: [text] };
    expect(productInformationHtml(f)).toContain("&lt;/script&gt;");
  });
});
describe("SEO regression detection", () => {
  it("keeps retired full assemblies as deliberate 404s and flags redirect chains", () => {
    const plans = buildRedirectDecisions([{ handle: "old", title: "iPhone 16 Full Assembly (With Coil)" }], [{ path: "/a", target: "/b" }, { path: "/b", target: "/c" }]);
    expect(plans.find(p => p.path === "/products/old")).toMatchObject({ target: null, decision: "retain-404" });
    expect(plans.find(p => p.path === "/a")?.decision).toBe("review-required");
  });
  it("detects missing metadata, broken JSON, suspicious brands and empty schema", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","brand":{"name":"Apple"},"sku":""}</script><script type="application/ld+json">{bad}</script><details><summary>Product features</summary></details>`;
    expect(auditHtml(html, "/p").findings.map(f => f.code)).toEqual(expect.arrayContaining(["missing-title", "missing-description", "canonical-count", "suspicious-brand", "empty-schema-value", "invalid-json-ld", "empty-template-section"]));
  });
});
