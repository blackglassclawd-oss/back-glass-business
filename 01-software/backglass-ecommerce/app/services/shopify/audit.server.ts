import { ShopifyAdminClient } from "./admin.server";

export interface ShopifyStoreAudit {
  capturedAt: string;
  app: {
    accessMode: "read-only" | "write-enabled";
    accessScopes: string[];
    installedApps: string[];
  };
  catalog: {
    products: number;
    variants: number;
  };
  commerce: {
    orders: number;
    sampledOrders: number;
    sampleHasMore: boolean;
    financialStatuses: Record<string, number>;
    fulfillmentStatuses: Record<string, number>;
  };
  customers: {
    companies: number;
    customers: number;
  };
  inventory: {
    activeLocations: number;
    locations: string[];
  };
  merchandising: {
    activeMarkets: number;
    catalogs: string[];
    markets: string[];
  };
  shop: {
    currencyCode: string;
    ianaTimezone: string;
    id: string;
    myshopifyDomain: string;
    name: string;
    plan: {
      displayName: string;
      partnerDevelopment: boolean;
      shopifyPlus: boolean;
    };
    primaryDomain: {
      host: string;
      url: string;
    };
    setupRequired: boolean;
  };
}

interface ShopAuditQuery {
  appInstallations: {
    nodes: Array<{
      app: {
        title: string;
      };
    }>;
  };
  catalogs: {
    nodes: Array<{
      status: string;
      title: string;
    }>;
  };
  companiesCount: {
    count: number;
  };
  currentAppInstallation: {
    accessScopes: Array<{
      handle: string;
    }>;
  } | null;
  customersCount: {
    count: number;
  };
  locations: {
    nodes: Array<{
      isActive: boolean;
      name: string;
    }>;
  };
  markets: {
    nodes: Array<{
      name: string;
      status: string;
    }>;
  };
  orders: {
    nodes: Array<{
      displayFinancialStatus: string;
      displayFulfillmentStatus: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
  ordersCount: {
    count: number;
  };
  productsCount: {
    count: number;
  };
  productVariantsCount: {
    count: number;
  };
  shop: ShopifyStoreAudit["shop"];
}

const SHOP_AUDIT_QUERY = `#graphql
  query MigrationShopAudit {
    appInstallations(first: 100) {
      nodes {
        app {
          title
        }
      }
    }
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
    productsCount {
      count
    }
    productVariantsCount {
      count
    }
    ordersCount {
      count
    }
    customersCount {
      count
    }
    companiesCount {
      count
    }
    locations(first: 100) {
      nodes {
        name
        isActive
      }
    }
    markets(first: 100) {
      nodes {
        name
        status
      }
    }
    catalogs(first: 100) {
      nodes {
        title
        status
      }
    }
    orders(first: 250, query: "status:any") {
      nodes {
        displayFinancialStatus
        displayFulfillmentStatus
      }
      pageInfo {
        hasNextPage
      }
    }
    shop {
      id
      name
      myshopifyDomain
      primaryDomain {
        host
        url
      }
      currencyCode
      ianaTimezone
      setupRequired
      plan {
        displayName
        partnerDevelopment
        shopifyPlus
      }
    }
  }
`;

export async function captureShopifyStoreAudit(
  client: ShopifyAdminClient,
): Promise<ShopifyStoreAudit> {
  const data = await client.query<ShopAuditQuery>(SHOP_AUDIT_QUERY);
  const accessScopes =
    data.currentAppInstallation?.accessScopes
      .map(({ handle }) => handle)
      .sort() ?? [];

  return {
    capturedAt: new Date().toISOString(),
    app: {
      accessMode: accessScopes.some((scope) => scope.startsWith("write_"))
        ? "write-enabled"
        : "read-only",
      accessScopes,
      installedApps: data.appInstallations.nodes
        .map(({ app }) => app.title)
        .sort(),
    },
    catalog: {
      products: data.productsCount.count,
      variants: data.productVariantsCount.count,
    },
    commerce: {
      orders: data.ordersCount.count,
      sampledOrders: data.orders.nodes.length,
      sampleHasMore: data.orders.pageInfo.hasNextPage,
      financialStatuses: countStatuses(
        data.orders.nodes.map(({ displayFinancialStatus }) => displayFinancialStatus),
      ),
      fulfillmentStatuses: countStatuses(
        data.orders.nodes.map(
          ({ displayFulfillmentStatus }) => displayFulfillmentStatus,
        ),
      ),
    },
    customers: {
      companies: data.companiesCount.count,
      customers: data.customersCount.count,
    },
    inventory: {
      activeLocations: data.locations.nodes.filter(({ isActive }) => isActive)
        .length,
      locations: data.locations.nodes.map(({ name }) => name).sort(),
    },
    merchandising: {
      activeMarkets: data.markets.nodes.filter(
        ({ status }) => status === "ACTIVE",
      ).length,
      catalogs: data.catalogs.nodes.map(({ title }) => title).sort(),
      markets: data.markets.nodes.map(({ name }) => name).sort(),
    },
    shop: data.shop,
  };
}

function countStatuses(statuses: string[]): Record<string, number> {
  return statuses.reduce<Record<string, number>>((counts, status) => {
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}
