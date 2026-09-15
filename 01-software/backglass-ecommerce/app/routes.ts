import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/store.tsx"),
  route("migration", "routes/home.tsx"),
  route("review/catalog-transition", "routes/catalog-transition.tsx"),
  route("review/iphone-17-series", "routes/iphone17-review.tsx"),
  route("collections/:partType", "routes/collection.tsx"),
  route("models", "routes/models.tsx"),
  route("models/:modelSlug", "routes/model.tsx"),
  route("pages/:slug", "routes/guidance.tsx"),
  route(
    "products/wireless-charging-coils/:modelSlug/:grade",
    "routes/coil-product.tsx",
  ),
  route("products/:handle", "routes/product.tsx"),
  route("quick-order", "routes/quick-order.tsx"),
  route("api/health", "routes/api.health.ts"),
  route("api/shopify/status", "routes/api.shopify-status.ts"),
] satisfies RouteConfig;
