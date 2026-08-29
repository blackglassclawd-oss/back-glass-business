import { env } from "cloudflare:workers";

import type { ShopifyEnvironment } from "./shopify/config";

export interface RuntimeEnvironment extends ShopifyEnvironment {
  MIGRATION_ADMIN_TOKEN?: string;
  MIGRATION_MODE?: string;
  SHOPIFY_OPERATION_TOKEN?: string;
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  return env;
}
