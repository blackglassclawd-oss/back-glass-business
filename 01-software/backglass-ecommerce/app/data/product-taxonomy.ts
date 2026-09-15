import coilCatalogJson from "../../data/catalog/wireless-charging-coils-2026-08-29.json";
import type { StorefrontProduct } from "./catalog.shared";

export type CatalogPartType = "back-glass" | "wireless-charging-coil";
export type CoilGrade = "OEM" | "Aftermarket";

export interface CoilDraftProduct {
  blockers: string[];
  compatibility: null;
  family: string;
  grade: CoilGrade;
  handle: null;
  includedComponents: null;
  inventory: null;
  kind: "coil-draft";
  media: null;
  model: string;
  modelSlug: string;
  price: null;
  productType: "Wireless Charging Coil";
  sku: null;
  status: "DRAFT";
  title: string;
}

export interface CatalogModel {
  family: string;
  model: string;
  slug: string;
}

interface CoilModelConfig {
  family: string;
  mediaStatus: string;
  model: string;
  slug: string;
  sourceStatus: string;
}

export interface BlockedCoilModel {
  family: string;
  model: string;
  reason: string;
  slug: string;
  status: string;
}

const coilCatalog = coilCatalogJson as {
  blockedModels: BlockedCoilModel[];
  grades: CoilGrade[];
  models: CoilModelConfig[];
  requiredBeforePublication: string[];
};

export const blockedCoilModels = coilCatalog.blockedModels;

export const coilCatalogModels: CatalogModel[] = coilCatalog.models.map(
  ({ family, model, slug }) => ({ family, model, slug }),
);

export const coilDraftProducts: CoilDraftProduct[] = coilCatalog.models.flatMap(
  (model) =>
    coilCatalog.grades.map((grade) => ({
      blockers: [...coilCatalog.requiredBeforePublication],
      compatibility: null,
      family: model.family,
      grade,
      handle: null,
      includedComponents: null,
      inventory: null,
      kind: "coil-draft" as const,
      media: null,
      model: model.model,
      modelSlug: model.slug,
      price: null,
      productType: "Wireless Charging Coil" as const,
      sku: null,
      status: "DRAFT" as const,
      title: `${model.model} Wireless Charging Coil - ${grade}`,
    })),
);

export function normalizeModelName(model: string) {
  return model === "iPhone Air" ? "iPhone 17 Air" : model;
}

export function getProductModel(product: StorefrontProduct) {
  const match = product.title.match(
    /^(iPhone .+?) (?:Large Hole Back Glass|Back Glass|Wireless Charging Coil)(?:\s|$)/i,
  );
  return match ? normalizeModelName(match[1]) : null;
}

export function getModelSlug(model: string) {
  return normalizeModelName(model)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getModelFamily(model: string) {
  const normalized = normalizeModelName(model);
  const numbered = normalized.match(/^iPhone (\d+)/);
  if (numbered) return `iPhone ${numbered[1]}`;
  if (/^iPhone (?:X|XR|XS)/.test(normalized)) return "iPhone X";
  if (/^iPhone SE/.test(normalized)) return "iPhone SE";
  return normalized;
}

function getReleaseRank(model: string) {
  const normalized = normalizeModelName(model).toLowerCase();
  const numbered = normalized.match(/^iphone (\d+)/);
  if (numbered) return Number(numbered[1]);
  if (normalized.includes("se 3rd gen")) return 13.5;
  if (normalized.includes("se 2nd gen")) return 11.5;
  if (/iphone (?:x|xr|xs)/.test(normalized)) return 10.5;
  return 0;
}

function getModelRank(model: string) {
  const normalized = model.toLowerCase();
  if (normalized.includes("pro max")) return 50;
  if (normalized.includes("pro")) return 40;
  if (normalized.includes("plus") || normalized.includes("xs max")) return 30;
  if (normalized.includes("air")) return 25;
  if (/\d+e$/.test(normalized)) return 10;
  if (normalized.includes("mini")) return 5;
  return 20;
}

export function compareCatalogModels(left: CatalogModel, right: CatalogModel) {
  return (
    getReleaseRank(right.model) - getReleaseRank(left.model) ||
    getModelRank(right.model) - getModelRank(left.model) ||
    left.model.localeCompare(right.model)
  );
}

export function getCoilProductPath(product: CoilDraftProduct) {
  return `/products/wireless-charging-coils/${product.modelSlug}/${product.grade.toLowerCase()}`;
}

export function findCoilDraftProduct(modelSlug: string, grade: string) {
  return (
    coilDraftProducts.find(
      (product) =>
        product.modelSlug === modelSlug &&
        product.grade.toLowerCase() === grade.toLowerCase(),
    ) ?? null
  );
}
