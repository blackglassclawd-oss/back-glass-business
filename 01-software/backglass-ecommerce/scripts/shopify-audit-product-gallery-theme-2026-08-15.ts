import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  loadShopifyConfig,
  type ShopifyConfig,
} from "../app/services/shopify/config";

interface Theme {
  created_at: string;
  id: number;
  name: string;
  previewable: boolean;
  processing: boolean;
  role: string;
  theme_store_id: number | null;
  updated_at: string;
}

interface ThemeAsset {
  content_type: string;
  key: string;
  public_url: string | null;
  size: number;
  updated_at: string;
  value?: string;
}

async function getAccessToken(config: ShopifyConfig) {
  const response = await fetch(
    `https://${config.storeDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "client_credentials",
      }),
    },
  );
  const payload = (await response.json()) as {
    access_token?: string;
    scope?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(`Shopify token request returned HTTP ${response.status}.`);
  }
  return payload;
}

async function restJson<T>(
  config: ShopifyConfig,
  token: string,
  pathname: string,
): Promise<T> {
  const response = await fetch(
    `https://${config.storeDomain}/admin/api/${config.apiVersion}${pathname}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
    },
  );
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(
      `GET ${pathname} returned HTTP ${response.status}: ${JSON.stringify(payload)}`,
    );
  }
  return payload as T;
}

const config = loadShopifyConfig(process.env);
const token = await getAccessToken(config);
const { themes } = await restJson<{ themes: Theme[] }>(
  config,
  token.access_token!,
  "/themes.json",
);
const published = themes.filter(({ role }) => role === "main");
if (published.length !== 1) {
  throw new Error(`Expected exactly one published theme, found ${published.length}.`);
}
const theme = published[0];
const { asset } = await restJson<{ asset: ThemeAsset }>(
  config,
  token.access_token!,
  `/themes/${theme.id}/assets.json?asset%5Bkey%5D=templates%2Fproduct.json`,
);
if (!asset.value) throw new Error("Published templates/product.json has no value.");
const template = JSON.parse(asset.value) as {
  sections?: Record<string, { settings?: Record<string, unknown>; type?: string }>;
};
const settings = Object.entries(template.sections ?? {})
  .filter(([, section]) => section.type === "main-product")
  .map(([sectionId, section]) => ({
    hideVariants: section.settings?.hide_variants ?? null,
    sectionId,
    type: section.type,
  }));
if (settings.length !== 1) {
  throw new Error(
    `Expected one main-product section in templates/product.json, found ${settings.length}.`,
  );
}

const capturedAt = new Date().toISOString();
const outputDirectory = path.resolve(
  "data/backups",
  `shopify-theme-product-gallery-audit-${capturedAt.replaceAll(":", "-")}`,
);
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(outputDirectory, "themes.json"), `${JSON.stringify(themes, null, 2)}\n`),
  writeFile(path.join(outputDirectory, "templates-product.json"), `${asset.value}\n`),
  writeFile(
    path.join(outputDirectory, "audit.json"),
    `${JSON.stringify(
      {
        capturedAt,
        outputDirectory,
        publishedTheme: theme,
        scopes: token.scope?.split(",").sort() ?? [],
        settings,
      },
      null,
      2,
    )}\n`,
  ),
]);
console.log(
  JSON.stringify(
    {
      outputDirectory,
      publishedTheme: { id: theme.id, name: theme.name, role: theme.role },
      settings,
      themeScopeAvailable:
        token.scope?.includes("read_themes") || token.scope?.includes("write_themes") || false,
    },
    null,
    2,
  ),
);
