import { describe, expect, it } from "vitest";

import mediaProvenance from "../../data/catalog/review-media-provenance-2026-09-10.json";
import {
  iphone17SeriesApproval,
  iphone17eBackGlass,
  iphone17eTemporaryImageAvailable,
  publishableIphone17BackGlass,
} from "./iphone17-series-approval";
import { getProductInformation, isPremiumPlusModel, premiumPlusGrade, type CatalogInput } from "./product-information";

function asCatalogInput(title: string, colors: string[], skus: string[], tags: string[]): CatalogInput {
  return {
    handle: "test",
    options: [{ name: "Color", position: 1, values: colors }],
    product_information: undefined,
    product_type: "Back Glass",
    tags,
    title,
    variants: colors.map((color, index) => ({
      available: false,
      compare_at_price: null,
      featured_image: null,
      id: index,
      option1: color,
      option2: null,
      option3: null,
      price: "0.00",
      sku: skus[index] ?? "",
      title: color,
    })),
  };
}

describe("Michael's 2026-09-12 iPhone 17-series approval", () => {
  it("records all three owner decisions verbatim", () => {
    expect(iphone17SeriesApproval.evidenceId).toBe("MICHAEL-2026-09-12-17-SERIES");
    expect(iphone17SeriesApproval.recordedAt).toBe("2026-09-12");
    expect(iphone17SeriesApproval.decisions.map((decision) => decision.quote)).toEqual([
      "我看了17系列了，17可以发布了",
      "可以加17e背玻璃",
      "17e背玻璃可以用16e的图片，虽然16e没有磁铁，17e有，先求有再求好",
    ]);
  });

  it("publishes only products with an approved price and no open blocker", () => {
    const publishable = publishableIphone17BackGlass();

    expect(publishable.map((product) => [product.title, product.approvedSellingPrice])).toEqual([
      ["iPhone 17 Back Glass Half Assembly (No Coil) - A Grade", "12.00"],
      ["iPhone 17 Back Glass Half Assembly (No Coil) - Premium", "18.00"],
    ]);
    for (const product of publishable) {
      expect(product.media?.status).toBe("OWNER_APPROVED");
      expect(product.media?.altPrefix).toBeTruthy();
    }
  });

  it("never treats an unconfirmed sheet price as approved", () => {
    for (const product of iphone17SeriesApproval.backGlass) {
      if (product.approvedSellingPrice === null) {
        expect(product.publication).not.toBe("APPROVED");
      }
      if (product.unconfirmedSheetPrice) {
        expect(product.approvedSellingPrice).toBeNull();
        expect(product.openFactualBlockers).toContain("approvedSellingPrice");
      }
    }
  });

  it("keeps iPhone 17 Pro and Pro Max A Grade out of the offer", () => {
    const aGrades = iphone17SeriesApproval.backGlass.filter(
      (product) => product.grade === "A Grade" && /^iPhone 17 Pro/.test(product.model),
    );

    expect(aGrades).toHaveLength(2);
    for (const product of aGrades) {
      expect(product.catalogDecision).toBe("NOT_OFFERED");
      expect(product.publication).toBe("NEVER");
    }
  });

  it("keeps iPhone Air blocked on its full-assembly imagery", () => {
    const air = iphone17SeriesApproval.backGlass.filter((product) => product.model === "iPhone Air");

    expect(air).toHaveLength(2);
    for (const product of air) {
      expect(product.media?.status).toBe("BLOCKED_FULL_ASSEMBLY_IMAGERY");
      expect(product.openFactualBlockers).toContain("approvedProductMedia");
    }
  });

  it("covers back glass only: no coil is listed, approved or published", () => {
    expect(iphone17SeriesApproval.coils.decision).toBe("UNCHANGED");
    for (const product of iphone17SeriesApproval.backGlass) {
      const facts = getProductInformation(asCatalogInput(product.title, product.colors, [], []));
      expect(facts.partType).toBe("half-assembly");
      expect(facts.coilIncluded).toBe(false);
      expect(product.title).not.toMatch(/coil -|Wireless Charging Coil/i);
    }
    expect(iphone17SeriesApproval.notApprovedByThisRecord.join(" ")).toMatch(/Wireless charging coil/);
  });

  it("keeps Premium Plus on the eligible Pro Max model and still blocked commercially", () => {
    const premiumPlus = iphone17SeriesApproval.backGlass.filter((product) => product.grade === "Premium Plus");

    expect(premiumPlus.map((product) => product.model)).toEqual(["iPhone 17 Pro Max"]);
    expect(isPremiumPlusModel("iPhone 17 Pro Max")).toBe(true);
    expect(premiumPlus[0].publication).toBe("BLOCKED");
    expect(premiumPlus[0].openFactualBlockers).toEqual(
      expect.arrayContaining(["approvedSellingPrice", "sku", "startingInventory", "lensProvenanceEvidence"]),
    );
  });

  it("scopes the Premium Plus owner review to iPhone 17 Pro Max only", () => {
    const reviews = (premiumPlusGrade as unknown as { ownerReview: Array<{ model: string; stillRequired: string[] }> }).ownerReview;

    expect(reviews.map((review) => review.model)).toEqual(["iPhone 17 Pro Max"]);
    expect(reviews[0].stillRequired).toContain("approvedSellingPrice");
    expect(premiumPlusGrade.requiredBeforePublication).toContain("michaelGradeConfirmation");
    expect(premiumPlusGrade.excludedModels.map((entry) => entry.model)).toContain("iPhone 14 Pro Max");
  });

  it("clears the label-based 17 Pro Max media blocker only with a visual verification on file", () => {
    const media = mediaProvenance.premiumPlusMedia["iphone-17-pro-max"] as { imageCount: number; status: string; visualVerification?: string };

    expect(media.status).toBe("APPROVED_OWNER_REVIEWED_STORE_MEDIA");
    expect(media.imageCount).toBe(3);
    expect(media.visualVerification).toMatch(/no charging coil/);
  });
});

describe("iPhone 17e Back Glass", () => {
  it("follows the approved Premium-only Half Assembly (No Coil) structure", () => {
    const facts = getProductInformation(
      asCatalogInput(
        iphone17eBackGlass.title,
        iphone17eBackGlass.colors,
        iphone17eBackGlass.colors.map((color) => iphone17eBackGlass.skus[color]),
        ["premium"],
      ),
    );

    expect(iphone17eBackGlass.grades).toEqual(["Premium"]);
    expect(iphone17eBackGlass.colors).toEqual(["Black", "White", "Soft Pink"]);
    expect(facts.model).toBe("iPhone 17e");
    expect(facts.partType).toBe("half-assembly");
    expect(facts.grade).toBe("Premium");
    expect(facts.coilIncluded).toBe(false);
    expect(facts.issues).toEqual([]);
    expect(isPremiumPlusModel("iPhone 17e")).toBe(false);
  });

  it("uses the approved I17E SKU for every colour and nothing else", () => {
    expect(Object.keys(iphone17eBackGlass.skus)).toEqual(iphone17eBackGlass.colors);
    for (const sku of Object.values(iphone17eBackGlass.skus)) {
      expect(sku).toMatch(/^SKU-I17E-PREMIUM-[A-Z]+-HA$/);
    }
  });

  it("invents no price or inventory and stays blocked until they exist", () => {
    expect(iphone17eBackGlass.approvedSellingPrice).toBeNull();
    expect(iphone17eBackGlass.inventoryDecision).toBeNull();
    expect(iphone17eBackGlass.requiredBeforePublication).toEqual(
      expect.arrayContaining(["approvedSellingPrice", "inventoryDecision", "productMedia"]),
    );
  });

  it("records the owner-approved 16e image reuse and its known magnet difference", () => {
    const { media } = iphone17eBackGlass;

    expect(media).toMatchObject({
      intendedProductModel: "iPhone 17e",
      knownVisualDifference: "iPhone 16e imagery does not show the magnet configuration present on iPhone 17e",
      mediaIsNotCompatibilityEvidence: true,
      ownerApprovedTemporaryReuse: true,
      replacementStatus: "replace when model-specific iPhone 17e photography is available",
      temporaryImageSourceModel: "iPhone 16e",
    });
  });

  it("does not attach an image that does not exist", () => {
    // No iPhone 16e image exists anywhere to reuse; flip sourceAssetStatus only when one is supplied.
    expect(iphone17eBackGlass.media.sourceAssetStatus).toBe("NO_16E_IMAGE_EXISTS");
    expect(iphone17eTemporaryImageAvailable()).toBe(false);
  });

  it("keeps internal language out of the customer image note and never claims an exact depiction", () => {
    const note = iphone17eBackGlass.media.customerImageNote;

    expect(note).toMatch(/Representative photo/);
    expect(note).toMatch(/iPhone 16e/);
    expect(note).not.toMatch(/temporary|placeholder|owner|Michael|SKU|supplier|TEMP/i);
    expect(note).not.toMatch(/MagSafe|OEM|genuine|Apple|certified/i);
  });
});
