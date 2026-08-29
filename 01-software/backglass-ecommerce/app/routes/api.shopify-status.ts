import type { Route } from "./+types/api.shopify-status";
import { isAdminRequestAuthorized } from "../services/admin-auth.server";
import { getRuntimeEnvironment } from "../services/runtime-env.server";
import {
  ShopifyAdminClient,
  ShopifyAdminError,
} from "../services/shopify/admin.server";
import { captureShopifyStoreAudit } from "../services/shopify/audit.server";
import {
  loadShopifyConfig,
  ShopifyConfigError,
} from "../services/shopify/config";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function loader({ request }: Route.LoaderArgs) {
  const runtimeEnv = getRuntimeEnvironment();

  if (!runtimeEnv.MIGRATION_ADMIN_TOKEN) {
    return Response.json(
      { error: "Migration admin access is not configured." },
      { headers: NO_STORE_HEADERS, status: 503 },
    );
  }

  if (!isAdminRequestAuthorized(request, runtimeEnv.MIGRATION_ADMIN_TOKEN)) {
    return Response.json(
      { error: "Unauthorized." },
      { headers: NO_STORE_HEADERS, status: 401 },
    );
  }

  try {
    const config = loadShopifyConfig(runtimeEnv);
    const audit = await captureShopifyStoreAudit(
      new ShopifyAdminClient(config),
    );
    return Response.json(audit, {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    if (error instanceof ShopifyConfigError) {
      return Response.json(
        { error: error.message, missing: error.missing },
        { headers: NO_STORE_HEADERS, status: 503 },
      );
    }

    if (error instanceof ShopifyAdminError) {
      return Response.json(
        { error: error.message },
        { headers: NO_STORE_HEADERS, status: error.status },
      );
    }

    throw error;
  }
}
