import { ShopifyAdminClient, ShopifyAdminError } from "./admin.server";

interface BulkOperation {
  completedAt: string | null;
  createdAt: string;
  errorCode: string | null;
  fileSize: string | null;
  id: string;
  objectCount: string;
  partialDataUrl: string | null;
  rootObjectCount: string;
  status: string;
  url: string | null;
}

interface BulkOperationUserError {
  field: string[] | null;
  message: string;
}

interface StartBulkOperationData {
  bulkOperationRunQuery: {
    bulkOperation: Pick<BulkOperation, "id" | "status"> | null;
    userErrors: BulkOperationUserError[];
  };
}

interface BulkOperationStatusData {
  bulkOperation: BulkOperation | null;
}

const START_BULK_OPERATION = `#graphql
  mutation StartMigrationBulkExport($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const BULK_OPERATION_STATUS = `#graphql
  query MigrationBulkExportStatus($id: ID!) {
    bulkOperation(id: $id) {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      rootObjectCount
      fileSize
      url
      partialDataUrl
    }
  }
`;

export const SHOPIFY_BULK_EXPORTS = {
  products: `{
    products {
      edges {
        node {
          id
          legacyResourceId
          handle
          title
          descriptionHtml
          status
          vendor
          productType
          tags
          createdAt
          updatedAt
          publishedAt
          totalInventory
          variants {
            edges {
              node {
                id
                legacyResourceId
                title
                displayName
                sku
                barcode
                price
                compareAtPrice
                inventoryQuantity
                availableForSale
                createdAt
                updatedAt
                selectedOptions {
                  name
                  value
                }
                image {
                  id
                  url
                  altText
                  width
                  height
                }
                inventoryItem {
                  id
                  sku
                  tracked
                  requiresShipping
                }
              }
            }
          }
          media {
            edges {
              node {
                id
                alt
                mediaContentType
                status
                preview {
                  image {
                    url
                    altText
                    width
                    height
                  }
                }
              }
            }
          }
        }
      }
    }
  }`,
  inventory: `{
    inventoryItems {
      edges {
        node {
          id
          legacyResourceId
          sku
          tracked
          requiresShipping
          updatedAt
          countryCodeOfOrigin
          provinceCodeOfOrigin
          harmonizedSystemCode
          unitCost {
            amount
            currencyCode
          }
          inventoryLevels {
            edges {
              node {
                id
                updatedAt
                location {
                  id
                  name
                }
                quantities(
                  names: ["available", "on_hand", "committed", "incoming", "reserved"]
                ) {
                  name
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }`,
  orders: `{
    orders(query: "status:any") {
      edges {
        node {
          id
          legacyResourceId
          name
          createdAt
          updatedAt
          processedAt
          cancelledAt
          cancelReason
          closedAt
          currencyCode
          displayFinancialStatus
          displayFulfillmentStatus
          test
          tags
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          lineItems {
            edges {
              node {
                id
                name
                sku
                quantity
                currentQuantity
                variant {
                  id
                  sku
                }
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }`,
} as const;

export async function startBulkExport(
  client: ShopifyAdminClient,
  query: string,
) {
  const data = await client.query<StartBulkOperationData>(
    START_BULK_OPERATION,
    { query },
  );
  const result = data.bulkOperationRunQuery;
  if (result.userErrors.length > 0) {
    throw new ShopifyAdminError(
      result.userErrors.map((error) => error.message).join("; "),
      422,
    );
  }
  if (!result.bulkOperation) {
    throw new ShopifyAdminError(
      "Shopify did not create the bulk operation.",
      502,
    );
  }
  return result.bulkOperation;
}

export async function getBulkExportStatus(
  client: ShopifyAdminClient,
  operationId: string,
) {
  const data = await client.query<BulkOperationStatusData>(
    BULK_OPERATION_STATUS,
    { id: operationId },
  );
  if (!data.bulkOperation) {
    throw new ShopifyAdminError(
      `Shopify bulk operation was not found: ${operationId}`,
      404,
    );
  }
  return data.bulkOperation;
}
