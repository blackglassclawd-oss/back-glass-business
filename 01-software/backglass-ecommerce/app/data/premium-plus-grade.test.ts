import { describe, expect, it } from "vitest";

import { catalog } from "./catalog.server";
import { belongsToCollection, collectionDefinitions } from "./collection-content";
import { catalogCategories } from "./catalog.shared";
import {
  getProductInformation,
  isPremiumPlusModel,
  isPremiumPlusProduct,
  premiumPlusGrade,
  productDescription,
  productFactRows,
  productInformationHtml,
  type CatalogInput,
} from "./product-information";

// Premium Plus has no captured Shopify record: the storefront snapshot is
// evidence, not a place to invent products. These cases rebuild titles on top of
// a real captured half assembly so only the grade and model under test vary.
const premiumHalfAssembly = catalog.products.find(
  (product) => product.title === "iPhone 16 Pro Max Back Glass Half Assembly (No Coil) - Premium",
)!;
const aGradeGlassOnly = catalog.products.find(
  (product) => product.title === "iPhone 14 Pro Max Large Hole Back Glass - A Grade",
)!;

function halfAssembly(model: string, grade: string, tags = [grade.toLowerCase()]): CatalogInput {
  return { ...premiumHalfAssembly, tags, title: `${model} Back Glass Half Assembly (No Coil) - ${grade}` };
}

const eligibleModels = ["iPhone 15 Pro Max", "iPhone 16 Pro Max", "iPhone 17 Pro Max"];

describe("Premium Plus eligibility", () => {
  it.each(eligibleModels)("allows Premium Plus for %s", (model) => {
    const facts = getProductInformation(halfAssembly(model, "Premium Plus"));

    expect(facts.grade).toBe("Premium Plus");
    expect(facts.model).toBe(model);
    expect(isPremiumPlusModel(model)).toBe(true);
    expect(isPremiumPlusProduct(facts)).toBe(true);
    expect(facts.issues).toEqual([]);
    expect(belongsToCollection(halfAssembly(model, "Premium Plus"), "premium-plus")).toBe(true);
  });

  it("records exactly the three eligible Pro Max models (iPhone 15-17)", () => {
    expect(premiumPlusGrade.eligibleModels.map((entry) => entry.model).sort()).toEqual([...eligibleModels].sort());
  });

  it.each([
    ["iPhone 16 Pro", "non-Pro-Max model in an eligible generation"],
    ["iPhone 17", "base model in an eligible generation"],
    ["iPhone 15 Plus", "Plus model in an eligible generation"],
  ])("rejects Premium Plus for %s (%s)", (model) => {
    const product = halfAssembly(model, "Premium Plus");
    const facts = getProductInformation(product);

    expect(isPremiumPlusModel(model)).toBe(false);
    expect(isPremiumPlusProduct(facts)).toBe(false);
    expect(facts.issues).toContain("premium-plus-model-eligibility-conflict");
    expect(belongsToCollection(product, "premium-plus")).toBe(false);
  });

  it("rejects Premium Plus for iPhone 14 Pro Max because the iPhone 14 series is Glass Only", () => {
    const product = halfAssembly("iPhone 14 Pro Max", "Premium Plus");
    const facts = getProductInformation(product);

    expect(isPremiumPlusModel("iPhone 14 Pro Max")).toBe(false);
    expect(isPremiumPlusProduct(facts)).toBe(false);
    expect(facts.issues).toContain("premium-plus-model-eligibility-conflict");
    expect(belongsToCollection(product, "premium-plus")).toBe(false);
    expect(premiumPlusGrade.eligibleModels.map((entry) => entry.model)).not.toContain("iPhone 14 Pro Max");
    // The exclusion is recorded as intentional architecture, not a sourcing blocker.
    const excluded = premiumPlusGrade.excludedModels.find((entry) => entry.model === "iPhone 14 Pro Max")!;
    expect(excluded.status).toBe("INELIGIBLE_GLASS_ONLY_SERIES");
    expect(excluded.reason).toMatch(/Glass Only/);
    expect(excluded.reason).toMatch(/not missing data|intentional/i);
    // No iPhone 14 model of any kind is eligible.
    for (const model of ["iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max"]) {
      expect(isPremiumPlusModel(model)).toBe(false);
    }
  });

  it("rejects Premium Plus for an older Pro Max such as iPhone 13 Pro Max", () => {
    const product = halfAssembly("iPhone 13 Pro Max", "Premium Plus");
    const facts = getProductInformation(product);

    expect(isPremiumPlusModel("iPhone 13 Pro Max")).toBe(false);
    expect(isPremiumPlusProduct(facts)).toBe(false);
    expect(facts.issues).toContain("premium-plus-model-eligibility-conflict");
    expect(belongsToCollection(product, "premium-plus")).toBe(false);
    // Generations above the eligible range are equally out of scope.
    expect(isPremiumPlusModel("iPhone 18 Pro Max")).toBe(false);
  });

  it("publishes no Premium Plus claim or copy on an ineligible listing", () => {
    const facts = getProductInformation(halfAssembly("iPhone 13 Pro Max", "Premium Plus"));

    expect(facts.cameraLens).toBeNull();
    expect(facts.construction).toBeNull();
    expect(productDescription(facts)).not.toMatch(/sapphire|camera lens/i);
    expect(productInformationHtml(facts)).toBeNull();
  });

  it("keeps Premium Plus out of the catalog until a real product exists", () => {
    expect(
      catalog.products.filter((product) => getProductInformation(product).grade === "Premium Plus"),
    ).toEqual([]);
    for (const product of catalog.products) {
      expect(belongsToCollection(product, "premium-plus")).toBe(false);
    }
  });
});

describe("Premium Plus half-assembly inheritance", () => {
  it("reuses the Premium half-assembly behavior rather than a parallel one", () => {
    const premium = getProductInformation(halfAssembly("iPhone 17 Pro Max", "Premium"));
    const premiumPlus = getProductInformation(halfAssembly("iPhone 17 Pro Max", "Premium Plus"));

    expect(premiumPlus.partType).toBe("half-assembly");
    expect(premiumPlus.partType).toBe(premium.partType);
    expect(premiumPlus.coilIncluded).toBe(false);
    expect(premiumPlus.coilIncluded).toBe(premium.coilIncluded);
    expect(premiumPlus.packageContents).toBe(premium.packageContents);
    expect(premiumPlus.includedComponents).toEqual(premium.includedComponents);
    expect(premiumPlus.excludedComponents).toEqual(premium.excludedComponents);
    expect(premiumPlus.compatibleCoilHandles).toEqual(premium.compatibleCoilHandles);
    // Construction is inherited from Premium, not restated as an independent fact.
    expect(premiumPlus.construction).toContain(premium.construction!);
    expect(
      belongsToCollection(halfAssembly("iPhone 17 Pro Max", "Premium Plus"), "half-assembly-without-charging-coil"),
    ).toBe(true);
  });

  it("flags a Premium Plus listing that is not a half assembly", () => {
    const facts = getProductInformation({
      ...aGradeGlassOnly,
      tags: ["premium plus"],
      title: "iPhone 14 Pro Max Large Hole Back Glass - Premium Plus",
    });

    expect(facts.issues).toContain("premium-plus-part-type-conflict");
    expect(isPremiumPlusProduct(facts)).toBe(false);
    expect(facts.cameraLens).toBeNull();
  });

  it("keeps Premium Plus off coil products and out of the coil grade taxonomy", () => {
    const facts = getProductInformation({
      ...premiumHalfAssembly,
      product_type: "Wireless Charging Coil",
      tags: [],
      title: "iPhone 17 Pro Max Wireless Charging Coil - Premium Plus",
    });

    expect(facts.issues).toContain("coil-grade-taxonomy-conflict");
    expect(isPremiumPlusProduct(facts)).toBe(false);
  });
});

describe("Premium Plus customer-facing wording", () => {
  it("states the sapphire glass and OEM-quality lens without asserting provenance", () => {
    const facts = getProductInformation(halfAssembly("iPhone 15 Pro Max", "Premium Plus"));
    const description = productDescription(facts)!;

    expect(facts.cameraLens).toBe("Sapphire glass camera lens. OEM-quality camera lens.");
    expect(premiumPlusGrade.customerFacingWording).toEqual(["Sapphire glass camera lens", "OEM-quality camera lens"]);
    expect(description).toContain("Sapphire glass camera lens");
    expect(description).toContain("OEM-quality camera lens");
    expect(description).not.toMatch(/genuine|apple|original|oem[- ]supplied|authentic|scratch|durab|optical|warrant/i);
    expect(productFactRows(facts)).toContainEqual(["Camera lens", facts.cameraLens]);
    expect(productInformationHtml(facts)).toContain("Sapphire glass camera lens");
  });

  it("keeps the collection copy free of provenance and performance claims", () => {
    const definition = collectionDefinitions["premium-plus"];

    expect(definition.description).toContain("Sapphire glass camera lens");
    expect(definition.description).toContain("iPhone 15 Pro Max");
    // The iPhone 14 series is Glass Only, so it must never appear in Premium Plus copy.
    expect(definition.description).not.toContain("iPhone 14");
    expect(definition.description).toMatch(/does not establish Apple or OEM origin/);
    expect(definition.description).not.toMatch(/genuine OEM|Apple-original|OEM-supplied/i);
  });

  it("records the grade as pending owner approval with its publication blockers", () => {
    expect(premiumPlusGrade.status).toBe("SPECIFIED_OWNER_APPROVAL_PENDING");
    expect(premiumPlusGrade.owner).toBe("Michael");
    expect(premiumPlusGrade.requiredBeforePublication).toContain("michaelGradeConfirmation");
    expect(premiumPlusGrade.requiredBeforePublication).toContain("approvedSellingPrice");
  });
});

describe("existing grades are unchanged", () => {
  it("keeps Premium behavior exactly as before", () => {
    const facts = getProductInformation(premiumHalfAssembly);

    expect(facts.grade).toBe("Premium");
    expect(facts.construction).toBe("Premium uses one-piece formed glass construction.");
    expect(facts.cameraLens).toBeNull();
    expect(facts.partType).toBe("half-assembly");
    expect(facts.coilIncluded).toBe(false);
    expect(facts.packageContents).toBe("Half assembly — wireless charging coil not included");
    expect(facts.issues).toEqual([]);
    expect(belongsToCollection(premiumHalfAssembly, "premium")).toBe(true);
    expect(belongsToCollection(premiumHalfAssembly, "premium-plus")).toBe(false);
    expect(productDescription(facts)).not.toMatch(/Premium Plus|sapphire|camera lens/i);
  });

  it("keeps A Grade behavior exactly as before", () => {
    const facts = getProductInformation(aGradeGlassOnly);

    expect(facts.grade).toBe("A Grade");
    expect(facts.construction).toContain("two layers of glass stacked in the raised three-dimensional portion");
    expect(facts.cameraLens).toBeNull();
    expect(facts.partType).toBe("glass-only");
    expect(facts.includedComponents).toEqual(["Glass only"]);
    expect(facts.issues).toEqual([]);
    expect(belongsToCollection(aGradeGlassOnly, "a-grade")).toBe(true);
    expect(belongsToCollection(aGradeGlassOnly, "premium-plus")).toBe(false);
    expect(productDescription(facts)).not.toMatch(/Premium Plus|sapphire|camera lens/i);
  });

  it("treats the three glass grades as mutually exclusive labels", () => {
    expect(getProductInformation(halfAssembly("iPhone 17 Pro Max", "Premium Plus", ["premium"])).issues).toContain("grade-tag-conflict");
    expect(getProductInformation(halfAssembly("iPhone 17 Pro Max", "Premium", ["premium plus"])).issues).toContain("grade-tag-conflict");
    expect(getProductInformation(halfAssembly("iPhone 17 Pro Max", "A Grade", ["premium plus"])).issues).toContain("grade-tag-conflict");
    // The pre-existing Premium/A Grade rule still holds.
    expect(getProductInformation(halfAssembly("iPhone 17 Pro Max", "Premium", ["a grade"])).issues).toContain("grade-tag-conflict");
  });

  it("orders the grade surfaces A Grade, then Premium, then Premium Plus", () => {
    const grades = catalogCategories
      .map((category) => category.value)
      .filter((value) => ["a-grade", "premium", "premium-plus"].includes(value));

    expect(grades).toEqual(["a-grade", "premium", "premium-plus"]);
  });
});
