import { describe, expect, it, vi } from "vitest";

import { ShopifyAdminClient, ShopifyAdminError } from "./admin.server";
import { getBulkExportStatus, startBulkExport } from "./bulk.server";

describe("Shopify bulk exports", () => {
  it("returns the created bulk operation", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        bulkOperationRunQuery: {
          bulkOperation: {
            id: "gid://shopify/BulkOperation/1",
            status: "CREATED",
          },
          userErrors: [],
        },
      }),
    } as unknown as ShopifyAdminClient;

    await expect(startBulkExport(client, "{ products { edges { node { id } } } }"))
      .resolves.toEqual({
        id: "gid://shopify/BulkOperation/1",
        status: "CREATED",
      });
  });

  it("surfaces Shopify bulk-operation validation errors", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        bulkOperationRunQuery: {
          bulkOperation: null,
          userErrors: [{ field: ["query"], message: "Access denied" }],
        },
      }),
    } as unknown as ShopifyAdminClient;

    await expect(startBulkExport(client, "{ orders { edges { node { id } } } }"))
      .rejects.toEqual(expect.any(ShopifyAdminError));
  });

  it("reads operation status by ID", async () => {
    const operation = {
      completedAt: "2026-07-26T07:00:00Z",
      createdAt: "2026-07-26T06:59:00Z",
      errorCode: null,
      fileSize: "120",
      id: "gid://shopify/BulkOperation/1",
      objectCount: "66",
      partialDataUrl: null,
      rootObjectCount: "66",
      status: "COMPLETED",
      url: "https://example.com/export.jsonl",
    };
    const client = {
      query: vi.fn().mockResolvedValue({ bulkOperation: operation }),
    } as unknown as ShopifyAdminClient;

    await expect(
      getBulkExportStatus(client, "gid://shopify/BulkOperation/1"),
    ).resolves.toEqual(operation);
  });
});
