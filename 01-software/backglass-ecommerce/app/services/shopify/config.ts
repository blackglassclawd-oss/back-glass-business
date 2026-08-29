export const DEFAULT_SHOPIFY_API_VERSION = "2026-07";

export interface ShopifyEnvironment {
  SHOPIFY_API_VERSION?: string;
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
  SHOPIFY_STORE_DOMAIN?: string;
}

export interface ShopifyConfig {
  apiVersion: string;
  clientId: string;
  clientSecret: string;
  storeDomain: string;
}

export class ShopifyConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "ShopifyConfigError";
    this.missing = missing;
  }
}

export function normalizeShopifyDomain(value: string): string {
  const domain = value.trim().toLowerCase();
  const validDomain = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

  if (!validDomain.test(domain)) {
    throw new ShopifyConfigError(
      "SHOPIFY_STORE_DOMAIN must be a bare *.myshopify.com hostname.",
    );
  }

  return domain;
}

export function loadShopifyConfig(env: ShopifyEnvironment): ShopifyConfig {
  const required: Array<[string, string | undefined]> = [
    ["SHOPIFY_STORE_DOMAIN", env.SHOPIFY_STORE_DOMAIN],
    ["SHOPIFY_CLIENT_ID", env.SHOPIFY_CLIENT_ID],
    ["SHOPIFY_CLIENT_SECRET", env.SHOPIFY_CLIENT_SECRET],
  ];
  const missing = required
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new ShopifyConfigError(
      `Missing Shopify configuration: ${missing.join(", ")}`,
      missing,
    );
  }

  const apiVersion =
    env.SHOPIFY_API_VERSION?.trim() || DEFAULT_SHOPIFY_API_VERSION;

  if (!/^\d{4}-(01|04|07|10)$/.test(apiVersion)) {
    throw new ShopifyConfigError(
      "SHOPIFY_API_VERSION must use Shopify's YYYY-MM release format.",
    );
  }

  return {
    apiVersion,
    clientId: env.SHOPIFY_CLIENT_ID!.trim(),
    clientSecret: env.SHOPIFY_CLIENT_SECRET!.trim(),
    storeDomain: normalizeShopifyDomain(env.SHOPIFY_STORE_DOMAIN!),
  };
}
