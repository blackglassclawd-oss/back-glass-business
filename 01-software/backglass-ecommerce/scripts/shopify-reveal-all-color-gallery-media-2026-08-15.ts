import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import * as cheerio from "cheerio";

import {
  loadShopifyConfig,
  type ShopifyConfig,
} from "../app/services/shopify/config";

interface Theme {
  id: number;
  name: string;
  role: string;
  theme_store_id: number | null;
  updated_at: string;
}

interface ThemeAsset {
  content_type: string;
  key: string;
  size: number;
  updated_at: string;
  value?: string;
}

const targets = [
  ["iphone-16-half-assembly-no-coil-a-grade", 5],
  ["iphone-16-half-assembly-no-coil-premium", 5],
  ["iphone-16-plus-half-assembly-no-coil-a-grade", 5],
  ["iphone-16-plus-half-assembly-no-coil-premium", 5],
  ["iphone-16-pro-half-assembly-no-coil-a-grade", 4],
  ["iphone-16-pro-half-assembly-no-coil-premium", 4],
  ["iphone-16-pro-max-half-assembly-no-coil-a-grade", 4],
  ["iphone-16-pro-max-half-assembly-no-coil-premium", 4],
  ["iphone-17-back-glass-full-assembly-with-coil-a-grade", 5],
  ["iphone-17-back-glass-full-assembly-with-coil-premium", 5],
  ["iphone-17-pro-back-glass-full-assembly-with-coil-a-grade", 3],
  ["iphone-17-pro-back-glass-full-assembly-with-coil-premium", 3],
  ["iphone-17-pro-max-back-glass-full-assembly-with-coil-a-grade", 3],
  ["iphone-17-pro-max-back-glass-full-assembly-with-coil-premium", 3],
  ["iphone-air-back-glass-full-assembly-with-coil-a-grade", 4],
  ["iphone-air-back-glass-full-assembly-with-coil-premium", 4],
] as const;

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

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
  init: RequestInit = {},
): Promise<T> {
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await fetch(
      `https://${config.storeDomain}/admin/api/${config.apiVersion}${pathname}`,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
          ...init.headers,
        },
      },
    );
    if (response.status === 429 && attempt < 6) {
      const waitSeconds = Number(response.headers.get("retry-after") || "2");
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
    if (!response.ok) {
      throw new Error(
        `${init.method || "GET"} ${pathname} returned HTTP ${response.status}: ${JSON.stringify(payload)}`,
      );
    }
    return payload as T;
  }
  throw new Error(`Shopify REST retries exhausted for ${pathname}.`);
}

function readHideVariants(assetValue: string) {
  const template = JSON.parse(assetValue) as {
    sections?: Record<string, { settings?: Record<string, unknown>; type?: string }>;
  };
  const mainSections = Object.entries(template.sections ?? {}).filter(
    ([, section]) => section.type === "main-product",
  );
  if (mainSections.length !== 1) {
    throw new Error(`Expected one main-product section; found ${mainSections.length}.`);
  }
  const [sectionId, section] = mainSections[0];
  return {
    hideVariants: section.settings?.hide_variants,
    sectionId,
  };
}

async function inspectStorefront(handle: string, expectedMedia: number) {
  const response = await fetch(
    `https://backglasspros.com/products/${handle}?gallery-audit=${Date.now()}`,
    {
      headers: {
        "Cache-Control": "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Storefront page failed for ${handle}: HTTP ${response.status}.`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const mediaItems = $("ul.product__media-list li.product__media-item");
  const mediaIds = new Set(
    mediaItems
      .toArray()
      .map((element) => $(element).attr("data-media-id"))
      .filter((value): value is string => Boolean(value)),
  );
  const modalItems = $("product-modal .product-media-modal__content > *");
  const sliderTotal = $(".slider-counter--total").first().text().trim() || null;
  return {
    expectedMedia,
    handle,
    mainGalleryItems: mediaItems.length,
    mainGalleryUniqueMediaIds: mediaIds.size,
    modalItems: modalItems.length,
    passed:
      mediaItems.length === expectedMedia && mediaIds.size === expectedMedia,
    sliderTotal,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const config = loadShopifyConfig(process.env);
  const token = await getAccessToken(config);
  if (!token.scope?.includes("read_themes")) {
    throw new Error("The Shopify app token is missing read_themes.");
  }
  const { themes } = await restJson<{ themes: Theme[] }>(
    config,
    token.access_token!,
    "/themes.json",
  );
  const published = themes.filter(({ role }) => role === "main");
  if (published.length !== 1) {
    throw new Error(`Expected one published Shopify theme; found ${published.length}.`);
  }
  const theme = published[0];
  const assetPath = `/themes/${theme.id}/assets.json?asset%5Bkey%5D=templates%2Fproduct.json`;
  const { asset } = await restJson<{ asset: ThemeAsset }>(
    config,
    token.access_token!,
    assetPath,
  );
  if (!asset.value) throw new Error("Published templates/product.json has no value.");
  const beforeSetting = readHideVariants(asset.value);
  if (typeof beforeSetting.hideVariants !== "boolean") {
    throw new Error(
      `templates/product.json main-product hide_variants is not boolean: ${JSON.stringify(beforeSetting.hideVariants)}.`,
    );
  }
  if (apply && beforeSetting.hideVariants === true && !token.scope.includes("write_themes")) {
    throw new Error("The Shopify app token is missing write_themes for the requested setting change.");
  }

  const trueMatches = asset.value.match(/"hide_variants"\s*:\s*true/g) ?? [];
  const falseMatches = asset.value.match(/"hide_variants"\s*:\s*false/g) ?? [];
  if (beforeSetting.hideVariants === true && trueMatches.length !== 1) {
    throw new Error(`Expected one exact true hide_variants setting; found ${trueMatches.length}.`);
  }
  if (beforeSetting.hideVariants === false && falseMatches.length !== 1) {
    throw new Error(`Expected one exact false hide_variants setting; found ${falseMatches.length}.`);
  }
  const updatedValue =
    beforeSetting.hideVariants === true
      ? asset.value.replace(/("hide_variants"\s*:\s*)true/, "$1false")
      : asset.value;
  const afterSetting = readHideVariants(updatedValue);
  if (afterSetting.hideVariants !== false) {
    throw new Error("Planned product template does not set hide_variants to false.");
  }

  const capturedAt = new Date().toISOString();
  const backupDirectory = path.resolve(
    "data/backups",
    `shopify-before-reveal-all-color-gallery-media-${capturedAt.replaceAll(":", "-")}`,
  );
  await mkdir(backupDirectory, { recursive: true });
  const preflightStorefront = await Promise.all(
    targets.map(([handle, expectedMedia]) => inspectStorefront(handle, expectedMedia)),
  );
  await Promise.all([
    writeFile(path.join(backupDirectory, "themes.json"), `${JSON.stringify(themes, null, 2)}\n`),
    writeFile(path.join(backupDirectory, "templates-product.before.json"), `${asset.value}\n`),
    writeFile(path.join(backupDirectory, "templates-product.planned.json"), `${updatedValue}\n`),
    writeFile(
      path.join(backupDirectory, "preflight.json"),
      `${JSON.stringify(
        {
          apply,
          capturedAt,
          publishedTheme: theme,
          beforeSetting,
          afterSetting,
          beforeSha256: sha256(asset.value),
          plannedSha256: sha256(updatedValue),
          preflightStorefront,
        },
        null,
        2,
      )}\n`,
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        apply,
        backupDirectory,
        beforeHideVariants: beforeSetting.hideVariants,
        productsChecked: preflightStorefront.length,
        publishedTheme: { id: theme.id, name: theme.name },
        storefrontsAlreadyShowingAllColors: preflightStorefront.filter(({ passed }) => passed).length,
        storefrontsCollapsedToOne: preflightStorefront.filter(({ mainGalleryItems }) => mainGalleryItems === 1).length,
      },
      null,
      2,
    ),
  );
  if (!apply) {
    console.log("DRY RUN: pass --apply to set published templates/product.json main.hide_variants=false.");
    return;
  }

  if (beforeSetting.hideVariants === true) {
    await restJson<{ asset: ThemeAsset }>(
      config,
      token.access_token!,
      `/themes/${theme.id}/assets.json`,
      {
        method: "PUT",
        body: JSON.stringify({
          asset: { key: "templates/product.json", value: updatedValue },
        }),
      },
    );
  }

  const verifiedAsset = await restJson<{ asset: ThemeAsset }>(
    config,
    token.access_token!,
    assetPath,
  );
  if (!verifiedAsset.asset.value) {
    throw new Error("Verified published templates/product.json has no value.");
  }
  const verifiedSetting = readHideVariants(verifiedAsset.asset.value);
  if (verifiedSetting.hideVariants !== false) {
    throw new Error("Shopify Admin verification still reports hide_variants=true.");
  }

  let storefrontVerification: Awaited<ReturnType<typeof inspectStorefront>>[] = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    storefrontVerification = await Promise.all(
      targets.map(([handle, expectedMedia]) => inspectStorefront(handle, expectedMedia)),
    );
    if (storefrontVerification.every(({ passed }) => passed)) break;
    if (attempt === 11) {
      const failed = storefrontVerification.filter(({ passed }) => !passed);
      throw new Error(
        `Storefront gallery verification failed after 60 seconds: ${JSON.stringify(failed)}.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const result = {
    appliedAt: new Date().toISOString(),
    backupDirectory,
    publishedTheme: theme,
    beforeSetting,
    verifiedSetting,
    beforeSha256: sha256(asset.value),
    afterSha256: sha256(verifiedAsset.asset.value),
    changed: beforeSetting.hideVariants !== false,
    productsVerified: storefrontVerification.length,
    storefrontVerification,
  };
  const resultPath = path.join(
    backupDirectory,
    "gallery-visibility-apply-and-verification-result.json",
  );
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(
    path.resolve("data", "shopify-gallery-visibility-verification-2026-08-15.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(
    `APPLIED AND VERIFIED\ttheme=${theme.id}\thide_variants=false\tproducts=${storefrontVerification.length}\tresult=${resultPath}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
