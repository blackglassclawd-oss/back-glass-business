import { describe, expect, it } from "vitest";

import { isAdminRequestAuthorized } from "./admin-auth.server";

describe("isAdminRequestAuthorized", () => {
  it("accepts the configured bearer token", () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer migration-secret" },
    });
    expect(isAdminRequestAuthorized(request, "migration-secret")).toBe(true);
  });

  it("rejects missing, malformed, and incorrect tokens", () => {
    expect(
      isAdminRequestAuthorized(new Request("https://example.com"), "secret"),
    ).toBe(false);
    expect(
      isAdminRequestAuthorized(
        new Request("https://example.com", {
          headers: { Authorization: "Basic secret" },
        }),
        "secret",
      ),
    ).toBe(false);
    expect(
      isAdminRequestAuthorized(
        new Request("https://example.com", {
          headers: { Authorization: "Bearer wrong" },
        }),
        "secret",
      ),
    ).toBe(false);
  });
});
