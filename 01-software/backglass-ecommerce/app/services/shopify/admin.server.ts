import type { ShopifyConfig } from "./config";

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
}

interface GraphqlError {
  message: string;
  path?: Array<number | string>;
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: GraphqlError[];
}

interface CachedToken {
  expiresAt: number;
  value: string;
}

const defaultFetcher: typeof fetch = (...arguments_) =>
  globalThis.fetch(...arguments_);

export class ShopifyAdminError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ShopifyAdminError";
    this.status = status;
  }
}

export class ShopifyAdminClient {
  private cachedToken?: CachedToken;

  constructor(
    private readonly config: ShopifyConfig,
    private readonly fetcher: typeof fetch = defaultFetcher,
  ) {}

  async query<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const endpoint = `https://${this.config.storeDomain}/admin/api/${this.config.apiVersion}/graphql.json`;
    const response = await this.fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    });

    const payload = await parseJson<GraphqlResponse<T>>(response);

    if (!response.ok) {
      throw new ShopifyAdminError(
        `Shopify Admin API returned HTTP ${response.status}.`,
        response.status,
      );
    }

    if (payload.errors?.length) {
      throw new ShopifyAdminError(
        payload.errors.map((error) => error.message).join("; "),
        502,
      );
    }

    if (!payload.data) {
      throw new ShopifyAdminError("Shopify Admin API returned no data.", 502);
    }

    return payload.data;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.value;
    }

    const endpoint = `https://${this.config.storeDomain}/admin/oauth/access_token`;
    const response = await this.fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "client_credentials",
      }),
    });
    const payload = await parseJson<AccessTokenResponse>(response);

    if (!response.ok || !payload.access_token) {
      throw new ShopifyAdminError(
        `Shopify token request returned HTTP ${response.status}.`,
        response.status,
      );
    }

    this.cachedToken = {
      expiresAt: now + payload.expires_in * 1000,
      value: payload.access_token,
    };

    return payload.access_token;
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ShopifyAdminError(
      `Shopify returned an invalid JSON response (HTTP ${response.status}).`,
      response.status,
    );
  }
}
