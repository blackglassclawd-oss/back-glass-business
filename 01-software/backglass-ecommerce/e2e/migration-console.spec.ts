import { expect, test } from "@playwright/test";
import { storefrontPositioning } from "../app/data/store-content";

test("renders the storefront without horizontal overflow", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/");

  // Assert against the shared constant so the heading and this test cannot
  // drift apart, and hold the rule that drove the current wording: the
  // storefront must not headline a category with no purchasable products.
  await expect(
    page.getByRole("heading", { name: storefrontPositioning.heading, exact: true }),
  ).toBeVisible();
  expect(storefrontPositioning.heading).not.toMatch(/coil/i);
  await expect(
    page.getByText(/54 active Back Glass products and 30 standalone/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Catalog", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Full assembly" })).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "iPhone 17 Pro Max Wireless Charging Coil - OEM",
    }),
  ).toBeVisible();
  await expect(
    page.locator('nav[aria-label="Primary navigation"]').getByRole("link", {
      name: "Wireless Charging Coils",
    }),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(consoleErrors).toEqual([]);

  await page.screenshot({
    path: testInfo.outputPath("storefront.png"),
    fullPage: true,
  });
});

test("groups standalone coil drafts by model without publishing blocked models", async ({
  page,
}) => {
  await page.goto("/collections/wireless-charging-coils");

  await expect(
    page.getByRole("heading", { name: "Wireless Charging Coils", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".family-section")).toHaveCount(4);
  await expect(page.locator(".model-product-section")).toHaveCount(15);
  await expect(page.locator(".product-card-draft")).toHaveCount(30);
  await expect(page.getByText("iPhone 17e", { exact: true })).toBeVisible();
  await expect(page.getByText("iPhone 16e", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button")).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("cross-links Back Glass and standalone coils on a model page", async ({
  page,
}) => {
  await page.goto("/models/iphone-16-pro-max");

  await expect(
    page.getByRole("heading", { name: "iPhone 16 Pro Max", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Back Glass", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wireless Charging Coils", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "iPhone 16 Pro Max Wireless Charging Coil - OEM",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      exact: true,
      name: "iPhone 16 Pro Max Wireless Charging Coil - Aftermarket",
    }),
  ).toBeVisible();
});

test("opens a captured product and exposes Shopify checkout handoff", async ({
  page,
}) => {
  await page.goto("/products/iphone-16-pro-max-half-assembly-no-coil-a-grade");

  await expect(
    page.getByRole("heading", {
      name: "iPhone 16 Pro Max Back Glass Half Assembly (No Coil) - A Grade",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Color and variant")).toBeVisible();
  await expect(page.locator(".half-assembly-media")).toBeVisible();
  await expect(page.getByText("No-coil interior")).toBeVisible();
  await expect(
    page.getByText("Half assembly without wireless charging coil"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add on Shopify" })).toBeVisible();
  await expect(page.locator(".purchase-form")).toHaveAttribute(
    "action",
    "https://kfczyu-kc.myshopify.com/cart/add",
  );
});

test("blocks discontinued full assemblies from checkout", async ({ page }) => {
  await page.goto(
    "/products/iphone-15-pro-max-full-assembly-with-coil-a-grade",
  );

  await expect(page.getByRole("heading", { name: "No longer offered" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add on Shopify" })).toHaveCount(0);
  await expect(page.locator(".purchase-form")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(
    page.getByRole("link", { name: "Browse Back Glass" }),
  ).toBeVisible();
});

test("builds a multi-SKU quick order and hands it to Shopify", async ({
  page,
}) => {
  await page.route("https://kfczyu-kc.myshopify.com/cart/**", async (route) => {
    await route.fulfill({
      body: "<title>Shopify cart</title>",
      contentType: "text/html",
      status: 200,
    });
  });
  await page.goto("/quick-order");
  await page.waitForLoadState("networkidle");

  await page.getByRole("textbox", { name: "SKU and quantity list" }).fill(
    [
      "SKU-I16-PRO-MAX-PREMIUM-DESERT-HA, 4",
      "SKU-I14-A-GRADE-BLUE-HA, 2",
    ].join("\n"),
  );
  await page.getByRole("button", { name: "Add list" }).click();

  await expect(page.getByText("6 units")).toBeVisible();
  await expect(page.getByText("Estimated subtotal $138.00")).toBeVisible();

  await page.getByRole("button", { name: "Review on Shopify" }).click();
  await expect(page).toHaveURL(
    /^https:\/\/kfczyu-kc\.myshopify\.com\/cart\/\d+:4,\d+:2$/,
  );
});

test("shows the current backend and payment operating model", async ({ page }) => {
  await page.goto("/migration");

  await expect(page.getByRole("heading", { name: "Back Glass Pros" })).toBeVisible();
  await expect(page.getByText("kfczyu-kc.myshopify.com")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Shopify remains the transaction authority",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "One operating workflow" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current and upgraded" }),
  ).toBeVisible();
  await expect(page.getByText("Payments and refunds")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Shopify Admin" })).toHaveAttribute(
    "href",
    "https://admin.shopify.com/store/kfczyu-kc",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("publishes the iPhone 17 family as review-only drafts", async ({
  page,
}) => {
  await page.goto("/review/iphone-17-series");

  await expect(
    page.getByRole("heading", { name: "iPhone 17 series review" }),
  ).toBeVisible();
  await expect(page.locator(".review-model-section")).toHaveCount(4);
  await expect(page.locator(".review-color-card")).toHaveCount(15);
  await expect(
    page.getByRole("heading", { name: "iPhone 17 Pro Max" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "iPhone 17 Pro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "iPhone 17", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "iPhone 17 Air" }),
  ).toBeVisible();
  await expect(page.getByText("$60.00")).toBeVisible();
  await expect(page.getByText("Pending").first()).toBeVisible();
  await expect(page.locator(".review-color-card img")).toHaveCount(15);
  await expect(page.getByText("No-coil interior").first()).toBeVisible();
  await expect(page.getByText("Exterior color reference").first()).toBeVisible();
  const colorImages = page.locator(".review-color-card img");
  for (const index of [0, 3, 6, 11, 14]) {
    await colorImages.nth(index).scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        colorImages
          .nth(index)
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  await expect(
    page.getByRole("heading", { name: "Black", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sage" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lavender" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mist Blue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Silver" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cosmic Orange" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sky Blue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Light Gold" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Space Black" })).toBeVisible();
  await expect(page.getByRole("button")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("stages the owner-approved catalog transition", async ({ page }) => {
  await page.goto("/review/catalog-transition");

  await expect(
    page.getByRole("heading", { name: "Catalog transition" }),
  ).toBeVisible();
  await expect(page.getByText("20 Draft · 8 still Active")).toBeVisible();
  await expect(page.getByText("54 active snapshot products")).toBeVisible();
  await expect(page.getByText("15 models · 30 grade-specific drafts")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Wireless Charging Coils",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".transition-table-row")).toHaveCount(15);
  await expect(page.getByText("OEM").first()).toBeVisible();
  await expect(page.getByText("iPhone 16e:")).toBeVisible();
  await expect(page.getByText("Move all to Draft. Delete nothing.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("exposes health and protects Shopify status", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({
    service: "backglass-ecommerce",
    status: "ok",
  });

  const shopifyStatus = await request.get("/api/shopify/status");
  const shopifyStatusBody = await shopifyStatus.json();
  expect([401, 503]).toContain(shopifyStatus.status());
  expect(shopifyStatus.headers()["cache-control"]).toBe("no-store");
  expect(shopifyStatus.headers()["x-content-type-options"]).toBe("nosniff");
  expect(shopifyStatus.headers()["x-frame-options"]).toBe("DENY");
  expect(shopifyStatusBody).toEqual({
    error:
      shopifyStatus.status() === 401
        ? "Unauthorized."
        : "Migration admin access is not configured.",
  });
});
