import approvalJson from "../../data/catalog/iphone-17-series-owner-approval-2026-09-12.json";

export type Iphone17Publication = "APPROVED" | "BLOCKED" | "NEVER";

export interface Iphone17BackGlassDecision {
  approvedSellingPrice: string | null;
  blockerNote?: string;
  catalogDecision: "OFFERED" | "NOT_OFFERED";
  colors: string[];
  grade: "A Grade" | "Premium" | "Premium Plus";
  handle: string;
  media?: { altPrefix?: string; count: number; note: string; status: string };
  model: string;
  openFactualBlockers: string[];
  ownerReview: string | null;
  priceEvidence: string | null;
  productId: string;
  publication: Iphone17Publication;
  title: string;
  unconfirmedSheetPrice?: string | null;
}

export interface Iphone17eBackGlass {
  approvedSellingPrice: string | null;
  coilIncluded: false;
  colors: string[];
  draftPriceMarker: string;
  grades: string[];
  handle: string;
  inventoryDecision: string | null;
  media: {
    customerImageNote: string;
    intendedProductModel: string;
    internalLabel: string;
    knownVisualDifference: string;
    mediaIsNotCompatibilityEvidence: boolean;
    ownerApprovedTemporaryReuse: boolean;
    replacementStatus: string;
    sourceAssetStatus: "NO_16E_IMAGE_EXISTS" | "AVAILABLE";
    temporaryImageSourceModel: string;
  };
  michaelFactReview: string;
  productForm: "half-assembly";
  productType: "Back Glass";
  requiredBeforePublication: string[];
  skus: Record<string, string>;
  status: string;
  title: string;
  vendor: string;
}

/** Michael's 2026-09-12 iPhone 17-series decisions. Owner review is not price, stock or coil approval. */
export const iphone17SeriesApproval = approvalJson as unknown as {
  backGlass: Iphone17BackGlassDecision[];
  coils: { decision: "UNCHANGED"; note: string };
  decisions: Array<{ id: string; meaning: string; quote: string; scope?: string }>;
  evidenceId: string;
  iphone17eBackGlass: Iphone17eBackGlass;
  notApprovedByThisRecord: string[];
  publicationChannels: string[];
  recordedAt: string;
};

export const iphone17eBackGlass = iphone17SeriesApproval.iphone17eBackGlass;

/**
 * Products that may be published once the live Shopify gates also pass. Owner
 * review alone never qualifies a product: it also needs an approved price and no
 * open factual blocker.
 */
export function publishableIphone17BackGlass() {
  return iphone17SeriesApproval.backGlass.filter(
    (product) =>
      product.catalogDecision === "OFFERED" &&
      product.publication === "APPROVED" &&
      product.ownerReview !== null &&
      product.approvedSellingPrice !== null &&
      product.openFactualBlockers.length === 0,
  );
}

/** True when the 16e image the owner allowed for 17e actually exists to be attached. */
export function iphone17eTemporaryImageAvailable() {
  const { media } = iphone17eBackGlass;
  return media.ownerApprovedTemporaryReuse && media.sourceAssetStatus === "AVAILABLE";
}
